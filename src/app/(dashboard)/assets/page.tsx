'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  MapPin, 
  Tag, 
  Boxes,
  CircleDot,
  History,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';

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

  // Premium status colors
  const statusColors: Record<string, string> = {
    available: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-[0_2px_8px_-3px_rgba(16,185,129,0.15)]',
    allocated: 'bg-indigo-50 text-indigo-700 border-indigo-200/60 shadow-[0_2px_8px_-3px_rgba(99,102,241,0.15)]',
    reserved: 'bg-amber-50 text-amber-700 border-amber-200/60 shadow-[0_2px_8px_-3px_rgba(245,158,11,0.15)]',
    under_maintenance: 'bg-rose-50 text-rose-700 border-rose-200/60 shadow-[0_2px_8px_-3px_rgba(244,63,94,0.15)]',
    lost: 'bg-slate-100 text-slate-800 border-slate-300 shadow-[0_2px_8px_-3px_rgba(100,116,139,0.15)]',
    retired: 'bg-stone-100 text-stone-700 border-stone-200 shadow-[0_2px_8px_-3px_rgba(120,113,108,0.15)]',
    disposed: 'bg-zinc-200 text-zinc-600 border-zinc-300',
  };

  const isManagerOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'asset_manager';

  // Stats Counters
  const countAvailable = assets.filter(a => a.status === 'available').length;
  const countAllocated = assets.filter(a => a.status === 'allocated').length;
  const countMaintenance = assets.filter(a => a.status === 'under_maintenance').length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Premium Gradient Header Block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl text-white shadow-xl shadow-indigo-950/10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
            <span className="text-xs font-bold text-indigo-300 tracking-wider uppercase font-mono">Operations Ledger</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-heading bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            Asset Directory
          </h1>
          <p className="text-sm text-slate-300">
            Track ownership, lifecycle state transitions, and historic ledger logs.
          </p>
        </div>
        {isManagerOrAdmin && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link href="/assets/allocate" className="w-full sm:w-auto text-center inline-flex h-11 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900/60 px-5 text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all shadow-md">
              Manage Allocations
            </Link>
            <Link href="/assets/register" className="w-full sm:w-auto text-center inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 active:scale-98 transition-all">
              <Plus className="mr-2 h-4 w-4" /> Register Asset
            </Link>
          </div>
        )}
      </div>

      {/* Modern Micro Stats Cards */}
      <div className="grid gap-5 md:grid-cols-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover-card-trigger">
          <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
            <FolderOpen className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Ledger</span>
            <p className="text-2xl font-bold text-slate-900 font-heading">{assets.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover-card-trigger">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Available Inventory</span>
            <p className="text-2xl font-bold text-slate-900 font-heading">{countAvailable}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover-card-trigger">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Tag className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Active Allocations</span>
            <p className="text-2xl font-bold text-slate-900 font-heading">{countAllocated}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover-card-trigger">
          <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Under Maintenance</span>
            <p className="text-2xl font-bold text-slate-900 font-heading">{countMaintenance}</p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar - Upgraded Styling */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
          <SlidersHorizontal className="h-4.5 w-4.5 text-slate-500" />
          <span>Interactive Filtering Toolbar</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              id="search" 
              placeholder="Search by tag, serial..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-9 h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
            />
          </div>

          <div>
            <Select onValueChange={(val) => setCategoryFilter(val || 'all')} defaultValue="all">
              <SelectTrigger id="category" className="h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500">
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

          <div>
            <Select onValueChange={(val) => setStatusFilter(val || 'all')} defaultValue="all">
              <SelectTrigger id="status" className="h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500">
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

          <div>
            <Select onValueChange={(val) => setLocationFilter(val || 'all')} defaultValue="all">
              <SelectTrigger id="location" className="h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500">
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
      </div>

      {/* Directory Table Area */}
      <div className="rounded-2xl border border-slate-200/60 bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/75">
            <TableRow>
              <TableHead className="font-semibold text-slate-600 h-12">Asset Tag</TableHead>
              <TableHead className="font-semibold text-slate-600 h-12">Name</TableHead>
              <TableHead className="font-semibold text-slate-600 h-12">Category</TableHead>
              <TableHead className="font-semibold text-slate-600 h-12">Department</TableHead>
              <TableHead className="font-semibold text-slate-600 h-12">Location</TableHead>
              <TableHead className="font-semibold text-slate-600 h-12">Status</TableHead>
              <TableHead className="text-right font-semibold text-slate-600 h-12 px-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32 text-slate-400 italic bg-white">
                  No assets found matching the query.
                </TableCell>
              </TableRow>
            ) : (
              filteredAssets.map((asset) => (
                <TableRow 
                  key={asset.id} 
                  className="hover:bg-indigo-50/10 cursor-pointer transition-colors duration-200 group/row" 
                  onClick={() => loadAssetDetails(asset)}
                >
                  <TableCell className="font-bold text-indigo-600 font-mono text-xs">{asset.tag}</TableCell>
                  <TableCell>
                    <div className="font-bold text-slate-900 group-hover/row:text-indigo-600 transition-colors">{asset.name}</div>
                    <div className="text-[10px] font-mono text-slate-400">S/N: {asset.serial || 'N/A'}</div>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm font-medium">{asset.category?.name || 'Unassigned'}</TableCell>
                  <TableCell className="text-slate-600 text-sm">{asset.department?.name || '—'}</TableCell>
                  <TableCell className="text-slate-600 text-sm flex items-center gap-1.5 py-4">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>{asset.location || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("capitalize border px-2.5 py-0.5 text-xs font-semibold rounded-full shadow-xs", statusColors[asset.status])}>
                      {asset.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2 px-6" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" onClick={() => loadAssetDetails(asset)} className="h-8.5 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs">
                      Details
                    </Button>
                    
                    {isManagerOrAdmin && asset.status === 'allocated' && (
                      <Button variant="outline" size="sm" className="h-8.5 rounded-lg text-indigo-600 hover:text-indigo-700 border-indigo-200 hover:bg-indigo-50 shadow-xs" onClick={() => { setAssetToReturn(asset); setIsReturnOpen(true); }}>
                        Return
                      </Button>
                    )}

                    {isManagerOrAdmin && (
                      <Button variant="outline" size="sm" className="h-8.5 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs" onClick={() => { setAssetToChangeStatus(asset); setNewStatus(asset.status); setIsStatusOpen(true); }}>
                        State
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Asset Detail & History Dialog */}
      {selectedAsset && (
        <Dialog open={selectedAsset !== null} onOpenChange={(open) => { if (!open) setSelectedAsset(null); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 border-slate-100 shadow-2xl">
            <DialogHeader className="border-b pb-4 mb-4">
              <DialogTitle className="flex items-center gap-3 text-2xl font-extrabold font-heading">
                <span className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Boxes className="h-5 w-5" />
                </span>
                <div>
                  <span className="text-indigo-600 font-mono text-lg font-bold">{selectedAsset.tag}</span>
                  <span className="text-slate-900 block text-base font-normal mt-0.5">{selectedAsset.name}</span>
                </div>
              </DialogTitle>
              <DialogDescription className="hidden">Asset info detail logs</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Information Grid */}
              <div className="grid grid-cols-2 gap-4 border border-slate-100 bg-slate-50/50 p-5 rounded-2xl text-sm">
                <div>
                  <span className="text-slate-400 block text-xs font-semibold uppercase tracking-wider mb-0.5">Category</span>
                  <span className="font-bold text-slate-800">{selectedAsset.category?.name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs font-semibold uppercase tracking-wider mb-0.5">Condition</span>
                  <span className="font-bold text-slate-800">{selectedAsset.condition || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs font-semibold uppercase tracking-wider mb-0.5">Location</span>
                  <span className="font-bold text-slate-800">{selectedAsset.location || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs font-semibold uppercase tracking-wider mb-0.5">Cost (USD)</span>
                  <span className="font-bold text-indigo-600">${selectedAsset.cost || 'N/A'}</span>
                </div>
                {selectedAsset.category?.custom_fields && Object.entries(selectedAsset.category.custom_fields).map(([key, val]: any) => (
                  <div key={key}>
                    <span className="text-slate-400 block text-xs font-semibold uppercase tracking-wider mb-0.5 capitalize">{key.replace('_', ' ')}</span>
                    <span className="font-bold text-slate-800">{val || '—'}</span>
                  </div>
                ))}
              </div>

              {/* Allocations Logs */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2 text-sm font-heading">
                  <History className="h-4.5 w-4.5 text-indigo-500" />
                  <span>Allocation & Transfer Log</span>
                </h3>
                {assetHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 italic pl-2">No historical allocations logged for this asset.</p>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto premium-scroll pr-1">
                    {assetHistory.map((alloc) => {
                      const user = employees.find(e => e.id === alloc.user_id);
                      const dept = departments.find(d => d.id === alloc.department_id);
                      return (
                        <div key={alloc.id} className="text-xs border border-slate-100 rounded-xl p-3 flex justify-between items-center bg-slate-50/20 hover:border-slate-200 transition-colors">
                          <div>
                            <span className="font-semibold text-slate-800 block">
                              Assigned to {user?.name || 'Unknown User'} ({dept?.name || 'Unassigned Dept'})
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block mt-1">
                              {new Date(alloc.allocated_at).toLocaleDateString()} 
                              {alloc.returned_at && ` - Returned: ${new Date(alloc.returned_at).toLocaleDateString()}`}
                            </span>
                            {alloc.notes && <span className="text-[10px] text-slate-500 italic block mt-1">Notes: {alloc.notes}</span>}
                          </div>
                          <Badge className="capitalize text-[10px] px-2 py-0.5 rounded-full" variant={alloc.status === 'active' ? 'default' : 'secondary'}>
                            {alloc.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Maintenance Request Tickets */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2 text-sm font-heading">
                  <Wrench className="h-4.5 w-4.5 text-rose-500" />
                  <span>Maintenance Logs</span>
                </h3>
                {assetMaintenance.length === 0 ? (
                  <p className="text-xs text-slate-400 italic pl-2">No historical maintenance requests logged.</p>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto premium-scroll pr-1">
                    {assetMaintenance.map((ticket) => {
                      const reporter = employees.find(e => e.id === ticket.reporter_id);
                      return (
                        <div key={ticket.id} className="text-xs border border-slate-100 rounded-xl p-3 flex justify-between items-center bg-slate-50/20 hover:border-slate-200 transition-colors">
                          <div>
                            <span className="font-semibold text-slate-800 block">{ticket.description}</span>
                            <span className="text-[10px] text-slate-400 font-mono block mt-1">
                              Reported by {reporter?.name || 'System'} on {new Date(ticket.created_at).toLocaleDateString()}
                            </span>
                            <span className="text-[10px] text-indigo-600 font-bold block mt-1 uppercase">
                              Priority: {ticket.priority}
                            </span>
                          </div>
                          <Badge className="capitalize text-[10px] font-semibold" variant={ticket.status === 'resolved' ? 'outline' : 'destructive'}>
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

      {/* Return Asset Check-In Modal */}
      <Dialog open={isReturnOpen} onOpenChange={setIsReturnOpen}>
        <DialogContent className="rounded-3xl p-6 max-w-md border-slate-100 shadow-2xl">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="flex items-center gap-2 text-xl font-extrabold font-heading text-slate-900">
              <CheckCircle2 className="h-5 w-5 text-indigo-600" />
              <span>Asset Return Check-in</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">Register the condition and observations for this asset.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="condition" className="text-slate-700 font-medium">Check-in Condition</Label>
              <Select onValueChange={(val) => setReturnCondition(val || 'Good')} defaultValue="Good">
                <SelectTrigger id="condition" className="h-11 rounded-xl border-slate-200">
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
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-slate-700 font-medium">Notes / Observations</Label>
              <textarea 
                id="notes" 
                rows={3} 
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none bg-white text-slate-900 placeholder:text-slate-400" 
                placeholder="Describe the physical condition..." 
                value={returnNotes} 
                onChange={(e) => setReturnNotes(e.target.value)} 
              />
            </div>
            <Button className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/10 glow-btn-primary mt-2" onClick={handleReturnAsset}>
              Confirm Asset Return
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* State Transitions Modal */}
      <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DialogContent className="rounded-3xl p-6 max-w-md border-slate-100 shadow-2xl">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="flex items-center gap-2 text-xl font-extrabold font-heading text-slate-900">
              <CircleDot className="h-5 w-5 text-indigo-600" />
              <span>Transition Asset State</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">Select a new state to log inside the active ledger.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-status" className="text-slate-700 font-medium">Select New Status</Label>
              <Select onValueChange={(val) => setNewStatus(val || '')} defaultValue={newStatus}>
                <SelectTrigger id="new-status" className="h-11 rounded-xl border-slate-200">
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
            <Button className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/10 glow-btn-primary mt-2" onClick={handleStatusChange}>
              Apply State Change
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
