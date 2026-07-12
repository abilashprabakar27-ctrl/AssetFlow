'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Package, Search, Plus, X, Layers, SlidersHorizontal, Eye, RefreshCw, GitCommit } from 'lucide-react';

export default function AssetDirectoryPage() {
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Data State
  const [assets, setAssets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
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

  // Load History for Selected Asset
  const loadAssetDetails = async (asset: any) => {
    setSelectedAsset(asset);
    const { data: allocs } = await supabase.from('allocations').select('*').eq('asset_id', asset.id).order('allocated_at', { ascending: false });
    const { data: maintenance } = await supabase.from('maintenance_requests').select('*').eq('asset_id', asset.id).order('created_at', { ascending: false });
    setAssetHistory(allocs || []);
    setAssetMaintenance(maintenance || []);
  };

  // Handle Registration Form Submissions
  const handleCategoryChange = (catId: string) => {
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
      department_id: null,
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

    // Reset and close slide-over
    setName(''); setSerial(''); setCost('');
    setIsRegisterOpen(false);
    setLoading(false);
    fetchData(); // refresh list
  };

  // Filter Assets
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(search.toLowerCase()) || asset.tag.toLowerCase().includes(search.toLowerCase()) || (asset.serial && asset.serial.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || asset.category_id === categoryFilter;
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    const matchesLocation = locationFilter === 'all' || asset.location === locationFilter;
    return matchesSearch && matchesCategory && matchesStatus && matchesLocation;
  });

  const locations = Array.from(new Set(assets.map(a => a.location).filter(Boolean)));
  const isManagerOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'asset_manager';

  const statusColors: Record<string, string> = {
    available: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
    allocated: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
    reserved: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
    under_maintenance: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
    lost: 'bg-destructive/15 text-destructive border-destructive/30',
    retired: 'bg-muted text-muted-foreground border-border',
    disposed: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className="relative min-h-screen p-6 lg:p-8 space-y-8 overflow-hidden">
      {/* Background Animated Blobs for Glass Effect */}
      <div className="absolute top-[-5%] right-[-5%] w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[100px] animate-float pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-500/10 blur-[120px] animate-float-delayed pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 opacity-0 animate-slide-up" style={{ animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-animated shadow-glow-blue flex-shrink-0">
            <Package className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Asset Directory</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage and track your entire hardware inventory.</p>
          </div>
        </div>
        {isManagerOrAdmin && (
          <div className="flex gap-3">
            <Button onClick={() => setIsRegisterOpen(true)} className="h-10 bg-gradient-animated text-white shadow-glow-violet hover:scale-[1.02] transition-all duration-200">
              <Plus className="h-4 w-4 mr-2" />
              Register Asset
            </Button>
          </div>
        )}
      </div>

      {/* Filter Toolbar (Glassmorphism) */}
      <div className="relative z-10 grid gap-4 md:grid-cols-4 bg-card/60 backdrop-blur-xl p-5 rounded-2xl border border-border/50 shadow-glass opacity-0 animate-slide-up anim-delay-100" style={{ animationFillMode: 'forwards' }}>
        <div className="space-y-1.5">
          <Label htmlFor="search" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search Assets</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="search" placeholder="Name, tag, serial..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-background/50 border-border/50" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
          <Select onValueChange={(val) => setCategoryFilter(val || 'all')} defaultValue="all">
            <SelectTrigger id="category" className="bg-background/50 border-border/50">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
          <Select onValueChange={(val) => setStatusFilter(val || 'all')} defaultValue="all">
            <SelectTrigger id="status" className="bg-background/50 border-border/50">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="allocated">Allocated</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
              <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</Label>
          <Select onValueChange={(val) => setLocationFilter(val || 'all')} defaultValue="all">
            <SelectTrigger id="location" className="bg-background/50 border-border/50">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((loc, idx) => (<SelectItem key={idx} value={loc as string}>{loc as string}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Directory Grid/List (Glassmorphism) */}
      <div className="relative z-10 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl overflow-hidden shadow-glass opacity-0 animate-slide-up anim-delay-200" style={{ animationFillMode: 'forwards' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground border-b border-border/50 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Asset Tag</th>
                <th className="px-6 py-4 font-semibold">Details</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Location</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <Search className="h-8 w-8 mb-3 opacity-20" />
                      <p>No assets match your search criteria.</p>
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
                        <span className="font-medium">{asset.category?.name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      {asset.location || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={cn("capitalize border px-2.5 py-0.5", statusColors[asset.status])}>
                        {asset.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); loadAssetDetails(asset); }}>
                        <Eye className="h-4 w-4 mr-1.5" /> View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <Dialog open={selectedAsset !== null} onOpenChange={(open) => { if (!open) setSelectedAsset(null); }}>
          <DialogContent className="max-w-2xl bg-card/90 backdrop-blur-xl border-border/50 shadow-glass overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-animated" />
            <DialogHeader className="pt-4">
              <DialogTitle className="flex flex-col gap-1">
                <span className="text-xs font-mono text-primary font-bold tracking-widest uppercase">{selectedAsset.tag}</span>
                <span className="text-2xl font-bold">{selectedAsset.name}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
              {/* Info Matrix */}
              <div className="grid grid-cols-2 gap-4 border border-border/50 bg-background/50 p-5 rounded-xl">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Category</span>
                  <span className="font-medium flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> {selectedAsset.category?.name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Location</span>
                  <span className="font-medium">{selectedAsset.location || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Condition</span>
                  <span className="font-medium">{selectedAsset.condition || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Acquisition Cost</span>
                  <span className="font-medium text-emerald-500">${selectedAsset.cost || '0.00'}</span>
                </div>
              </div>

              {/* Lifecycle logs */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <GitCommit className="h-4 w-4 text-primary" /> Lifecycle History
                </h3>
                <div className="border border-border/50 bg-background/30 rounded-xl overflow-hidden divide-y divide-border/50">
                  {assetHistory.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">No lifecycle events recorded yet.</div>
                  ) : (
                    assetHistory.map((alloc) => (
                      <div key={alloc.id} className="p-4 flex justify-between items-start hover:bg-muted/20 transition-colors">
                        <div>
                          <p className="font-medium text-sm">Assigned to ID: {alloc.user_id}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(alloc.allocated_at).toLocaleDateString()} {alloc.returned_at && `→ Returned: ${new Date(alloc.returned_at).toLocaleDateString()}`}
                          </p>
                        </div>
                        <Badge variant="outline" className="capitalize text-xs">{alloc.status}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Registration Slide-Over Panel */}
      <div 
        className={cn(
          "fixed inset-0 z-50 flex justify-end transition-all duration-500",
          isRegisterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsRegisterOpen(false)}
        />
        
        {/* Slide-over Content */}
        <div 
          className={cn(
            "relative w-full max-w-md h-full bg-card/95 backdrop-blur-xl border-l border-border/50 shadow-2xl flex flex-col transition-transform duration-500 ease-out",
            isRegisterOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-animated" />
          
          <div className="flex items-center justify-between p-6 border-b border-border/50">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Register Asset</h2>
              <p className="text-xs text-muted-foreground mt-1">Add new inventory to the directory.</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsRegisterOpen(false)} className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <form id="register-form" onSubmit={handleRegisterAsset} className="space-y-6">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tag" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Asset Tag</Label>
                  <Input id="tag" value={nextTag} disabled className="bg-primary/5 border-primary/20 font-mono font-bold text-primary" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="serial" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Serial Number</Label>
                  <Input id="serial" placeholder="S/N or ID" value={serial} onChange={(e) => setSerial(e.target.value)} className="bg-background/50" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Asset Name</Label>
                <Input id="name" placeholder="e.g. MacBook Pro 16-inch" required value={name} onChange={(e) => setName(e.target.value)} className="bg-background/50" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-category" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
                  <Select onValueChange={handleCategoryChange} required>
                    <SelectTrigger id="reg-category" className="bg-background/50">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cost" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cost ($)</Label>
                  <Input id="cost" type="number" step="0.01" placeholder="0.00" value={cost} onChange={(e) => setCost(e.target.value)} className="bg-background/50" />
                </div>
              </div>

              {selectedCategory?.custom_fields && Object.keys(selectedCategory.custom_fields).length > 0 && (
                <div className="border border-primary/20 bg-primary/5 p-4 rounded-xl space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" /> Specifics ({selectedCategory.name})
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.keys(selectedCategory.custom_fields).map((key) => (
                      <div key={key} className="space-y-1.5">
                        <Label htmlFor={`custom-${key}`} className="capitalize text-xs">{key.replace('_', ' ')}</Label>
                        <Input 
                          id={`custom-${key}`} 
                          placeholder="..."
                          value={customFieldValues[key] || ''} 
                          onChange={(e) => handleCustomFieldChange(key, e.target.value)} 
                          className="h-8 text-xs bg-background/50"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-location" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</Label>
                  <Input id="reg-location" value={location} onChange={(e) => setLocation(e.target.value)} className="bg-background/50" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-condition" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Condition</Label>
                  <Select onValueChange={(val) => setCondition(val || 'Excellent')} defaultValue="Excellent">
                    <SelectTrigger id="reg-condition" className="bg-background/50">
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
              </div>
            </form>
          </div>
          
          <div className="p-6 border-t border-border/50 bg-muted/10">
            <Button type="submit" form="register-form" disabled={loading} className="w-full h-11 bg-gradient-animated text-white font-semibold shadow-glow-violet hover:shadow-glow-blue transition-all duration-300">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Complete Registration'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
