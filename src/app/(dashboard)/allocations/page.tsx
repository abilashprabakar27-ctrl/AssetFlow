'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ArrowLeftRight, Check, X, RotateCcw } from 'lucide-react';
import Link from 'next/link';

interface Asset {
  id: string;
  tag: string;
  name: string;
  status: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

interface Department {
  id: string;
  name: string;
}

interface AllocationWithRelations {
  id: string;
  asset_id: string;
  employee_id: string | null;
  department_id: string | null;
  allocated_date: string;
  expected_return_date: string | null;
  actual_return_date: string | null;
  status: string;
  condition_notes: string | null;
  assets: { name: string; tag: string } | null;
  users: { name: string } | null;
  departments: { name: string } | null;
}

interface TransferRequestWithRelations {
  id: string;
  asset_id: string;
  requesting_employee_id: string | null;
  target_department_id: string | null;
  status: string;
  created_at: string;
  assets: { name: string; tag: string } | null;
  users: { name: string } | null;
  departments: { name: string } | null;
}

function AllocationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assetIdParam = searchParams.get('assetId');
  const supabase = createClient();

  // Master lists
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeAllocations, setActiveAllocations] = useState<AllocationWithRelations[]>([]);
  const [transferRequests, setTransferRequests] = useState<TransferRequestWithRelations[]>([]);

  // Selection states
  const [selectedAssetId, setSelectedAssetId] = useState<string>(assetIdParam || '');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>('');
  
  // Checking/Verification state
  const [currentActiveAllocation, setCurrentActiveAllocation] = useState<AllocationWithRelations | null>(null);

  // Return Flow modal/state
  const [returningAllocation, setReturningAllocation] = useState<AllocationWithRelations | null>(null);
  const [conditionNotes, setConditionNotes] = useState<string>('good');

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Load initial master data
  useEffect(() => {
    const loadMasterData = async () => {
      setLoading(true);
      try {
        const [assetRes, userRes, deptRes] = await Promise.all([
          supabase.from('assets').select('id, tag, name, status'),
          supabase.from('users').select('id, name, email').eq('status', 'active'),
          supabase.from('departments').select('id, name').eq('status', 'active'),
        ]);

        if (assetRes.data) setAssets(assetRes.data);
        if (userRes.data) setEmployees(userRes.data);
        if (deptRes.data) setDepartments(deptRes.data);
      } catch (err) {
        console.error('Error loading master data', err);
      } finally {
        setLoading(false);
      }
    };

    loadMasterData();
  }, [supabase]);

  // Load allocations and transfer requests
  const loadDynamicData = async () => {
    try {
      const [allocRes, reqRes] = await Promise.all([
        supabase
          .from('allocations')
          .select(`
            *,
            assets (name, tag),
            users (name),
            departments (name)
          `)
          .order('allocated_date', { ascending: false }),
        supabase
          .from('transfer_requests')
          .select(`
            *,
            assets (name, tag),
            users (name),
            departments (name)
          `)
          .order('created_at', { ascending: false }),
      ]);

      if (allocRes.data) setActiveAllocations(allocRes.data as unknown as AllocationWithRelations[]);
      if (reqRes.data) setTransferRequests(reqRes.data as unknown as TransferRequestWithRelations[]);
    } catch (err) {
      console.error('Error loading allocations/requests', err);
    }
  };

  useEffect(() => {
    loadDynamicData();
  }, [supabase]);

  // Conflict block check: when selected asset changes, see if it is already allocated
  useEffect(() => {
    if (!selectedAssetId) {
      setCurrentActiveAllocation(null);
      return;
    }

    const activeAlloc = activeAllocations.find(
      (alloc) => alloc.asset_id === selectedAssetId && alloc.status === 'active'
    );
    setCurrentActiveAllocation(activeAlloc || null);
  }, [selectedAssetId, activeAllocations]);

  // Handle standard allocation
  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !selectedEmployeeId || !selectedDeptId) {
      setError('Please select an asset, employee, and department.');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      // 1. Double check conflict one more time
      const { data: checkAlloc } = await supabase
        .from('allocations')
        .select('*')
        .eq('asset_id', selectedAssetId)
        .eq('status', 'active')
        .maybeSingle();

      if (checkAlloc) {
        throw new Error('This asset has just been allocated to another user.');
      }

      // 2. Insert new allocation
      const { error: allocErr } = await supabase.from('allocations').insert({
        asset_id: selectedAssetId,
        employee_id: selectedEmployeeId,
        department_id: selectedDeptId,
        expected_return_date: expectedReturnDate || null,
        status: 'active',
      });

      if (allocErr) throw allocErr;

      // 3. Update asset status
      const { error: assetErr } = await supabase
        .from('assets')
        .update({ status: 'allocated', department_id: selectedDeptId })
        .eq('id', selectedAssetId);

      if (assetErr) throw assetErr;

      setSuccess('Asset allocated successfully!');
      // Clear selection
      setSelectedAssetId('');
      setSelectedEmployeeId('');
      setSelectedDeptId('');
      setExpectedReturnDate('');
      loadDynamicData();
    } catch (err: any) {
      setError(err.message || 'Failed to allocate asset.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Return action
  const handleReturnSubmit = async () => {
    if (!returningAllocation) return;
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      // 1. Close allocation
      const { error: allocErr } = await supabase
        .from('allocations')
        .update({
          status: 'returned',
          actual_return_date: new Date().toISOString(),
          condition_notes: conditionNotes,
        })
        .eq('id', returningAllocation.id);

      if (allocErr) throw allocErr;

      // 2. Set asset status back to available and clear department reference
      const { error: assetErr } = await supabase
        .from('assets')
        .update({ status: 'available', department_id: null })
        .eq('id', returningAllocation.asset_id);

      if (assetErr) throw assetErr;

      setSuccess('Asset marked as returned successfully!');
      setReturningAllocation(null);
      loadDynamicData();
    } catch (err: any) {
      setError(err.message || 'Failed to return asset.');
    } finally {
      setActionLoading(false);
    }
  };

  // Request Transfer Request
  const handleRequestTransfer = async () => {
    if (!selectedAssetId || !selectedEmployeeId || !selectedDeptId) {
      setError('Please fill in the requesting employee and target department fields first.');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error: reqErr } = await supabase.from('transfer_requests').insert({
        asset_id: selectedAssetId,
        requesting_employee_id: selectedEmployeeId,
        target_department_id: selectedDeptId,
        status: 'pending',
      });

      if (reqErr) throw reqErr;

      setSuccess('Transfer request submitted successfully!');
      loadDynamicData();
    } catch (err: any) {
      setError(err.message || 'Failed to create transfer request.');
    } finally {
      setActionLoading(false);
    }
  };

  // Approve Transfer Flow
  const handleApproveTransfer = async (request: TransferRequestWithRelations) => {
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      // 1. Find and close current active allocation
      const { data: activeAlloc, error: allocFindErr } = await supabase
        .from('allocations')
        .select('id')
        .eq('asset_id', request.asset_id)
        .eq('status', 'active')
        .maybeSingle();

      if (allocFindErr) throw allocFindErr;

      if (activeAlloc) {
        const { error: closeErr } = await supabase
          .from('allocations')
          .update({
            status: 'returned',
            actual_return_date: new Date().toISOString(),
            condition_notes: 'Closed via Approved Transfer',
          })
          .eq('id', activeAlloc.id);

        if (closeErr) throw closeErr;
      }

      // 2. Open new allocation to transfer recipient
      const { error: openErr } = await supabase.from('allocations').insert({
        asset_id: request.asset_id,
        employee_id: request.requesting_employee_id,
        department_id: request.target_department_id,
        status: 'active',
      });

      if (openErr) throw openErr;

      // 3. Update asset ownership and department
      const { error: assetErr } = await supabase
        .from('assets')
        .update({
          status: 'allocated',
          department_id: request.target_department_id,
        })
        .eq('id', request.asset_id);

      if (assetErr) throw assetErr;

      // 4. Set transfer request to Approved
      const { error: reqErr } = await supabase
        .from('transfer_requests')
        .update({ status: 'approved' })
        .eq('id', request.id);

      if (reqErr) throw reqErr;

      setSuccess('Transfer approved and asset re-allocated!');
      loadDynamicData();
    } catch (err: any) {
      setError(err.message || 'Failed to approve transfer.');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Transfer Flow
  const handleRejectTransfer = async (requestId: string) => {
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('transfer_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      setSuccess('Transfer request rejected.');
      loadDynamicData();
    } catch (err: any) {
      setError(err.message || 'Failed to reject transfer.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto py-20 text-center text-gray-500">Loading allocations module...</div>;
  }

  return (
    <div className="container mx-auto py-10 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Allocations & Transfers</h1>
        <p className="text-gray-500">Manage asset ownership, returns, and transfer requests.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 text-green-700 text-sm rounded-md border border-green-200">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Core Centerpiece Allocation Form */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-indigo-100 shadow-md">
            <CardHeader className="bg-indigo-50/50">
              <CardTitle className="text-indigo-950">Allocate Asset</CardTitle>
              <CardDescription>Assign an available asset to an employee.</CardDescription>
            </CardHeader>
            <form onSubmit={handleAllocate}>
              <CardContent className="space-y-4 pt-6">
                
                {/* 1. Select Asset */}
                <div className="space-y-1">
                  <Label htmlFor="assetSelect">Select Asset *</Label>
                  <Select value={selectedAssetId} onValueChange={(val) => setSelectedAssetId(val || '')}>
                    <SelectTrigger id="assetSelect">
                      <SelectValue placeholder="Choose an asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          [{asset.tag}] {asset.name} ({asset.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Conflict Alert block banner */}
                {currentActiveAllocation && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg space-y-3">
                    <div className="flex gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                      <div className="text-sm">
                        <span className="font-bold">Conflict:</span> This asset is currently active!
                        <div className="mt-1">
                          Allocated to <span className="font-semibold">{currentActiveAllocation.users?.name || 'Unknown'}</span> ({currentActiveAllocation.departments?.name || 'No Dept'}).
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="w-full flex items-center justify-center gap-1.5"
                      onClick={handleRequestTransfer}
                      disabled={actionLoading}
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                      Request Transfer
                    </Button>
                  </div>
                )}

                {/* 3. Recipient Selection */}
                <div className="space-y-1">
                  <Label htmlFor="employeeSelect">Recipient Employee *</Label>
                  <Select value={selectedEmployeeId} onValueChange={(val) => setSelectedEmployeeId(val || '')}>
                    <SelectTrigger id="employeeSelect">
                      <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name} ({emp.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="deptSelect">Target Department *</Label>
                  <Select value={selectedDeptId} onValueChange={(val) => setSelectedDeptId(val || '')}>
                    <SelectTrigger id="deptSelect">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="expectedDate">Expected Return Date</Label>
                  <Input
                    id="expectedDate"
                    type="date"
                    value={expectedReturnDate}
                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                  />
                </div>
              </CardContent>

              <CardFooter className="bg-gray-50 border-t py-4 flex justify-end gap-2">
                <Button
                  type="submit"
                  disabled={!!currentActiveAllocation || actionLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Allocate
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Return flow condition prompt */}
          {returningAllocation && (
            <Card className="border-amber-200 bg-amber-50/20 shadow-md">
              <CardHeader className="bg-amber-100/40">
                <CardTitle className="text-amber-900 flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Process Return
                </CardTitle>
                <CardDescription>
                  Marking return for <span className="font-bold">{returningAllocation.assets?.name}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1">
                  <Label>Asset Condition on Return</Label>
                  <Select value={conditionNotes} onValueChange={(val) => setConditionNotes(val || 'good')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Good / Working</SelectItem>
                      <SelectItem value="minor_damage">Minor Damage</SelectItem>
                      <SelectItem value="needs_maintenance">Needs Maintenance</SelectItem>
                      <SelectItem value="damaged">Damaged / Broken</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-4">
                <Button variant="ghost" size="sm" onClick={() => setReturningAllocation(null)}>
                  Cancel
                </Button>
                <Button variant="outline" size="sm" onClick={handleReturnSubmit} disabled={actionLoading}>
                  Confirm Return
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        {/* Dynamic tables for history and transfers */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Transfer Requests Panel */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Transfer Requests</CardTitle>
                <CardDescription>Pending transfers awaiting approval.</CardDescription>
              </div>
              <Badge variant="outline" className="border-indigo-200 text-indigo-700">
                Active Requests
              </Badge>
            </CardHeader>
            <CardContent>
              {transferRequests.filter((r) => r.status === 'pending').length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-500">No pending transfer requests.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Requesting Employee</TableHead>
                      <TableHead>Target Dept</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transferRequests.filter((r) => r.status === 'pending').map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">
                          {req.assets?.name}
                          <span className="text-xs text-gray-400 block font-mono">{req.assets?.tag}</span>
                        </TableCell>
                        <TableCell>{req.users?.name}</TableCell>
                        <TableCell>{req.departments?.name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRejectTransfer(req.id)}
                              disabled={actionLoading}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApproveTransfer(req)}
                              disabled={actionLoading}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Allocation Logs and Return Trigger */}
          <Card>
            <CardHeader>
              <CardTitle>Active Allocations Log</CardTitle>
              <CardDescription>Current list of allocations and return states.</CardDescription>
            </CardHeader>
            <CardContent>
              {activeAllocations.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-500">No allocations logged.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Expected Return</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeAllocations.map((alloc) => (
                      <TableRow key={alloc.id}>
                        <TableCell>
                          <span className="font-bold">{alloc.assets?.name}</span>
                          <span className="font-mono text-xs block text-gray-400">{alloc.assets?.tag}</span>
                        </TableCell>
                        <TableCell>
                          {alloc.users?.name}
                          <span className="text-xs text-gray-400 block">{alloc.departments?.name}</span>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {new Date(alloc.allocated_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {alloc.expected_return_date
                            ? new Date(alloc.expected_return_date).toLocaleDateString()
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={alloc.status === 'active' ? 'default' : 'secondary'}>
                            {alloc.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {alloc.status === 'active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setReturningAllocation(alloc);
                                setConditionNotes('good');
                              }}
                            >
                              Mark Returned
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

export default function AllocationsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-20 text-center text-gray-500">Loading allocations module...</div>}>
      <AllocationsContent />
    </Suspense>
  );
}
