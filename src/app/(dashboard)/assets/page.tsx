'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AssetDirectoryPage() {
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  // Search/Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  // Detail Modal
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [assetHistory, setAssetHistory] = useState<any[]>([]);
  const [assetMaintenance, setAssetMaintenance] = useState<any[]>([]);

  // Action Dialogs
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');
  const [returnCondition, setReturnCondition] = useState('Good');
  const [assetToReturn, setAssetToReturn] = useState<any>(null);

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [assetToChangeStatus, setAssetToChangeStatus] = useState<any>(null);

  const fetchData = useCallback(async () => {
    // Current User
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
      setCurrentUser(profile);
    }

    // Assets
    const { data: assetsData } = await supabase.from('assets').select('*');
    if (assetsData) setAssets(assetsData);

    // Categories
    const { data: cats } = await supabase.from('asset_categories').select('*').eq('status', 'active');
    if (cats) setCategories(cats);

    // Departments
    const { data: depts } = await supabase.from('departments').select('*').eq('status', 'active');
    if (depts) setDepartments(depts);

    // Employees
    const { data: emps } = await supabase.from('users').select('*').eq('status', 'active');
    if (emps) setEmployees(emps);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load History for Selected Asset
  const loadAssetDetails = async (asset: any) => {
    setSelectedAsset(asset);
    
    // Fetch allocations history for this asset
    const { data: allocs } = await supabase
      .from('allocations')
      .select('*')
      .eq('asset_id', asset.id)
      .order('allocated_at', { ascending: false });

    // Fetch maintenance history for this asset
    const { data: maintenance } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('asset_id', asset.id)
      .order('created_at', { ascending: false });

    setAssetHistory(allocs || []);
    setAssetMaintenance(maintenance || []);
  };

  // Perform Check-in (Return Asset)
  const handleReturnAsset = async () => {
    if (!assetToReturn) return;

    // 1. Update allocation record (mark as returned)
    const { data: activeAlloc } = await supabase
      .from('allocations')
      .select('id')
      .eq('asset_id', assetToReturn.id)
      .eq('status', 'active')
      .is('returned_at', null)
      .single();

    if (activeAlloc) {
      await supabase
        .from('allocations')
        .update({
          returned_at: new Date().toISOString(),
          status: 'returned',
          notes: `Returned in ${returnCondition} condition. Notes: ${returnNotes}`
        })
        .eq('id', activeAlloc.id);
    }

    // 2. Update asset status to available
    await supabase
      .from('assets')
      .update({
        status: 'available',
        condition: returnCondition
      })
      .eq('id', assetToReturn.id);

    // 3. Log event
    await supabase.from('activity_logs').insert([
      {
        user_id: currentUser?.id,
        action: 'Return Asset',
        details: `Returned asset ${assetToReturn.tag}. Condition: ${returnCondition}. Notes: ${returnNotes}`,
      }
    ]);

    setIsReturnOpen(false);
    setReturnNotes('');
    setAssetToReturn(null);
    fetchData();
  };

  // Perform Asset Status Transition
  const handleStatusChange = async () => {
    if (!assetToChangeStatus || !newStatus) return;

    await supabase
      .from('assets')
      .update({ status: newStatus })
      .eq('id', assetToChangeStatus.id);

    // Log event
    await supabase.from('activity_logs').insert([
      {
        user_id: currentUser?.id,
        action: 'Update Status',
        details: `Updated asset ${assetToChangeStatus.tag} status to ${newStatus}`,
      }
    ]);

    setIsStatusOpen(false);
    setNewStatus('');
    setAssetToChangeStatus(null);
    fetchData();
  };

  // Filter Assets
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = 
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      asset.tag.toLowerCase().includes(search.toLowerCase()) ||
      (asset.serial && asset.serial.toLowerCase().includes(search.toLowerCase())) ||
      (asset.location && asset.location.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || asset.category_id === categoryFilter;
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    const matchesLocation = locationFilter === 'all' || asset.location === locationFilter;

    return matchesSearch && matchesCategory && matchesStatus && matchesLocation;
  });

  // Extract unique locations for filtering
  const locations = Array.from(new Set(assets.map(a => a.location).filter(Boolean)));

  const statusColors: Record<string, string> = {
    available: 'bg-green-100 text-green-800 border-green-200',
    allocated: 'bg-blue-100 text-blue-800 border-blue-200',
    reserved: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    under_maintenance: 'bg-orange-100 text-orange-800 border-orange-200',
    lost: 'bg-red-100 text-red-800 border-red-200',
    retired: 'bg-gray-100 text-gray-800 border-gray-200',
    disposed: 'bg-gray-300 text-gray-700 border-gray-400',
  };

  const isManagerOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'asset_manager';

  return (
    <div className="container mx-auto py-6 px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Asset Directory</h1>
          <p className="text-gray-500">Track and manage inventory lifecycle and history logs.</p>
        </div>
        {isManagerOrAdmin && (
          <div className="flex gap-3">
            <Link href="/assets/allocate" className="inline-flex h-10 items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50">
              Manage Allocations
            </Link>
            <Link href="/assets/register" className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700">
              Register New Asset
            </Link>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="grid gap-4 md:grid-cols-4 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="space-y-1.5">
          <Label htmlFor="search">Search</Label>
          <Input id="search" placeholder="Search by name, tag, serial..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Select onValueChange={(val) => setCategoryFilter(val || 'all')} defaultValue="all">
            <SelectTrigger id="category">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select onValueChange={(val) => setStatusFilter(val || 'all')} defaultValue="all">
            <SelectTrigger id="status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="allocated">Allocated</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
              <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
              <SelectItem value="disposed">Disposed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Select onValueChange={(val) => setLocationFilter(val || 'all')} defaultValue="all">
            <SelectTrigger id="location">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((loc, idx) => (
                <SelectItem key={idx} value={loc}>{loc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset Tag</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-gray-500 italic">No assets match your search query.</TableCell>
              </TableRow>
            ) : (
              filteredAssets.map((asset) => (
                <TableRow key={asset.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => loadAssetDetails(asset)}>
                  <TableCell className="font-semibold text-blue-600">{asset.tag}</TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900">{asset.name}</div>
                    <div className="text-xs text-gray-500">S/N: {asset.serial || 'N/A'}</div>
                  </TableCell>
                  <TableCell>{asset.category?.name || 'Unassigned'}</TableCell>
                  <TableCell>{asset.department?.name || '-'}</TableCell>
                  <TableCell>{asset.location || '-'}</TableCell>
                  <TableCell>
                    <Badge className={cn("capitalize border font-semibold", statusColors[asset.status])}>
                      {asset.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" onClick={() => loadAssetDetails(asset)}>Details</Button>
                    
                    {isManagerOrAdmin && asset.status === 'allocated' && (
                      <Button variant="outline" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50/50" onClick={() => { setAssetToReturn(asset); setIsReturnOpen(true); }}>
                        Return
                      </Button>
                    )}

                    {isManagerOrAdmin && (
                      <Button variant="outline" size="sm" onClick={() => { setAssetToChangeStatus(asset); setNewStatus(asset.status); setIsStatusOpen(true); }}>
                        Status
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Asset Detail & History Modal */}
      {selectedAsset && (
        <Dialog open={selectedAsset !== null} onOpenChange={(open) => { if (!open) setSelectedAsset(null); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <span className="text-blue-600">{selectedAsset.tag}</span> - {selectedAsset.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Info Matrix */}
              <div className="grid grid-cols-2 gap-4 border bg-gray-50/50 p-4 rounded-lg text-sm">
                <div>
                  <span className="text-gray-500 block">Category:</span>
                  <span className="font-semibold text-gray-900">{selectedAsset.category?.name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Condition:</span>
                  <span className="font-semibold text-gray-900">{selectedAsset.condition || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Location:</span>
                  <span className="font-semibold text-gray-900">{selectedAsset.location || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Acquisition Cost:</span>
                  <span className="font-semibold text-gray-900">${selectedAsset.cost || 'N/A'}</span>
                </div>
                {selectedAsset.category?.custom_fields && Object.entries(selectedAsset.category.custom_fields).map(([key, val]: any) => (
                  <div key={key}>
                    <span className="text-gray-500 block capitalize">{key.replace('_', ' ')}:</span>
                    <span className="font-semibold text-gray-900">{val}</span>
                  </div>
                ))}
              </div>

              {/* Allocations history */}
              <div className="space-y-2">
                <h3 className="font-bold text-gray-900 border-b pb-1">Allocation / Transfer Log</h3>
                {assetHistory.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No allocation history recorded for this asset.</p>
                ) : (
                  <div className="space-y-2">
                    {assetHistory.map((alloc) => {
                      const user = employees.find(e => e.id === alloc.user_id);
                      const dept = departments.find(d => d.id === alloc.department_id);
                      return (
                        <div key={alloc.id} className="text-sm border-l-2 border-blue-500 pl-3 py-1 flex justify-between items-start bg-gray-50/30">
                          <div>
                            <span className="font-medium text-gray-900">
                              Allocated to {user?.name || 'Unknown User'} ({dept?.name || 'Unassigned Dept'})
                            </span>
                            <span className="text-xs text-gray-500 block">
                              Assigned: {new Date(alloc.allocated_at).toLocaleDateString()} 
                              {alloc.returned_at && ` - Returned: ${new Date(alloc.returned_at).toLocaleDateString()}`}
                            </span>
                            {alloc.notes && <span className="text-xs text-gray-600 italic block mt-1">Notes: {alloc.notes}</span>}
                          </div>
                          <Badge className="capitalize text-xs" variant={alloc.status === 'active' ? 'default' : 'secondary'}>
                            {alloc.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Maintenance history */}
              <div className="space-y-2">
                <h3 className="font-bold text-gray-900 border-b pb-1">Maintenance & Repair Log</h3>
                {assetMaintenance.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No maintenance tickets filed for this asset.</p>
                ) : (
                  <div className="space-y-2">
                    {assetMaintenance.map((ticket) => {
                      const reporter = employees.find(e => e.id === ticket.reporter_id);
                      return (
                        <div key={ticket.id} className="text-sm border-l-2 border-red-500 pl-3 py-1 flex justify-between items-start bg-gray-50/30">
                          <div>
                            <span className="font-medium text-gray-900">{ticket.description}</span>
                            <span className="text-xs text-gray-500 block">
                              Reported by: {reporter?.name || 'System'} | Created: {new Date(ticket.created_at).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-gray-500 block">
                              Priority: <strong className="uppercase text-xs">{ticket.priority}</strong>
                            </span>
                          </div>
                          <Badge className="capitalize text-xs font-semibold" variant={ticket.status === 'resolved' ? 'outline' : 'destructive'}>
                            {ticket.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Return Asset Dialog */}
      <Dialog open={isReturnOpen} onOpenChange={setIsReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return Asset Check-in</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="condition">Check-in Condition</Label>
              <Select onValueChange={(val) => setReturnCondition(val || 'Good')} defaultValue="Good">
                <SelectTrigger id="condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Excellent">Excellent</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Poor">Poor/Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes / Observations</Label>
              <textarea id="notes" rows={3} className="w-full rounded-md border border-gray-200 p-2 text-sm focus:border-blue-500 focus:outline-none bg-white text-black" placeholder="Describe the physical condition..." value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleReturnAsset}>Confirm Asset Return</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Transition Dialog */}
      <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transition Asset State</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-status">Select New Status</Label>
              <Select onValueChange={(val) => setNewStatus(val || '')} defaultValue={newStatus}>
                <SelectTrigger id="new-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="allocated">Allocated</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                  <SelectItem value="disposed">Disposed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleStatusChange}>Apply State Change</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
