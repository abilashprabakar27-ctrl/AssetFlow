'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AssetAllocationPage() {
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Data lists
  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);

  // Form states
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  
  // Conflict reporting
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [conflictAlloc, setConflictAlloc] = useState<any>(null);

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

    // Assets (fetch all for conflict checks)
    const { data: assetsData } = await supabase.from('assets').select('*');
    if (assetsData) setAssets(assetsData);

    // Users
    const { data: usersData } = await supabase.from('users').select('*').eq('status', 'active');
    if (usersData) setUsers(usersData);

    // Departments
    const { data: depts } = await supabase.from('departments').select('*').eq('status', 'active');
    if (depts) setDepartments(depts);

    // Allocations
    const { data: allocs } = await supabase.from('allocations').select('*');
    if (allocs) setAllocations(allocs);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check for conflicts on asset selection
  const handleAssetSelect = (assetId: string) => {
    setSelectedAssetId(assetId);
    setConflictError(null);
    setConflictAlloc(null);

    const asset = assets.find(a => a.id === assetId);
    if (asset && asset.status === 'allocated') {
      // Find active allocation for this asset
      const activeAlloc = allocations.find(a => a.asset_id === assetId && !a.returned_at && a.status === 'active');
      if (activeAlloc) {
        setConflictAlloc(activeAlloc);
        setConflictError(`Conflict: This asset is currently held by ${activeAlloc.user?.name || 'another employee'}.`);
      }
    }
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!selectedAssetId || !selectedUserId) {
      setErrorMsg('Please select an asset and a user.');
      setLoading(false);
      return;
    }

    const asset = assets.find(a => a.id === selectedAssetId);
    if (!asset) {
      setErrorMsg('Selected asset not found.');
      setLoading(false);
      return;
    }

    // Double Allocation Block (Conflict rule)
    if (asset.status === 'allocated') {
      setErrorMsg('Allocation blocked. The asset is already taken. Use the Transfer workflow.');
      setLoading(false);
      return;
    }

    const payload = {
      asset_id: selectedAssetId,
      user_id: selectedUserId,
      department_id: selectedDeptId || null,
      allocated_at: new Date().toISOString(),
      expected_return_date: expectedReturnDate || null,
      status: 'active' as const
    };

    // Create allocation
    const { error: insertError } = await supabase.from('allocations').insert([payload]);
    if (insertError) {
      setErrorMsg(insertError.message);
      setLoading(false);
      return;
    }

    // Update asset status
    await supabase.from('assets').update({
      status: 'allocated',
      department_id: selectedDeptId || null
    }).eq('id', selectedAssetId);

    // Log Activity
    const targetUser = users.find(u => u.id === selectedUserId);
    await supabase.from('activity_logs').insert([
      {
        user_id: currentUser?.id,
        action: 'Allocate Asset',
        details: `Allocated asset ${asset.tag} to user ${targetUser?.name}`,
      }
    ]);

    setSuccessMsg('Asset allocated successfully!');
    setSelectedAssetId('');
    setSelectedUserId('');
    setSelectedDeptId('');
    setExpectedReturnDate('');
    setLoading(false);
    fetchData();
  };

  // Request Transfer Workflow
  const handleRequestTransfer = async () => {
    if (!conflictAlloc || !selectedUserId) {
      setErrorMsg('Please select a target user for the transfer.');
      return;
    }

    setLoading(true);
    const asset = assets.find(a => a.id === selectedAssetId);

    // Create a pending transfer allocation record
    const payload = {
      asset_id: selectedAssetId,
      user_id: selectedUserId,
      department_id: selectedDeptId || null,
      allocated_at: new Date().toISOString(),
      expected_return_date: expectedReturnDate || null,
      status: 'transfer_pending' as const,
      notes: `Transfer requested from ${conflictAlloc.user?.name || 'Current Holder'}`
    };

    const { error: transferError } = await supabase.from('allocations').insert([payload]);
    if (transferError) {
      setErrorMsg(transferError.message);
      setLoading(false);
      return;
    }

    // Log activity
    const targetUser = users.find(u => u.id === selectedUserId);
    await supabase.from('activity_logs').insert([
      {
        user_id: currentUser?.id,
        action: 'Request Transfer',
        details: `Requested transfer for asset ${asset?.tag} to user ${targetUser?.name}`,
      }
    ]);

    setSuccessMsg('Transfer request submitted successfully. Awaiting Manager/Head approval.');
    setConflictError(null);
    setConflictAlloc(null);
    setSelectedAssetId('');
    setSelectedUserId('');
    setSelectedDeptId('');
    setExpectedReturnDate('');
    setLoading(false);
    fetchData();
  };

  // Approve Transfer
  const handleApproveTransfer = async (transferAlloc: any) => {
    setLoading(true);
    
    // 1. Mark old active allocation as returned/transferred
    const oldAlloc = allocations.find(a => a.asset_id === transferAlloc.asset_id && !a.returned_at && a.status === 'active');
    if (oldAlloc) {
      await supabase.from('allocations').update({
        returned_at: new Date().toISOString(),
        status: 'returned',
        notes: `Transferred to ${transferAlloc.user?.name}`
      }).eq('id', oldAlloc.id);
    }

    // 2. Set transfer allocation status to active
    await supabase.from('allocations').update({
      status: 'active'
    }).eq('id', transferAlloc.id);

    // 3. Update asset department/user link
    await supabase.from('assets').update({
      department_id: transferAlloc.department_id
    }).eq('id', transferAlloc.asset_id);

    // Log Activity
    await supabase.from('activity_logs').insert([
      {
        user_id: currentUser?.id,
        action: 'Approve Transfer',
        details: `Approved transfer of asset ${transferAlloc.asset?.tag} to user ${transferAlloc.user?.name}`,
      }
    ]);

    setSuccessMsg('Transfer approved and asset reallocated!');
    setLoading(false);
    fetchData();
  };

  // Reject Transfer
  const handleRejectTransfer = async (transferAlloc: any) => {
    setLoading(true);
    
    await supabase.from('allocations').update({
      status: 'transfer_rejected',
      returned_at: new Date().toISOString()
    }).eq('id', transferAlloc.id);

    // Log Activity
    await supabase.from('activity_logs').insert([
      {
        user_id: currentUser?.id,
        action: 'Reject Transfer',
        details: `Rejected transfer of asset ${transferAlloc.asset?.tag} to user ${transferAlloc.user?.name}`,
      }
    ]);

    setSuccessMsg('Transfer request rejected.');
    setLoading(false);
    fetchData();
  };

  // Filter lists
  const activeAllocations = allocations.filter(a => !a.returned_at && a.status === 'active');
  const pendingTransfers = allocations.filter(a => a.status === 'transfer_pending');

  const isManagerOrHead = currentUser?.role === 'admin' || currentUser?.role === 'asset_manager' || currentUser?.role === 'department_head';

  return (
    <div className="container mx-auto py-6 px-4 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Asset Allocations & Transfers</h1>
        <p className="text-gray-500">Assign hardware assets to employees or process department transfer workflow controls.</p>
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

      <Tabs defaultValue="new-allocation" className="space-y-6">
        <TabsList>
          <TabsTrigger value="new-allocation">Allocate / Transfer</TabsTrigger>
          <TabsTrigger value="active-allocations">Active Custody</TabsTrigger>
          <TabsTrigger value="pending-transfers" className="relative">
            Pending Transfers
            {pendingTransfers.length > 0 && (
              <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {pendingTransfers.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new-allocation">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Allocation Form */}
            <Card className="md:col-span-1 border border-gray-200 shadow-xs">
              <CardHeader>
                <CardTitle>Allocate Asset</CardTitle>
                <CardDescription>Issue an available asset to a team member.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAllocate} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="asset">Select Asset</Label>
                    <Select onValueChange={(val) => handleAssetSelect(val || '')} value={selectedAssetId}>
                      <SelectTrigger id="asset">
                        <SelectValue placeholder="Choose asset..." />
                      </SelectTrigger>
                      <SelectContent>
                        {assets.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} ({a.tag}) - {a.status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {conflictError && (
                    <div className="p-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                      <p className="font-semibold">{conflictError}</p>
                      <p className="text-xs">You can request a transfer of custody to your target user instead.</p>
                      <Button type="button" size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white border-none mt-1" onClick={handleRequestTransfer} disabled={loading || !selectedUserId}>
                        Request Transfer Request
                      </Button>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="user">Allocate To Employee</Label>
                    <Select onValueChange={(val) => setSelectedUserId(val || '')} value={selectedUserId}>
                      <SelectTrigger id="user">
                        <SelectValue placeholder="Choose employee..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} ({u.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="department">Assign to Department (Optional)</Label>
                    <Select onValueChange={(val) => setSelectedDeptId(val || '')} value={selectedDeptId}>
                      <SelectTrigger id="department">
                        <SelectValue placeholder="Choose department..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned / Personal</SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="returnDate">Expected Return Date (Optional)</Label>
                    <Input id="returnDate" type="datetime-local" value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)} className="bg-white text-black" />
                  </div>

                  {!conflictAlloc && (
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                      Issue Allocation
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Quick Flowchart instructions */}
            <Card className="md:col-span-2 border border-gray-200 shadow-xs bg-gray-50/30 p-6 flex flex-col justify-center">
              <h3 className="font-bold text-gray-900 text-lg mb-3">Asset Allocation Rules</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-2">
                  <Badge variant="outline" className="h-5 w-5 rounded-full flex items-center justify-center p-0 font-bold border-gray-300">1</Badge>
                  <span><strong>Available Check:</strong> Assets can only be directly allocated when they are in the <strong>Available</strong> state.</span>
                </li>
                <li className="flex gap-2">
                  <Badge variant="outline" className="h-5 w-5 rounded-full flex items-center justify-center p-0 font-bold border-gray-300">2</Badge>
                  <span><strong>Double Allocation Prevention:</strong> If the asset is currently allocated, the system blocks direct checkout to prevent duplicate inventory mappings.</span>
                </li>
                <li className="flex gap-2">
                  <Badge variant="outline" className="h-5 w-5 rounded-full flex items-center justify-center p-0 font-bold border-gray-300">3</Badge>
                  <span><strong>Transfer Pipeline:</strong> Requesting a transfer sends a notification to managers to review and finalize department reassignments, maintaining strict chain of custody logs.</span>
                </li>
              </ul>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="active-allocations">
          <Card className="border border-gray-200 shadow-xs bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Tag</TableHead>
                  <TableHead>Asset Name</TableHead>
                  <TableHead>Custodian (Employee)</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Allocation Date</TableHead>
                  <TableHead>Expected Return</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeAllocations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-gray-500 italic">No active asset allocations recorded.</TableCell>
                  </TableRow>
                ) : (
                  activeAllocations.map((alloc) => (
                    <TableRow key={alloc.id}>
                      <TableCell className="font-semibold text-blue-600">{alloc.asset?.tag}</TableCell>
                      <TableCell className="font-medium text-gray-900">{alloc.asset?.name}</TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900">{alloc.user?.name}</div>
                        <div className="text-xs text-gray-500">{alloc.user?.email}</div>
                      </TableCell>
                      <TableCell>{alloc.department?.name || '-'}</TableCell>
                      <TableCell>{new Date(alloc.allocated_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {alloc.expected_return_date ? (
                          <span className={new Date(alloc.expected_return_date) < new Date() ? 'text-red-600 font-bold' : 'text-gray-900'}>
                            {new Date(alloc.expected_return_date).toLocaleDateString()}
                          </span>
                        ) : 'No limit'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="pending-transfers">
          <Card className="border border-gray-200 shadow-xs bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Tag</TableHead>
                  <TableHead>Asset Name</TableHead>
                  <TableHead>Target Custodian</TableHead>
                  <TableHead>Proposed Dept</TableHead>
                  <TableHead>Request Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingTransfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-gray-500 italic">No pending transfer requests.</TableCell>
                  </TableRow>
                ) : (
                  pendingTransfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-semibold text-blue-600">{transfer.asset?.tag}</TableCell>
                      <TableCell className="font-medium text-gray-900">{transfer.asset?.name}</TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900">{transfer.user?.name}</div>
                        <div className="text-xs text-gray-500">{transfer.user?.email}</div>
                      </TableCell>
                      <TableCell>{transfer.department?.name || '-'}</TableCell>
                      <TableCell>{new Date(transfer.allocated_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-semibold border capitalize">
                          {transfer.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {isManagerOrHead ? (
                          <>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApproveTransfer(transfer)} disabled={loading}>
                              Approve
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleRejectTransfer(transfer)} disabled={loading}>
                              Reject
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Review Restricted</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
