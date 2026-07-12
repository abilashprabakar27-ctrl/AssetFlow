'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { 
  Package, 
  Search, 
  Plus, 
  X, 
  Layers, 
  SlidersHorizontal, 
  Eye, 
  RefreshCw, 
  GitCommit,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  ClipboardList
} from 'lucide-react';

export default function AssetDirectoryPage() {
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Tabs & Routing State
  const [activeTab, setActiveTab] = useState('directory');
  
  // Data State
  const [assets, setAssets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  
  // Filter State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  // Detail Modal State
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [assetHistory, setAssetHistory] = useState<any[]>([]);
  const [assetMaintenance, setAssetMaintenance] = useState<any[]>([]);

  // Registration Slide-Over State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  
  // Registration Form State
  const [nextTag, setNextTag] = useState('AF-0001');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  
  const [name, setName] = useState('');
  const [serial, setSerial] = useState('');
  const [location, setLocation] = useState('HQ - Floor 3');
  const [condition, setCondition] = useState('Excellent');
  const [cost, setCost] = useState('');
  const [isBookable, setIsBookable] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [regDeptId, setRegDeptId] = useState('');

  // Allocation Form State
  const [allocAssetId, setAllocAssetId] = useState('');
  const [allocUserId, setAllocUserId] = useState('');
  const [allocDeptId, setAllocDeptId] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [conflictAlloc, setConflictAlloc] = useState<any>(null);
  const [allocSuccess, setAllocSuccess] = useState<string | null>(null);
  const [allocError, setAllocError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // Current User
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
      setCurrentUser(profile);
    }

    // Assets
    const { data: assetsData } = await supabase.from('assets').select('*, category:asset_categories(*), department:departments(*)').order('created_at', { ascending: false });
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

    // Allocations
    const { data: allocs } = await supabase.from('allocations').select('*');
    if (allocs) setAllocations(allocs);
    
    // Determine next tag
    if (assetsData && assetsData.length > 0) {
      const tags = assetsData.map((a: any) => {
        const num = parseInt(a.tag.split('-')[1]);
        return isNaN(num) ? 0 : num;
      });
      const maxTag = Math.max(...tags, 0);
      setNextTag(`AF-${String(maxTag + 1).padStart(4, '0')}`);
    } else {
      setNextTag('AF-0001');
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle auto-open register panel and active tabs via query parameters (Sidebar integration)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam) {
        setActiveTab(tabParam);
      }
      if (params.get('register') === 'true') {
        setIsRegisterOpen(true);
      }
    }
  }, []);

  // Load History for Selected Asset
  const loadAssetDetails = async (asset: any) => {
    setSelectedAsset(asset);
    const { data: allocs } = await supabase.from('allocations').select('*').eq('asset_id', asset.id).order('allocated_at', { ascending: false });
    const { data: maintenance } = await supabase.from('maintenance_requests').select('*').eq('asset_id', asset.id).order('created_at', { ascending: false });
    setAssetHistory(allocs || []);
    setAssetMaintenance(maintenance || []);
  };

  // Handle Registration Category specificity fields
  const handleCategoryChange = (catId: string | null) => {
    if (!catId) return;
    const cat = categories.find((c) => c.id === catId);
    setSelectedCategory(cat || null);
    if (cat?.custom_fields) {
      const initialFields: Record<string, string> = {};
      Object.keys(cat.custom_fields).forEach((key) => { initialFields[key] = ''; });
      setCustomFieldValues(initialFields);
    } else {
      setCustomFieldValues({});
    }
  };

  const handleCustomFieldChange = (key: string, value: string) => {
    setCustomFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  // Asset Registration Action
  const handleRegisterAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const finalCustomFields: Record<string, any> = {};
    if (selectedCategory?.custom_fields) {
      Object.keys(selectedCategory.custom_fields).forEach((key) => {
        finalCustomFields[key] = customFieldValues[key] || '';
      });
    }

    const payload = {
      tag: nextTag,
      name,
      serial: serial || null,
      category_id: selectedCategory?.id || null,
      department_id: regDeptId === 'none' || !regDeptId ? null : regDeptId,
      status: 'available' as const,
      is_bookable: isBookable,
      condition,
      location,
      cost: cost ? parseFloat(cost) : null,
      custom_fields: finalCustomFields,
    };

    const { error: insertError } = await supabase.from('assets').insert([payload]);
    
    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    await supabase.from('activity_logs').insert([{
      user_id: currentUser?.id,
      action: 'Register Asset',
      details: `Registered asset ${nextTag}: ${name}`,
    }]);

    setName(''); setSerial(''); setCost(''); setRegDeptId('');
    setIsRegisterOpen(false);
    setLoading(false);
    fetchData();
  };

  // Allocation Conflict check
  const handleAssetSelect = (assetId: string | null) => {
    if (!assetId) {
      setAllocAssetId('');
      setConflictError(null);
      setConflictAlloc(null);
      return;
    }
    setAllocAssetId(assetId);
    setConflictError(null);
    setConflictAlloc(null);

    const asset = assets.find(a => a.id === assetId);
    if (asset && asset.status === 'allocated') {
      const activeAlloc = allocations.find(a => a.asset_id === assetId && !a.returned_at && a.status === 'active');
      if (activeAlloc) {
        setConflictAlloc(activeAlloc);
        const holder = employees.find(u => u.id === activeAlloc.user_id);
        setConflictError(`Conflict Warning: This asset is currently allocated to ${holder?.name || 'another employee'}.`);
      }
    }
  };

  // Issue Allocation Action
  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAllocSuccess(null);
    setAllocError(null);

    if (!allocAssetId || !allocUserId) {
      setAllocError('Please choose an asset and a custodian.');
      setLoading(false);
      return;
    }

    const asset = assets.find(a => a.id === allocAssetId);
    if (!asset) {
      setAllocError('Asset not found.');
      setLoading(false);
      return;
    }

    if (asset.status === 'allocated') {
      setAllocError('Allocation blocked. The asset is already taken. Request a Transfer below.');
      setLoading(false);
      return;
    }

    const payload = {
      asset_id: allocAssetId,
      user_id: allocUserId,
      department_id: allocDeptId === 'none' || !allocDeptId ? null : allocDeptId,
      allocated_at: new Date().toISOString(),
      expected_return_date: expectedReturn || null,
      status: 'active' as const
    };

    const { error: insertError } = await supabase.from('allocations').insert([payload]);
    if (insertError) {
      setAllocError(insertError.message);
      setLoading(false);
      return;
    }

    await supabase.from('assets').update({
      status: 'allocated',
      department_id: allocDeptId === 'none' || !allocDeptId ? null : allocDeptId
    }).eq('id', allocAssetId);

    const targetUser = employees.find(u => u.id === allocUserId);
    await supabase.from('activity_logs').insert([{
      user_id: currentUser?.id,
      action: 'Allocate Asset',
      details: `Allocated asset ${asset.tag} to employee ${targetUser?.name}`,
    }]);

    setAllocSuccess('Asset successfully allocated!');
    setAllocAssetId('');
    setAllocUserId('');
    setAllocDeptId('');
    setExpectedReturn('');
    setLoading(false);
    fetchData();
  };

  // Request Transfer Action (Conflict bypass)
  const handleRequestTransfer = async () => {
    if (!conflictAlloc || !allocUserId) {
      setAllocError('Please select a target custodian for the transfer.');
      return;
    }

    setLoading(true);
    const asset = assets.find(a => a.id === allocAssetId);

    const payload = {
      asset_id: allocAssetId,
      user_id: allocUserId,
      department_id: allocDeptId === 'none' || !allocDeptId ? null : allocDeptId,
      allocated_at: new Date().toISOString(),
      expected_return_date: expectedReturn || null,
      status: 'transfer_pending' as const,
      notes: `Proposed transfer from employee: ${conflictAlloc.user_id}`
    };

    const { error: transferError } = await supabase.from('allocations').insert([payload]);
    if (transferError) {
      setAllocError(transferError.message);
      setLoading(false);
      return;
    }

    const targetUser = employees.find(u => u.id === allocUserId);
    await supabase.from('activity_logs').insert([{
      user_id: currentUser?.id,
      action: 'Request Transfer',
      details: `Requested transfer for asset ${asset?.tag} to employee ${targetUser?.name}`,
    }]);

    setAllocSuccess('Transfer request submitted successfully. Awaiting Manager/Head approval.');
    setConflictError(null);
    setConflictAlloc(null);
    setAllocAssetId('');
    setAllocUserId('');
    setAllocDeptId('');
    setExpectedReturn('');
    setLoading(false);
    fetchData();
  };

  // Transfer approvals
  const handleApproveTransfer = async (transferAlloc: any) => {
    setLoading(true);
    
    // Return old allocation
    const oldAlloc = allocations.find(a => a.asset_id === transferAlloc.asset_id && !a.returned_at && a.status === 'active');
    if (oldAlloc) {
      await supabase.from('allocations').update({
        returned_at: new Date().toISOString(),
        status: 'returned',
        notes: `Custody transferred to user: ${transferAlloc.user_id}`
      }).eq('id', oldAlloc.id);
    }

    // Activate transfer
    await supabase.from('allocations').update({
      status: 'active'
    }).eq('id', transferAlloc.id);

    // Update asset department
    await supabase.from('assets').update({
      department_id: transferAlloc.department_id
    }).eq('id', transferAlloc.asset_id);

    await supabase.from('activity_logs').insert([{
      user_id: currentUser?.id,
      action: 'Approve Transfer',
      details: `Approved custody transfer for asset ID: ${transferAlloc.asset_id}`,
    }]);

    setAllocSuccess('Transfer request approved and custody updated!');
    setLoading(false);
    fetchData();
  };

  const handleRejectTransfer = async (transferAlloc: any) => {
    setLoading(true);
    
    await supabase.from('allocations').update({
      status: 'transfer_rejected',
      returned_at: new Date().toISOString()
    }).eq('id', transferAlloc.id);

    await supabase.from('activity_logs').insert([{
      user_id: currentUser?.id,
      action: 'Reject Transfer',
      details: `Rejected custody transfer for asset ID: ${transferAlloc.asset_id}`,
    }]);

    setAllocSuccess('Transfer request rejected.');
    setLoading(false);
    fetchData();
  };

  // Lists filtering
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(search.toLowerCase()) || asset.tag.toLowerCase().includes(search.toLowerCase()) || (asset.serial && asset.serial.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || asset.category_id === categoryFilter;
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    const matchesLocation = locationFilter === 'all' || asset.location === locationFilter;
    return matchesSearch && matchesCategory && matchesStatus && matchesLocation;
  });

  const activeAllocations = allocations.filter(a => !a.returned_at && a.status === 'active').map(alloc => {
    const asset = assets.find(a => a.id === alloc.asset_id);
    const user = employees.find(u => u.id === alloc.user_id);
    const dept = departments.find(d => d.id === alloc.department_id);
    return { ...alloc, asset, user, department: dept };
  });

  const pendingTransfers = allocations.filter(a => a.status === 'transfer_pending').map(alloc => {
    const asset = assets.find(a => a.id === alloc.asset_id);
    const user = employees.find(u => u.id === alloc.user_id);
    const dept = departments.find(d => d.id === alloc.department_id);
    return { ...alloc, asset, user, department: dept };
  });

  const locations = Array.from(new Set(assets.map(a => a.location).filter(Boolean)));
  const isManagerOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'asset_manager';
  const isManagerOrHead = currentUser?.role === 'admin' || currentUser?.role === 'asset_manager' || currentUser?.role === 'department_head';

  const statusColors: Record<string, string> = {
    available: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/20',
    allocated: 'bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400 dark:border-blue-500/20',
    reserved: 'bg-violet-500/15 text-violet-600 border-violet-500/30 dark:text-violet-400 dark:border-violet-500/20',
    under_maintenance: 'bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400 dark:border-orange-500/20',
    lost: 'bg-destructive/15 text-destructive border-destructive/30 dark:text-red-400',
    retired: 'bg-muted text-muted-foreground border-border',
    disposed: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className="relative min-h-screen p-6 lg:p-8 space-y-8 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-5%] right-[-5%] w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none animate-float" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none animate-float-delayed" />

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-animated shadow-glow-blue flex-shrink-0">
            <Package className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-zinc-50">Inventory & Custody</h1>
            <p className="text-muted-foreground text-sm mt-1">Unified asset register, checkout allocation forms, and chain-of-custody pipelines.</p>
          </div>
        </div>
        {isManagerOrAdmin && (
          <div className="flex gap-3">
            <Button onClick={() => setIsRegisterOpen(true)} className="h-10 bg-gradient-animated text-white font-bold shadow-glow-violet hover:scale-[1.02] transition-all duration-200 rounded-xl text-xs">
              <Plus className="h-4 w-4 mr-1.5" />
              Register Asset
            </Button>
          </div>
        )}
      </div>

      {/* Unified Tab Views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 relative z-10">
        <TabsList className="bg-gray-100 dark:bg-zinc-900 p-1 rounded-xl w-fit">
          <TabsTrigger value="directory" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all">
            <ClipboardList className="h-4 w-4" /> Asset Directory
          </TabsTrigger>
          {isManagerOrAdmin && (
            <TabsTrigger value="allocate" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all">
              <UserCheck className="h-4 w-4" /> Issue Allocation
            </TabsTrigger>
          )}
          <TabsTrigger value="custody" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all">
            <Package className="h-4 w-4" /> Active Custody
          </TabsTrigger>
          <TabsTrigger value="transfers" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all relative">
            <RefreshCw className="h-4 w-4" /> Custody Transfers
            {pendingTransfers.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-extrabold text-white animate-pulse-glow">
                {pendingTransfers.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Asset Directory */}
        <TabsContent value="directory" className="space-y-6">
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-4 bg-card/60 backdrop-blur-xl p-5 rounded-2xl border border-border/50 shadow-glass">
            <div className="space-y-1.5">
              <Label htmlFor="search" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Search Assets</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="search" placeholder="Name, tag, serial..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-background/50 border-border/50 dark:bg-zinc-950 dark:border-zinc-800" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</Label>
              <Select onValueChange={(val) => setCategoryFilter(val || 'all')} defaultValue="all">
                <SelectTrigger id="category" className="bg-background/50 border-border/50 dark:bg-zinc-950 dark:border-zinc-800">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                  <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                  {categories.map((c) => (<SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</Label>
              <Select onValueChange={(val) => setStatusFilter(val || 'all')} defaultValue="all">
                <SelectTrigger id="status" className="bg-background/50 border-border/50 dark:bg-zinc-950 dark:border-zinc-800">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                  <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                  <SelectItem value="available" className="text-xs">Available</SelectItem>
                  <SelectItem value="allocated" className="text-xs">Allocated</SelectItem>
                  <SelectItem value="reserved" className="text-xs">Reserved</SelectItem>
                  <SelectItem value="under_maintenance" className="text-xs">Under Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location</Label>
              <Select onValueChange={(val) => setLocationFilter(val || 'all')} defaultValue="all">
                <SelectTrigger id="location" className="bg-background/50 border-border/50 dark:bg-zinc-950 dark:border-zinc-800">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                  <SelectItem value="all" className="text-xs">All Locations</SelectItem>
                  {locations.map((loc, idx) => (<SelectItem key={idx} value={loc as string} className="text-xs">{loc as string}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Directory Table */}
          <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden shadow-glass">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/30 text-muted-foreground border-b border-border/50 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-bold">Asset Tag</th>
                    <th className="px-6 py-4 font-bold">Details</th>
                    <th className="px-6 py-4 font-bold">Category</th>
                    <th className="px-6 py-4 font-bold">Location</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center">
                          <Search className="h-8 w-8 mb-3 opacity-20" />
                          <p className="font-semibold text-sm">No assets found in the inventory.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((asset) => (
                      <tr key={asset.id} className="group hover:bg-primary/5 transition-colors cursor-pointer" onClick={() => loadAssetDetails(asset)}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-primary/10 text-primary font-mono text-xs font-bold border border-primary/20 group-hover:border-primary/50 transition-colors">
                            {asset.tag}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{asset.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 font-mono">S/N: {asset.serial || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-semibold">{asset.category?.name || 'Unassigned'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground font-medium">
                          {asset.location || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={cn("capitalize border px-2.5 py-0.5 font-bold text-xs", statusColors[asset.status])}>
                            {asset.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:bg-primary/10 rounded-lg" onClick={(e) => { e.stopPropagation(); loadAssetDetails(asset); }}>
                            <Eye className="h-4 w-4 mr-1.5" /> View Details
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Issue Allocation */}
        <TabsContent value="allocate">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="md:col-span-1 border border-border/50 bg-card/60 backdrop-blur-xl shadow-glass rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-border/40 pb-4">
                <CardTitle className="text-lg font-bold text-gray-900 dark:text-zinc-100">Allocate Hardware</CardTitle>
                <CardDescription className="text-xs">Check out an available device or setup a department transfer pipeline.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {allocSuccess && (
                  <div className="p-3 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30 rounded-xl">
                    {allocSuccess}
                  </div>
                )}
                {allocError && (
                  <div className="p-3 text-xs font-semibold text-red-700 bg-red-50 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-800/30 rounded-xl">
                    {allocError}
                  </div>
                )}

                <form onSubmit={handleAllocate} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="alloc-asset" className="text-xs font-bold">Select Asset</Label>
                    <Select onValueChange={handleAssetSelect} value={allocAssetId}>
                      <SelectTrigger id="alloc-asset" className="bg-background/50 dark:bg-zinc-950 dark:border-zinc-800">
                        <SelectValue placeholder="Choose asset..." />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                        {assets.map((a) => (
                          <SelectItem key={a.id} value={a.id} className="text-xs">
                            {a.name} ({a.tag}) - {a.status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {conflictError && (
                    <div className="p-4 text-xs bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30 rounded-xl space-y-3 font-medium">
                      <div className="flex gap-2 text-amber-700 dark:text-amber-400">
                        <ShieldAlert className="h-4 w-4 shrink-0" />
                        <p>{conflictError}</p>
                      </div>
                      <p className="text-muted-foreground text-[10px]">Since it is already checked out, you can request a department transfer to reassign custody logs cleanly.</p>
                      <Button type="button" size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 rounded-lg" onClick={handleRequestTransfer} disabled={loading || !allocUserId}>
                        Request Custody Transfer
                      </Button>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="alloc-user" className="text-xs font-bold">Custodian Employee</Label>
                    <Select onValueChange={(val) => setAllocUserId(val || '')} value={allocUserId}>
                      <SelectTrigger id="alloc-user" className="bg-background/50 dark:bg-zinc-950 dark:border-zinc-800">
                        <SelectValue placeholder="Choose custodian..." />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                        {employees.map((u) => (
                          <SelectItem key={u.id} value={u.id} className="text-xs">
                            {u.name} ({u.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="alloc-dept" className="text-xs font-bold">Target Department (Optional)</Label>
                    <Select onValueChange={(val) => setAllocDeptId(val || '')} value={allocDeptId}>
                      <SelectTrigger id="alloc-dept" className="bg-background/50 dark:bg-zinc-950 dark:border-zinc-800">
                        <SelectValue placeholder="Select department..." />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                        <SelectItem value="none" className="text-xs">Personal (No Dept Allocation)</SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="alloc-return" className="text-xs font-bold">Expected Return Date</Label>
                    <Input id="alloc-return" type="date" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)} className="bg-background/50 dark:bg-zinc-950 dark:border-zinc-800 text-xs text-black dark:text-white" />
                  </div>

                  {!conflictAlloc && (
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 rounded-xl" disabled={loading}>
                      Confirm Allocation
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border border-border/50 bg-card/60 backdrop-blur-xl shadow-glass rounded-2xl p-6 flex flex-col justify-center">
              <h3 className="font-extrabold text-gray-900 dark:text-zinc-50 text-lg mb-3">Custody Allocation Framework</h3>
              <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">
                All device checkout changes must follow the structured organizational rules to keep chain of custody audit logs precise:
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="border border-border/50 p-4 rounded-xl bg-background/30">
                  <span className="text-blue-500 font-bold block mb-1">1. Check Status</span>
                  <span className="text-xs text-muted-foreground block">Only available status devices can be directly allocated.</span>
                </div>
                <div className="border border-border/50 p-4 rounded-xl bg-background/30">
                  <span className="text-orange-500 font-bold block mb-1">2. Conflict Check</span>
                  <span className="text-xs text-muted-foreground block">Double assignments are blocked to prevent mapping duplicates.</span>
                </div>
                <div className="border border-border/50 p-4 rounded-xl bg-background/30">
                  <span className="text-purple-500 font-bold block mb-1">3. Transfer Pipeline</span>
                  <span className="text-xs text-muted-foreground block">Transferring allocated items triggers a pending review queue for managers.</span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Active Custody */}
        <TabsContent value="custody">
          <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden shadow-glass">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold text-xs">Asset Tag</TableHead>
                  <TableHead className="font-bold text-xs">Asset Name</TableHead>
                  <TableHead className="font-bold text-xs">Custodian Employee</TableHead>
                  <TableHead className="font-bold text-xs">Department</TableHead>
                  <TableHead className="font-bold text-xs">Allocation Date</TableHead>
                  <TableHead className="font-bold text-xs">Expected Return</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeAllocations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-gray-400 dark:text-zinc-500 italic">No active asset custody logs registered.</TableCell>
                  </TableRow>
                ) : (
                  activeAllocations.map((alloc) => (
                    <TableRow key={alloc.id}>
                      <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400">{alloc.asset?.tag || 'AF-XXXX'}</TableCell>
                      <TableCell className="font-semibold text-gray-900 dark:text-zinc-200">{alloc.asset?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-gray-900 dark:text-zinc-200">{alloc.user?.name || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{alloc.user?.email || 'N/A'}</div>
                      </TableCell>
                      <TableCell className="text-gray-500 dark:text-zinc-400 font-medium">{alloc.department?.name || '-'}</TableCell>
                      <TableCell className="text-gray-500 dark:text-zinc-400 font-mono text-xs">{new Date(alloc.allocated_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {alloc.expected_return_date ? (
                          <span className={cn(
                            "font-bold text-xs font-mono px-2 py-0.5 rounded border",
                            new Date(alloc.expected_return_date) < new Date() 
                              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800/30' 
                              : 'bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                          )}>
                            {new Date(alloc.expected_return_date).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground font-semibold">Indefinite</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab 4: Custody Transfer Requests */}
        <TabsContent value="transfers">
          <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden shadow-glass">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold text-xs">Asset Tag</TableHead>
                  <TableHead className="font-bold text-xs">Asset Name</TableHead>
                  <TableHead className="font-bold text-xs">Proposed Custodian</TableHead>
                  <TableHead className="font-bold text-xs">Proposed Dept</TableHead>
                  <TableHead className="font-bold text-xs">Request Date</TableHead>
                  <TableHead className="font-bold text-xs">Status</TableHead>
                  <TableHead className="text-right font-bold text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingTransfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-gray-400 dark:text-zinc-500 italic">No custody transfer requests pending review.</TableCell>
                  </TableRow>
                ) : (
                  pendingTransfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400">{transfer.asset?.tag || 'AF-XXXX'}</TableCell>
                      <TableCell className="font-semibold text-gray-900 dark:text-zinc-200">{transfer.asset?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-gray-900 dark:text-zinc-200">{transfer.user?.name || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{transfer.user?.email || 'N/A'}</div>
                      </TableCell>
                      <TableCell className="text-gray-500 dark:text-zinc-400 font-medium">{transfer.department?.name || '-'}</TableCell>
                      <TableCell className="text-gray-500 dark:text-zinc-400 font-mono text-xs">{new Date(transfer.allocated_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200 dark:border-amber-850/20 font-bold text-xs capitalize px-2 py-0.5">
                          {transfer.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1.5">
                        {isManagerOrHead ? (
                          <>
                            <Button size="xs" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 rounded-lg text-xs" onClick={() => handleApproveTransfer(transfer)} disabled={loading}>
                              Approve
                            </Button>
                            <Button size="xs" variant="destructive" className="font-bold h-7 rounded-lg text-xs" onClick={() => handleRejectTransfer(transfer)} disabled={loading}>
                              Reject
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 italic font-medium">Managers Only</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <Dialog open={selectedAsset !== null} onOpenChange={(open) => { if (!open) setSelectedAsset(null); }}>
          <DialogContent className="max-w-2xl bg-card/90 backdrop-blur-xl border-border/50 shadow-glass overflow-hidden dark:bg-zinc-900 dark:border-zinc-800">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-animated" />
            <DialogHeader className="pt-4">
              <DialogTitle className="flex flex-col gap-1">
                <span className="text-xs font-mono text-primary font-bold tracking-widest uppercase">{selectedAsset.tag}</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-zinc-100">{selectedAsset.name}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4 border border-border/50 bg-background/50 dark:bg-zinc-950/40 p-5 rounded-xl">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Category</span>
                  <span className="font-semibold text-sm flex items-center gap-2 text-gray-900 dark:text-zinc-200"><Layers className="h-4 w-4 text-primary" /> {selectedAsset.category?.name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Location</span>
                  <span className="font-semibold text-sm text-gray-900 dark:text-zinc-200">{selectedAsset.location || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Condition</span>
                  <span className="font-semibold text-sm text-gray-900 dark:text-zinc-200">{selectedAsset.condition || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Acquisition Cost</span>
                  <span className="font-bold text-sm text-emerald-500">${selectedAsset.cost || '0.00'}</span>
                </div>
              </div>

              {selectedAsset.custom_fields && Object.keys(selectedAsset.custom_fields).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-primary" /> Custom Fields Schema
                  </h3>
                  <div className="grid grid-cols-2 gap-4 border border-border/50 bg-background/50 dark:bg-zinc-950/40 p-5 rounded-xl">
                    {Object.entries(selectedAsset.custom_fields).map(([key, val]) => (
                      <div key={key}>
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">{key.replace('_', ' ')}</span>
                        <span className="font-semibold text-sm text-gray-900 dark:text-zinc-200">{String(val) || '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <GitCommit className="h-4 w-4 text-primary" /> Lifecycle History
                </h3>
                <div className="border border-border/50 bg-background/30 rounded-xl overflow-hidden divide-y divide-border/50 dark:border-zinc-800">
                  {assetHistory.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">No lifecycle events recorded.</div>
                  ) : (
                    assetHistory.map((alloc) => {
                      const keeper = employees.find(u => u.id === alloc.user_id);
                      return (
                        <div key={alloc.id} className="p-4 flex justify-between items-start hover:bg-muted/20 transition-colors">
                          <div>
                            <p className="font-bold text-sm text-gray-900 dark:text-zinc-200">Custodian: {keeper?.name || alloc.user_id}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(alloc.allocated_at).toLocaleDateString()} {alloc.returned_at && `→ Returned: ${new Date(alloc.returned_at).toLocaleDateString()}`}
                            </p>
                          </div>
                          <Badge variant="outline" className="capitalize text-xs font-bold">{alloc.status.replace('_', ' ')}</Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Registration Slide-Over Panel */}
      {/* Registration Slide-Over Panel */}
      <div 
        className={cn(
          "fixed inset-0 z-50 flex justify-end transition-all duration-500",
          isRegisterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsRegisterOpen(false)} />
        <div className={cn(
          "relative w-full max-w-md h-full bg-card/95 backdrop-blur-xl border-l border-border/50 shadow-2xl flex flex-col transition-transform duration-500 ease-out dark:bg-zinc-900 dark:border-zinc-800",
          isRegisterOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-animated" />
          
          <div className="flex items-center justify-between p-6 border-b border-border/50 dark:border-zinc-800">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Register Asset</h2>
              <p className="text-xs text-muted-foreground mt-1">Add new inventory device record to the registry.</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsRegisterOpen(false)} className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
            <form id="register-form" onSubmit={handleRegisterAsset} className="space-y-6">
              {error && <div className="p-3 text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">{error}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tag" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Asset Tag</Label>
                  <Input id="tag" value={nextTag} disabled className="bg-primary/5 border-primary/20 font-mono font-bold text-primary dark:bg-zinc-950 dark:border-zinc-800" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="serial" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Serial Number</Label>
                  <Input id="serial" placeholder="S/N ID" value={serial} onChange={(e) => setSerial(e.target.value)} className="bg-background/50 dark:bg-zinc-950 dark:border-zinc-800" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Asset Name</Label>
                <Input id="name" placeholder="e.g. MacBook Pro 16-inch" required value={name} onChange={(e) => setName(e.target.value)} className="bg-background/50 dark:bg-zinc-950 dark:border-zinc-800" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-category" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</Label>
                  <Select onValueChange={handleCategoryChange} required>
                    <SelectTrigger id="reg-category" className="bg-background/50 dark:bg-zinc-950 dark:border-zinc-800">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                      {categories.map((c) => (<SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cost" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cost ($)</Label>
                  <Input id="cost" type="number" step="0.01" placeholder="0.00" value={cost} onChange={(e) => setCost(e.target.value)} className="bg-background/50 dark:bg-zinc-950 dark:border-zinc-800" />
                </div>
              </div>

              {selectedCategory?.custom_fields && Object.keys(selectedCategory.custom_fields).length > 0 && (
                <div className="border border-primary/20 bg-primary/5 p-4 rounded-xl space-y-4 dark:border-primary/10">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" /> Custom Specifications ({selectedCategory.name})
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.keys(selectedCategory.custom_fields).map((key) => (
                      <div key={key} className="space-y-1.5">
                        <Label htmlFor={`custom-${key}`} className="capitalize text-xs text-muted-foreground">{key.replace('_', ' ')}</Label>
                        <Input 
                          id={`custom-${key}`} 
                          placeholder="..."
                          value={customFieldValues[key] || ''} 
                          onChange={(e) => handleCustomFieldChange(key, e.target.value)} 
                          className="h-8 text-xs bg-background/50 dark:bg-zinc-950 dark:border-zinc-800"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="reg-dept" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Department Owner</Label>
                <Select onValueChange={(val) => setRegDeptId(val || '')} value={regDeptId}>
                  <SelectTrigger id="reg-dept" className="bg-background/50 dark:bg-zinc-950 dark:border-zinc-800">
                    <SelectValue placeholder="No Department (Unassigned)" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                    <SelectItem value="none" className="text-xs">No Department (Unassigned)</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-location" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location</Label>
                  <Input id="reg-location" value={location} onChange={(e) => setLocation(e.target.value)} className="bg-background/50 dark:bg-zinc-950 dark:border-zinc-800" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-condition" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Condition</Label>
                  <Select onValueChange={(val) => setCondition(val || 'Excellent')} defaultValue="Excellent">
                    <SelectTrigger id="reg-condition" className="bg-background/50 dark:bg-zinc-950 dark:border-zinc-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                      <SelectItem value="Excellent" className="text-xs">Excellent</SelectItem>
                      <SelectItem value="Good" className="text-xs">Good</SelectItem>
                      <SelectItem value="Fair" className="text-xs">Fair</SelectItem>
                      <SelectItem value="Poor" className="text-xs">Poor/Damaged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </form>
          </div>
          
          <div className="p-6 border-t border-border/50 dark:border-zinc-800 bg-muted/10">
            <Button type="submit" form="register-form" disabled={loading} className="w-full h-11 bg-gradient-animated text-white font-semibold shadow-glow-violet hover:shadow-glow-blue transition-all duration-300">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Complete Registration'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
