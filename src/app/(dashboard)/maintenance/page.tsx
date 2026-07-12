'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { 
  Wrench, 
  User, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
      await supabase.from('assets').update({ status: 'under_maintenance' }).eq('id', ticket.asset_id);
    } else if (newStatus === 'resolved') {
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

  const priorityStyles: Record<string, { badge: string; border: string }> = {
    low: {
      badge: 'bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300',
      border: 'border-l-4 border-l-gray-400'
    },
    medium: {
      badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400',
      border: 'border-l-4 border-l-blue-500'
    },
    high: {
      badge: 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400',
      border: 'border-l-4 border-l-red-500'
    },
  };

  const columns = [
    { id: 'pending', title: 'Pending Approval', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20' },
    { id: 'approved', title: 'Approved', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20' },
    { id: 'technician_assigned', title: 'Technician Assigned', color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20' },
    { id: 'in_progress', title: 'In Progress', color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20' },
    { id: 'resolved', title: 'Resolved', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' },
  ];

  return (
    <div className="container mx-auto space-y-8 max-w-7xl animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-zinc-50">Maintenance Workflows</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Route, approve, and resolve technical repairs for physical assets.</p>
        </div>
        <Link 
          href="/maintenance/new" 
          className={cn(
            buttonVariants({ variant: 'default' }),
            "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-sm font-semibold"
          )}
        >
          File Repair Request
        </Link>
      </div>

      {successMsg && (
        <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30 rounded-xl font-medium">
          {successMsg}
        </div>
      )}

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colTickets = tickets.filter(t => t.status === col.id);
          
          return (
            <div key={col.id} className="flex flex-col min-w-[240px] space-y-4">
              {/* Column Header */}
              <div className="flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/80 rounded-xl shadow-xs">
                <span className="text-sm font-bold text-gray-800 dark:text-zinc-200 truncate">{col.title}</span>
                <Badge className={cn("rounded-full px-2 py-0.5 border-none font-bold text-xs shrink-0", col.color)}>
                  {colTickets.length}
                </Badge>
              </div>

              {/* Column Body */}
              <div className="flex-1 min-h-[450px] p-3.5 bg-gray-50/50 dark:bg-zinc-900/10 border border-dashed border-gray-200 dark:border-zinc-800/80 rounded-2xl space-y-4">
                {colTickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center text-xs text-gray-400 dark:text-zinc-600 gap-1.5">
                    <ClipboardList className="h-6 w-6 stroke-1" />
                    <span>No requests in this stage</span>
                  </div>
                ) : (
                  colTickets.map((ticket) => {
                    const styles = priorityStyles[ticket.priority] || priorityStyles.low;
                    
                    return (
                      <Card 
                        key={ticket.id} 
                        className={cn(
                          "bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 hover:shadow-md transition-all duration-300 rounded-xl shadow-xs relative",
                          styles.border
                        )}
                      >
                        <CardHeader className="p-3.5 pb-2">
                          <div className="flex items-start justify-between gap-2.5">
                            <span className="text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md truncate max-w-[90px]">
                              {ticket.asset?.tag}
                            </span>
                            <Badge className={cn("text-[9px] font-bold border-none uppercase py-0 px-1.5", styles.badge)}>
                              {ticket.priority}
                            </Badge>
                          </div>
                          <CardTitle className="text-sm font-bold text-gray-900 dark:text-zinc-100 mt-2 truncate">
                            {ticket.asset?.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-0 space-y-3">
                          <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-3 leading-relaxed" title={ticket.description}>
                            {ticket.description}
                          </p>

                          {/* Reporter Details */}
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-zinc-500 font-medium">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="truncate">By: {ticket.reporter?.name || 'System'}</span>
                          </div>

                          {/* Technician Assignment */}
                          <div className="pt-2 border-t dark:border-zinc-800/80">
                            {editingTicketId === ticket.id ? (
                              <div className="space-y-2">
                                <Select onValueChange={(val) => { if (typeof val === 'string') setSelectedTechId(val); }}>
                                  <SelectTrigger className="w-full h-8 text-[11px] dark:bg-zinc-950 dark:border-zinc-800">
                                    <SelectValue placeholder="Assign technician..." />
                                  </SelectTrigger>
                                  <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                                    {users.map((u) => (
                                      <SelectItem key={u.id} value={u.id} className="text-xs">{u.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <div className="flex gap-1.5 justify-end">
                                  <Button size="xs" variant="outline" className="h-7 text-[10px] px-2" onClick={() => setEditingTicketId(null)}>
                                    Cancel
                                  </Button>
                                  <Button size="xs" className="h-7 text-[10px] px-2 text-white bg-blue-600 hover:bg-blue-700" onClick={() => handleAssignTechnician(ticket.id)} disabled={loading}>
                                    Assign
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-[11px] text-gray-500 dark:text-zinc-400 font-semibold truncate">
                                  Tech: {ticket.technician?.name || <span className="text-gray-400 dark:text-zinc-600 font-normal">Unassigned</span>}
                                </span>
                                {isManagerOrAdmin && ticket.status === 'approved' && (
                                  <Button size="xs" variant="ghost" className="text-blue-600 dark:text-blue-400 text-[10px] px-1.5 h-6 hover:bg-blue-50 dark:hover:bg-blue-950/20 font-bold" onClick={() => setEditingTicketId(ticket.id)}>
                                    Assign
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Footer Actions */}
                          {isManagerOrAdmin && (
                            <div className="pt-2 flex gap-1.5 justify-end">
                              {ticket.status === 'pending' && (
                                <>
                                  <Button 
                                    size="xs" 
                                    variant="outline"
                                    className="h-7 text-[10px] px-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/30" 
                                    onClick={() => handleTransition(ticket.id, 'Reject Ticket', 'rejected')} 
                                    disabled={loading}
                                  >
                                    Reject
                                  </Button>
                                  <Button 
                                    size="xs" 
                                    className="h-7 text-[10px] px-2 text-white bg-emerald-600 hover:bg-emerald-700" 
                                    onClick={() => handleTransition(ticket.id, 'Approve Ticket', 'approved')} 
                                    disabled={loading}
                                  >
                                    Approve
                                  </Button>
                                </>
                              )}

                              {ticket.status === 'technician_assigned' && (
                                <Button 
                                  size="xs" 
                                  className="h-7 text-[10px] px-2 text-white bg-orange-500 hover:bg-orange-600 w-full font-bold" 
                                  onClick={() => handleTransition(ticket.id, 'Start Repair Work', 'in_progress')} 
                                  disabled={loading}
                                >
                                  Start Work
                                </Button>
                              )}

                              {ticket.status === 'in_progress' && (
                                <Button 
                                  size="xs" 
                                  className="h-7 text-[10px] px-2 text-white bg-green-600 hover:bg-green-700 w-full font-bold" 
                                  onClick={() => handleTransition(ticket.id, 'Mark Resolved', 'resolved')} 
                                  disabled={loading}
                                >
                                  Resolve
                                </Button>
                              )}
                            </div>
                          )}

                          {ticket.status === 'resolved' && ticket.resolved_at && (
                            <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 justify-end pt-1">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Resolved: {new Date(ticket.resolved_at).toLocaleDateString()}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
