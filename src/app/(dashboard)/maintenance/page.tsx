'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function MaintenancePage() {
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // Technician Assignment state
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [selectedTechId, setSelectedTechId] = useState('');

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // Current User
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
      setCurrentUser(profile);
    }

    // Tickets
    const { data: ticketsData } = await supabase.from('maintenance_requests').select('*');
    if (ticketsData) setTickets(ticketsData);

    // Users (to assign technicians)
    const { data: usersData } = await supabase.from('users').select('*').eq('status', 'active');
    if (usersData) setUsers(usersData);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Workflow transitions
  const handleTransition = async (ticketId: string, action: string, newStatus: string) => {
    setLoading(true);
    setSuccessMsg(null);

    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const updates: any = { status: newStatus };

    // If status is 'resolved', record completion timestamp
    if (newStatus === 'resolved') {
      updates.resolved_at = new Date().toISOString();
    }

    // Update ticket
    await supabase.from('maintenance_requests').update(updates).eq('id', ticketId);

    // Dynamic Asset Status Auto-Updates
    if (newStatus === 'approved') {
      // 1. Flip asset to Under Maintenance
      await supabase.from('assets').update({ status: 'under_maintenance' }).eq('id', ticket.asset_id);
    } else if (newStatus === 'resolved') {
      // 2. Flip asset back to Available on resolution
      await supabase.from('assets').update({ status: 'available' }).eq('id', ticket.asset_id);
    }

    // Log Activity
    await supabase.from('activity_logs').insert([
      {
        user_id: currentUser?.id,
        action: 'Maintenance Update',
        details: `Updated ticket ${ticketId} status to ${newStatus}. Transition trigger: ${action}`,
      }
    ]);

    setSuccessMsg(`Ticket status updated to "${newStatus}"!`);
    setLoading(false);
    fetchData();
  };

  // Assign Technician
  const handleAssignTechnician = async (ticketId: string) => {
    if (!selectedTechId) return;

    setLoading(true);
    await supabase
      .from('maintenance_requests')
      .update({
        technician_id: selectedTechId,
        status: 'technician_assigned'
      })
      .eq('id', ticketId);

    // Log Activity
    const tech = users.find(u => u.id === selectedTechId);
    await supabase.from('activity_logs').insert([
      {
        user_id: currentUser?.id,
        action: 'Assign Technician',
        details: `Assigned technician ${tech?.name} to ticket ID: ${ticketId}`,
      }
    ]);

    setEditingTicketId(null);
    setSelectedTechId('');
    setSuccessMsg('Technician assigned successfully!');
    setLoading(false);
    fetchData();
  };

  const isManagerOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'asset_manager';

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-800 border-gray-200',
    medium: 'bg-blue-100 text-blue-800 border-blue-200',
    high: 'bg-red-100 text-red-800 border-red-200',
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-blue-100 text-blue-800 border-blue-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    technician_assigned: 'bg-purple-100 text-purple-800 border-purple-200',
    in_progress: 'bg-orange-100 text-orange-800 border-orange-200',
    resolved: 'bg-green-100 text-green-800 border-green-200',
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Maintenance & Repair Workflows</h1>
          <p className="text-gray-500">Route, approve, and resolve technical repairs for physical assets.</p>
        </div>
        <Link href="/maintenance/new" className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700">
          File Repair Request
        </Link>
      </div>

      {successMsg && (
        <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
          {successMsg}
        </div>
      )}

      {/* Tickets List */}
      <Card className="border border-gray-200 shadow-xs bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset Tag</TableHead>
              <TableHead>Asset Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Reporter</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Technician</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-24 text-gray-500 italic">No maintenance tickets recorded.</TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-semibold text-blue-600">{ticket.asset?.tag}</TableCell>
                  <TableCell className="font-medium text-gray-900">{ticket.asset?.name}</TableCell>
                  <TableCell className="max-w-xs truncate" title={ticket.description}>{ticket.description}</TableCell>
                  <TableCell>{ticket.reporter?.name || 'System'}</TableCell>
                  <TableCell>
                    <Badge className={priorityColors[ticket.priority] || ''} variant="outline">
                      {ticket.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {editingTicketId === ticket.id ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Select onValueChange={(val) => { if (typeof val === 'string') setSelectedTechId(val); }}>
                          <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue placeholder="Select tech" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="xs" className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs px-2" onClick={() => handleAssignTechnician(ticket.id)} disabled={loading}>
                          OK
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{ticket.technician?.name || '-'}</span>
                        {isManagerOrAdmin && ticket.status === 'approved' && (
                          <Button size="xs" variant="ghost" className="text-blue-600 text-xs px-1.5 h-6" onClick={() => setEditingTicketId(ticket.id)}>
                            Assign
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[ticket.status] || ''} variant="outline">
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {/* Pending state actions for Manager */}
                    {isManagerOrAdmin && ticket.status === 'pending' && (
                      <>
                        <Button size="xs" className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 h-7" onClick={() => handleTransition(ticket.id, 'Approve Ticket', 'approved')} disabled={loading}>
                          Approve
                        </Button>
                        <Button size="xs" variant="destructive" className="text-xs px-2 h-7" onClick={() => handleTransition(ticket.id, 'Reject Ticket', 'rejected')} disabled={loading}>
                          Reject
                        </Button>
                      </>
                    )}

                    {/* Assigned state actions for Tech / Manager */}
                    {isManagerOrAdmin && ticket.status === 'technician_assigned' && (
                      <Button size="xs" className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-2 h-7" onClick={() => handleTransition(ticket.id, 'Start Repair Work', 'in_progress')} disabled={loading}>
                        Start Work
                      </Button>
                    )}

                    {/* In Progress state actions for Tech / Manager */}
                    {isManagerOrAdmin && ticket.status === 'in_progress' && (
                      <Button size="xs" className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 h-7" onClick={() => handleTransition(ticket.id, 'Mark Resolved', 'resolved')} disabled={loading}>
                        Resolve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
