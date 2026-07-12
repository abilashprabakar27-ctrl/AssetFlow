'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function AuditCyclesPage() {
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Data lists
  const [auditCycles, setAuditCycles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Form states (Create Cycle)
  const [cycleName, setCycleName] = useState('');
  const [scopeType, setScopeType] = useState('department');
  const [scopeId, setScopeId] = useState('');
  const [scopeLocation, setScopeLocation] = useState('');
  const [assignedAuditorId, setAssignedAuditorId] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Execution states
  const [activeCycle, setActiveCycle] = useState<any>(null);
  const [cycleAssets, setCycleAssets] = useState<any[]>([]);
  const [auditNotes, setAuditNotes] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // Current User
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
      setCurrentUser(profile);
    }

    // Audit Cycles
    const { data: cycles } = await supabase.from('audit_cycles').select('*');
    if (cycles) setAuditCycles(cycles);

    // Departments
    const { data: depts } = await supabase.from('departments').select('*').eq('status', 'active');
    if (depts) setDepartments(depts);

    // Assets
    const { data: assetsData } = await supabase.from('assets').select('*');
    if (assetsData) setAssets(assetsData);

    // Users (auditors)
    const { data: usersData } = await supabase.from('users').select('*').eq('status', 'active');
    if (usersData) setUsers(usersData);

    // Audit Asset logs
    const { data: logs } = await supabase.from('audit_asset_logs').select('*');
    if (logs) setAuditLogs(logs);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle opening active cycle to audit assets
  const handleOpenAuditCycle = (cycle: any) => {
    setActiveCycle(cycle);
    
    // Filter assets by scope
    let filtered: any[] = [];
    if (cycle.scope_type === 'department') {
      filtered = assets.filter(a => a.department_id === cycle.scope_id);
    } else if (cycle.scope_type === 'location') {
      filtered = assets.filter(a => a.location === cycle.scope_id);
    }

    setCycleAssets(filtered);
    
    // Initialize audit notes from existing logs
    const notesInit: Record<string, string> = {};
    const cycleLogs = auditLogs.filter(l => l.audit_cycle_id === cycle.id);
    cycleLogs.forEach(l => {
      notesInit[l.asset_id] = l.notes || '';
    });
    setAuditNotes(notesInit);
  };

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!cycleName || !dueDate) {
      setErrorMsg('Please enter cycle name and due date.');
      setLoading(false);
      return;
    }

    const scopeFinalId = scopeType === 'department' ? scopeId : scopeLocation;
    if (!scopeFinalId) {
      setErrorMsg('Please specify department or location scope.');
      setLoading(false);
      return;
    }

    const payload = {
      name: cycleName,
      scope_type: scopeType,
      scope_id: scopeFinalId,
      due_date: dueDate,
      auditors: assignedAuditorId ? [assignedAuditorId] : [],
      status: 'active' as const,
      created_by: currentUser?.id
    };

    const { error: insertError } = await supabase.from('audit_cycles').insert([payload]);
    if (insertError) {
      setErrorMsg(insertError.message);
      setLoading(false);
      return;
    }

    // Log Activity
    await supabase.from('activity_logs').insert([
      {
        user_id: currentUser?.id,
        action: 'Create Audit Cycle',
        details: `Created audit cycle: ${cycleName} scoped to ${scopeType}: ${scopeFinalId}`,
      }
    ]);

    setSuccessMsg('Audit Cycle created successfully!');
    setCycleName('');
    setScopeId('');
    setScopeLocation('');
    setDueDate('');
    setAssignedAuditorId('');
    setLoading(false);
    fetchData();
  };

  // Log audit verification status for a specific asset
  const handleAuditAsset = async (assetId: string, status: 'verified' | 'missing' | 'damaged') => {
    if (!activeCycle) return;
    setLoading(true);

    const notes = auditNotes[assetId] || '';

    // Check if log already exists
    const existingLog = auditLogs.find(l => l.audit_cycle_id === activeCycle.id && l.asset_id === assetId);

    if (existingLog) {
      await supabase
        .from('audit_asset_logs')
        .update({
          status,
          notes,
          audited_at: new Date().toISOString(),
          audited_by: currentUser?.id
        })
        .eq('id', existingLog.id);
    } else {
      const payload = {
        audit_cycle_id: activeCycle.id,
        asset_id: assetId,
        status,
        notes,
        audited_at: new Date().toISOString(),
        audited_by: currentUser?.id
      };
      await supabase.from('audit_asset_logs').insert([payload]);
    }

    // Dynamic discrepancy logs if damaged/missing
    if (status === 'damaged') {
      // Create a pending maintenance request automatically!
      const asset = assets.find(a => a.id === assetId);
      const mExists = (await supabase.from('maintenance_requests').select('id').eq('asset_id', assetId).eq('status', 'pending')).data?.length;
      
      if (!mExists) {
        await supabase.from('maintenance_requests').insert([
          {
            asset_id: assetId,
            reporter_id: currentUser?.id,
            description: `Audit Discrepancy Auto-Flag: Asset was flagged as DAMAGED during audit cycle "${activeCycle.name}". Note: ${notes}`,
            priority: 'high',
            status: 'pending'
          }
        ]);
      }
    }

    setSuccessMsg('Asset audit record updated.');
    setLoading(false);
    fetchData();
  };

  // Close Audit Cycle: Lock record and update missing assets to Lost
  const handleCloseCycle = async () => {
    if (!activeCycle) return;
    setLoading(true);

    // 1. Lock/close the audit cycle
    await supabase
      .from('audit_cycles')
      .update({ status: 'closed' })
      .eq('id', activeCycle.id);

    // 2. Fetch all missing asset logs in this cycle
    const cycleLogs = auditLogs.filter(l => l.audit_cycle_id === activeCycle.id);
    const missingLogs = cycleLogs.filter(l => l.status === 'missing');

    // 3. Auto-update missing asset statuses to 'lost'
    for (const log of missingLogs) {
      await supabase
        .from('assets')
        .update({ status: 'lost' })
        .eq('id', log.asset_id);
      
      // Release active allocations for lost assets
      await supabase
        .from('allocations')
        .update({
          returned_at: new Date().toISOString(),
          status: 'lost',
          notes: `Asset marked LOST during Audit Cycle: ${activeCycle.name}`
        })
        .eq('asset_id', log.asset_id)
        .eq('status', 'active');
    }

    // Log Activity
    await supabase.from('activity_logs').insert([
      {
        user_id: currentUser?.id,
        action: 'Close Audit Cycle',
        details: `Closed audit cycle: ${activeCycle.name}. Flagged missing assets updated to Lost.`,
      }
    ]);

    setSuccessMsg('Audit Cycle closed and finalized successfully!');
    setActiveCycle(null);
    setLoading(false);
    fetchData();
  };

  const isManagerOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'asset_manager';
  const locations = Array.from(new Set(assets.map(a => a.location).filter(Boolean)));

  return (
    <div className="relative min-h-screen p-6 lg:p-8 space-y-8 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-5%] right-[-5%] w-[400px] h-[400px] rounded-full bg-blue-500/8 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/8 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 opacity-0 animate-slide-up" style={{ animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-animated shadow-glow-blue flex-shrink-0">
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Structured Asset Audits</h1>
          <p className="text-muted-foreground text-sm mt-1">Run scheduled inventory verification cycles and compile discrepancy reports.</p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {errorMsg}
        </div>
      )}

      <Tabs defaultValue="active-cycles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active-cycles">Verification Cycles</TabsTrigger>
          {isManagerOrAdmin && <TabsTrigger value="create-cycle">Create Cycle</TabsTrigger>}
        </TabsList>

        <TabsContent value="active-cycles" className="mt-6">
          <Card className="border-border/60 bg-card/70 backdrop-blur-sm overflow-hidden opacity-0 animate-slide-up anim-delay-200" style={{ animationFillMode: 'forwards' }}>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold text-xs">Cycle Name</TableHead>
                  <TableHead className="font-bold text-xs">Scope Type</TableHead>
                  <TableHead className="font-bold text-xs">Target Scope</TableHead>
                  <TableHead className="font-bold text-xs">Due Date</TableHead>
                  <TableHead className="font-bold text-xs">Status</TableHead>
                  <TableHead className="text-right font-bold text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditCycles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-gray-500 italic">No verification cycles registered.</TableCell>
                  </TableRow>
                ) : (
                  auditCycles.map((cycle) => {
                    const deptName = departments.find(d => d.id === cycle.scope_id)?.name;
                    return (
                      <TableRow key={cycle.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-semibold text-foreground text-sm">{cycle.name}</TableCell>
                        <TableCell className="capitalize text-xs text-muted-foreground font-medium">{cycle.scope_type}</TableCell>
                        <TableCell className="text-xs">{cycle.scope_type === 'department' ? deptName || 'Unassigned' : cycle.scope_id}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-medium">{new Date(cycle.due_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={cycle.status === 'active' ? 'default' : 'secondary'} className={cn("capitalize text-[10px] font-bold", cycle.status === 'active' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30' : '')}>
                            {cycle.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleOpenAuditCycle(cycle)} className="h-8 rounded-lg text-xs font-semibold hover:scale-[1.02] transition-transform">
                            {cycle.status === 'active' ? 'Run Audit' : 'View Report'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="create-cycle" className="mt-6">
          <div className="grid md:grid-cols-3 gap-6 opacity-0 animate-slide-up anim-delay-200" style={{ animationFillMode: 'forwards' }}>
            <Card className="md:col-span-1 border-border/60 bg-card/70 backdrop-blur-sm shadow-glass overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-animated" />
              <CardHeader className="pt-6">
                <CardTitle className="text-lg font-bold tracking-tight">Schedule Cycle</CardTitle>
                <CardDescription className="text-xs">Assign auditors to verify locations/departments.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCycle} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cycle-name">Cycle Name</Label>
                    <Input id="cycle-name" placeholder="e.g. Q3 Floor 3 Audit" required value={cycleName} onChange={(e) => setCycleName(e.target.value)} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="scope-type">Scope Selection</Label>
                    <Select onValueChange={(val) => { setScopeType(val || 'department'); setScopeId(''); setScopeLocation(''); }} defaultValue="department">
                      <SelectTrigger id="scope-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="department">By Department</SelectItem>
                        <SelectItem value="location">By Location</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {scopeType === 'department' ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="scope-dept">Department</Label>
                      <Select onValueChange={(val) => setScopeId(val || '')} value={scopeId}>
                        <SelectTrigger id="scope-dept">
                          <SelectValue placeholder="Choose department..." />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="scope-loc">Location</Label>
                      <Select onValueChange={(val) => setScopeLocation(val || '')} value={scopeLocation}>
                        <SelectTrigger id="scope-loc">
                          <SelectValue placeholder="Choose location..." />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((loc, idx) => (
                            <SelectItem key={idx} value={loc}>{loc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="auditor">Assigned Auditor</Label>
                    <Select onValueChange={(val) => setAssignedAuditorId(val || '')} value={assignedAuditorId}>
                      <SelectTrigger id="auditor">
                        <SelectValue placeholder="Choose auditor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="due-date">Due Date</Label>
                    <Input id="due-date" type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-white text-black" />
                  </div>

                  <Button type="submit" className="w-full h-10 mt-2 bg-gradient-animated text-white font-bold shadow-glow-blue hover:scale-[1.01] transition-all duration-200 rounded-xl" disabled={loading}>
                    Initialize Cycle
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border-border/60 bg-card/70 backdrop-blur-sm p-8 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-500/10 pointer-events-none" />
              <div className="relative z-10">
                <h3 className="font-bold text-lg mb-3">Structured Audits Overview</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Structured Auditing allows organization managers to assign specific employees to run audit reviews. 
                  Unlike ad-hoc inventory reviews, verification cycles freeze reports and log actions cleanly.
                </p>
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <div className="border border-border/50 bg-background/50 p-4 rounded-xl shadow-sm">
                    <span className="text-blue-600 dark:text-blue-400 block text-lg font-bold mb-1.5 capitalize">Verify Status</span>
                    <span className="normal-case font-medium">Logs physical custody matches records.</span>
                  </div>
                  <div className="border border-border/50 bg-background/50 p-4 rounded-xl shadow-sm">
                    <span className="text-red-600 dark:text-red-400 block text-lg font-bold mb-1.5 capitalize">Auto Lost Conversion</span>
                    <span className="normal-case font-medium">Closing triggers updates to missing inventories.</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Execution Drawer / Modal View */}
      {activeCycle && (
        <Dialog open={activeCycle !== null} onOpenChange={(open) => { if (!open) setActiveCycle(null); }}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex justify-between items-center pr-6">
                <div>
                  <span className="font-bold text-xl block">{activeCycle.name}</span>
                  <span className="text-xs text-gray-500 font-normal">Scoped: {activeCycle.scope_type} - {activeCycle.scope_id}</span>
                </div>
                {activeCycle.status === 'active' && isManagerOrAdmin && (
                  <Button variant="destructive" size="sm" onClick={handleCloseCycle} disabled={loading}>
                    Close & Finalize Cycle
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Assets in Scope list */}
              <div className="space-y-2">
                <h3 className="font-bold text-gray-900 text-sm">Target Assets Scope ({cycleAssets.length})</h3>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Tag</TableHead>
                        <TableHead>Asset Name</TableHead>
                        <TableHead>Audit Notes</TableHead>
                        <TableHead>Verified Status</TableHead>
                        {activeCycle.status === 'active' && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cycleAssets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center h-20 text-gray-500 italic">No assets found in this scope.</TableCell>
                        </TableRow>
                      ) : (
                        cycleAssets.map((asset) => {
                          const log = auditLogs.find(l => l.audit_cycle_id === activeCycle.id && l.asset_id === asset.id);
                          const noteVal = auditNotes[asset.id] || '';
                          
                          return (
                            <TableRow key={asset.id}>
                              <TableCell className="font-semibold text-blue-600">{asset.tag}</TableCell>
                              <TableCell>
                                <div className="font-medium text-gray-900">{asset.name}</div>
                                <div className="text-xs text-gray-500">Condition: {asset.condition}</div>
                              </TableCell>
                              <TableCell>
                                {activeCycle.status === 'active' ? (
                                  <Input 
                                    className="h-8 max-w-[180px] text-xs bg-white text-black" 
                                    placeholder="Add comments..."
                                    value={noteVal} 
                                    onChange={(e) => setAuditNotes(prev => ({ ...prev, [asset.id]: e.target.value }))}
                                  />
                                ) : (
                                  <span className="text-xs text-gray-500">{log?.notes || '-'}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {log ? (
                                  <Badge className={cn(
                                    "font-semibold text-xs border uppercase",
                                    log.status === 'verified' ? 'bg-green-50 text-green-700 border-green-200' :
                                    log.status === 'missing' ? 'bg-red-50 text-red-700 border-red-200' :
                                    'bg-amber-50 text-amber-700 border-amber-200'
                                  )}>
                                    {log.status}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-gray-400 bg-gray-50/50">Unaudited</Badge>
                                )}
                              </TableCell>
                              {activeCycle.status === 'active' && (
                                <TableCell className="text-right space-x-1">
                                  <Button size="xs" className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 h-7" onClick={() => handleAuditAsset(asset.id, 'verified')} disabled={loading}>
                                    Verify
                                  </Button>
                                  <Button size="xs" variant="destructive" className="text-xs px-2 h-7" onClick={() => handleAuditAsset(asset.id, 'missing')} disabled={loading}>
                                    Missing
                                  </Button>
                                  <Button size="xs" className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-2 h-7" onClick={() => handleAuditAsset(asset.id, 'damaged')} disabled={loading}>
                                    Damaged
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Automatic Discrepancy report preview */}
              <div className="space-y-2 border-t pt-4">
                <h3 className="font-bold text-red-800 text-sm">Discrepancy Report Summary</h3>
                <div className="rounded-md border border-red-100 bg-red-50/20 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-red-50/50">
                      <TableRow>
                        <TableHead>Tag</TableHead>
                        <TableHead>Asset Name</TableHead>
                        <TableHead>Reported Issue</TableHead>
                        <TableHead>Discrepancy</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cycleAssets.filter(a => {
                        const log = auditLogs.find(l => l.audit_cycle_id === activeCycle.id && l.asset_id === a.id);
                        return log && (log.status === 'missing' || log.status === 'damaged');
                      }).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center h-16 text-gray-500 text-xs italic">No discrepancies flagged in this cycle yet.</TableCell>
                        </TableRow>
                      ) : (
                        cycleAssets.filter(a => {
                          const log = auditLogs.find(l => l.audit_cycle_id === activeCycle.id && l.asset_id === a.id);
                          return log && (log.status === 'missing' || log.status === 'damaged');
                        }).map((asset) => {
                          const log = auditLogs.find(l => l.audit_cycle_id === activeCycle.id && l.asset_id === asset.id);
                          return (
                            <TableRow key={asset.id}>
                              <TableCell className="font-semibold text-red-900">{asset.tag}</TableCell>
                              <TableCell className="font-medium text-red-800">{asset.name}</TableCell>
                              <TableCell className="text-xs text-red-700 font-medium italic">{log?.notes || 'No description provided'}</TableCell>
                              <TableCell>
                                <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-none font-semibold uppercase text-[10px] tracking-wider">
                                  {log?.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
