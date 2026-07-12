'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Department, AssetCategory, User } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Layers, 
  Users, 
  PlusCircle, 
  ShieldAlert,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

const deptSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  parent_dept_id: z.string().optional(),
  status: z.string(),
});

type DeptFormValues = z.infer<typeof deptSchema>;

const catSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  custom_fields: z.string(),
  status: z.string(),
});

type CatFormValues = z.infer<typeof catSchema>;

export default function OrgSetupPage() {
  const supabase = createClient();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Data lists
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);

  // Editing state
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editingCat, setEditingCat] = useState<AssetCategory | null>(null);
  const [isDeptOpen, setIsDeptOpen] = useState(false);
  const [isCatOpen, setIsCatOpen] = useState(false);

  const deptForm = useForm<DeptFormValues>({
    resolver: zodResolver(deptSchema),
    defaultValues: { name: '', code: '', parent_dept_id: '', status: 'active' }
  });

  const catForm = useForm<CatFormValues>({
    resolver: zodResolver(catSchema),
    defaultValues: { name: '', description: '', custom_fields: '{}', status: 'active' }
  });

  const fetchData = useCallback(async () => {
    // Check if user is Admin
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
    if (!profile || profile.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    setCurrentUser(profile);
    setLoadingProfile(false);

    // Fetch lists
    const { data: depts } = await supabase.from('departments').select('*');
    if (depts) setDepartments(depts);

    const { data: cats } = await supabase.from('asset_categories').select('*');
    if (cats) setCategories(cats);

    const { data: emps } = await supabase.from('users').select('*');
    if (emps) setEmployees(emps);
  }, [supabase, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onDeptSubmit = async (values: DeptFormValues) => {
    const payload = {
      name: values.name,
      code: values.code,
      parent_dept_id: values.parent_dept_id || null,
      status: values.status,
    };
    let resError;
    if (editingDept) {
      const { error } = await supabase.from('departments').update(payload).eq('id', editingDept.id);
      resError = error;
    } else {
      const { error } = await supabase.from('departments').insert([payload]);
      resError = error;
    }
    if (resError) {
      alert('Database Error: ' + resError.message);
      return;
    }
    setEditingDept(null);
    setIsDeptOpen(false);
    deptForm.reset();
    fetchData();
  };

  const onCatSubmit = async (values: CatFormValues) => {
    let parsedFields = {};
    try {
      parsedFields = JSON.parse(values.custom_fields || '{}');
    } catch {
      catForm.setError('custom_fields', { message: 'Invalid JSON format' });
      return;
    }
    const payload = {
      name: values.name,
      description: values.description || null,
      custom_fields: parsedFields,
      status: values.status,
    };
    let resError;
    if (editingCat) {
      const { error } = await supabase.from('asset_categories').update(payload).eq('id', editingCat.id);
      resError = error;
    } else {
      const { error } = await supabase.from('asset_categories').insert([payload]);
      resError = error;
    }
    if (resError) {
      alert('Database Error: ' + resError.message);
      return;
    }
    setEditingCat(null);
    setIsCatOpen(false);
    catForm.reset();
    fetchData();
  };

  const promoteEmployee = async (id: string, role: 'department_head' | 'asset_manager' | 'employee') => {
    const { error } = await supabase.from('users').update({ role }).eq('id', id);
    if (error) {
      alert('Database Error: ' + error.message);
      return;
    }
    fetchData();
  };

  if (loadingProfile) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <span className="h-8 w-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-200 dark:border-red-800/30',
    asset_manager: 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200 dark:border-blue-800/30',
    department_head: 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border-purple-200 dark:border-purple-800/30',
    employee: 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border-green-200 dark:border-green-800/30',
  };

  const statusStyles: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30',
    inactive: 'bg-zinc-50 text-zinc-700 dark:bg-zinc-950/20 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800/30',
  };

  return (
    <div className="relative min-h-screen p-6 lg:p-8 space-y-8 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-5%] right-[-5%] w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-animated shadow-glow-blue flex-shrink-0">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-zinc-50">Organization Setup</h1>
            <p className="text-muted-foreground text-sm mt-1">Configure your departments, custom asset category fields, and employee promotions.</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="departments" className="space-y-6">
        <TabsList className="bg-gray-100 dark:bg-zinc-900 p-1 rounded-xl">
          <TabsTrigger value="departments" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all"><Building2 className="h-4 w-4" /> Departments</TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all"><Layers className="h-4 w-4" /> Categories</TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all"><Users className="h-4 w-4" /> Employee Promotion</TabsTrigger>
        </TabsList>

        {/* Tab A: Departments */}
        <TabsContent value="departments" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Departments Directory</h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Establish cost centers and hierarchy chains.</p>
            </div>
            
            <Dialog open={isDeptOpen} onOpenChange={(open) => { setIsDeptOpen(open); if (!open) setEditingDept(null); }}>
              <DialogTrigger>
                <Button 
                  onClick={() => { deptForm.reset({ name: '', code: '', parent_dept_id: '', status: 'active' }); setEditingDept(null); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 text-xs flex items-center gap-1.5 shadow-sm rounded-xl"
                >
                  <PlusCircle className="h-4 w-4" /> Add Department
                </Button>
              </DialogTrigger>
              <DialogContent className="dark:bg-zinc-900 dark:border-zinc-800">
                <DialogHeader>
                  <DialogTitle className="text-lg font-extrabold text-gray-900 dark:text-zinc-100">
                    {editingDept ? 'Edit Department' : 'Create Department'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={deptForm.handleSubmit(onDeptSubmit)} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="dept-name" className="text-xs font-semibold">Name</Label>
                    <Input id="dept-name" placeholder="e.g. Engineering" {...deptForm.register('name')} className="dark:bg-zinc-950 dark:border-zinc-800" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dept-code" className="text-xs font-semibold">Code</Label>
                    <Input id="dept-code" placeholder="e.g. ENG" {...deptForm.register('code')} className="dark:bg-zinc-950 dark:border-zinc-800" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dept-parent" className="text-xs font-semibold">Parent Department</Label>
                    <Select onValueChange={(val) => deptForm.setValue('parent_dept_id', (val === 'none' || !val) ? undefined : val)} defaultValue={(editingDept?.parent_dept_id || undefined) as string | undefined}>
                      <SelectTrigger className="dark:bg-zinc-950 dark:border-zinc-800">
                        <SelectValue placeholder="Select Parent (Optional)" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                        <SelectItem value="none" className="text-xs">No Parent (Top-level)</SelectItem>
                        {departments.filter(d => d.id !== editingDept?.id).map((d) => (
                          <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dept-status" className="text-xs font-semibold">Status</Label>
                    <Select onValueChange={(val) => deptForm.setValue('status', val || 'active')} defaultValue={editingDept?.status || 'active'}>
                      <SelectTrigger className="dark:bg-zinc-950 dark:border-zinc-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                        <SelectItem value="active" className="text-xs">Active</SelectItem>
                        <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full text-white bg-blue-600 hover:bg-blue-700 h-10 font-bold" disabled={deptForm.formState.isSubmitting}>
                    {editingDept ? 'Save Changes' : 'Create Department'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-zinc-900">
                  <TableHead className="w-[100px] font-bold text-xs">Code</TableHead>
                  <TableHead className="font-bold text-xs">Name</TableHead>
                  <TableHead className="font-bold text-xs">Parent Department</TableHead>
                  <TableHead className="font-bold text-xs">Employees</TableHead>
                  <TableHead className="font-bold text-xs">Status</TableHead>
                  <TableHead className="text-right font-bold text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-gray-400 dark:text-zinc-500 italic">No departments registered yet.</TableCell>
                  </TableRow>
                ) : (
                  departments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400">{dept.code}</TableCell>
                      <TableCell className="font-semibold text-gray-900 dark:text-zinc-200">{dept.name}</TableCell>
                      <TableCell className="text-gray-500 dark:text-zinc-400">{departments.find(d => d.id === dept.parent_dept_id)?.name || '-'}</TableCell>
                      <TableCell className="text-gray-500 dark:text-zinc-400">{dept.employee_count ?? 0}</TableCell>
                      <TableCell>
                        <Badge className={cn("rounded-md border font-bold text-xs uppercase px-2 py-0.5", statusStyles[dept.status] || '')}>
                          {dept.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="xs" 
                          className="h-7 text-xs rounded-lg shadow-sm border border-gray-200 dark:border-zinc-800 font-semibold"
                          onClick={() => {
                            setEditingDept(dept);
                            deptForm.reset({
                              name: dept.name,
                              code: dept.code,
                              parent_dept_id: dept.parent_dept_id || '',
                              status: dept.status,
                            });
                            setIsDeptOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab B: Categories */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Asset Categories</h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Manage categories and their category-specific data forms (e.g. warranty period for electronics).</p>
            </div>
            
            <Dialog open={isCatOpen} onOpenChange={(open) => { setIsCatOpen(open); if (!open) setEditingCat(null); }}>
              <DialogTrigger>
                <Button 
                  onClick={() => { catForm.reset({ name: '', description: '', custom_fields: '{}', status: 'active' }); setEditingCat(null); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 text-xs flex items-center gap-1.5 shadow-sm rounded-xl"
                >
                  <PlusCircle className="h-4 w-4" /> Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="dark:bg-zinc-900 dark:border-zinc-800">
                <DialogHeader>
                  <DialogTitle className="text-lg font-extrabold text-gray-900 dark:text-zinc-100">
                    {editingCat ? 'Edit Category' : 'Create Category'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={catForm.handleSubmit(onCatSubmit)} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cat-name" className="text-xs font-semibold">Name</Label>
                    <Input id="cat-name" placeholder="e.g. Electronics" {...catForm.register('name')} className="dark:bg-zinc-950 dark:border-zinc-800" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cat-description" className="text-xs font-semibold">Description</Label>
                    <Input id="cat-description" placeholder="e.g. Devices, laptops, servers" {...catForm.register('description')} className="dark:bg-zinc-950 dark:border-zinc-800" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cat-custom" className="text-xs font-semibold">Custom Fields (JSON format)</Label>
                    <Input id="cat-custom" placeholder='e.g. {"warranty_months": 24}' {...catForm.register('custom_fields')} className="dark:bg-zinc-950 dark:border-zinc-800 font-mono text-xs" required />
                    {catForm.formState.errors.custom_fields && (
                      <span className="text-xs text-red-500">{catForm.formState.errors.custom_fields.message}</span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cat-status" className="text-xs font-semibold">Status</Label>
                    <Select onValueChange={(val) => catForm.setValue('status', val || 'active')} defaultValue={editingCat?.status || 'active'}>
                      <SelectTrigger className="dark:bg-zinc-950 dark:border-zinc-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                        <SelectItem value="active" className="text-xs">Active</SelectItem>
                        <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full text-white bg-blue-600 hover:bg-blue-700 h-10 font-bold" disabled={catForm.formState.isSubmitting}>
                    {editingCat ? 'Save Changes' : 'Create Category'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-zinc-900">
                  <TableHead className="font-bold text-xs">Name</TableHead>
                  <TableHead className="font-bold text-xs">Description</TableHead>
                  <TableHead className="font-bold text-xs">Custom Fields Schema</TableHead>
                  <TableHead className="font-bold text-xs">Status</TableHead>
                  <TableHead className="text-right font-bold text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-gray-400 dark:text-zinc-500 italic">No asset categories registered yet.</TableCell>
                  </TableRow>
                ) : (
                  categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-semibold text-gray-900 dark:text-zinc-200">{cat.name}</TableCell>
                      <TableCell className="text-gray-500 dark:text-zinc-400">{cat.description || '-'}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[240px] truncate text-gray-600 dark:text-zinc-400" title={JSON.stringify(cat.custom_fields)}>
                        {JSON.stringify(cat.custom_fields)}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("rounded-md border font-bold text-xs uppercase px-2 py-0.5", statusStyles[cat.status] || '')}>
                          {cat.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="xs" 
                          className="h-7 text-xs rounded-lg shadow-sm border border-gray-200 dark:border-zinc-800 font-semibold"
                          onClick={() => {
                            setEditingCat(cat);
                            catForm.reset({
                              name: cat.name,
                              description: cat.description || '',
                              custom_fields: JSON.stringify(cat.custom_fields),
                              status: cat.status,
                            });
                            setIsCatOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab C: Employees */}
        <TabsContent value="employees" className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Employee Directory & Roles</h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400">Elevate employees to Department Heads or Asset Managers to coordinate custody workflows.</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-zinc-900">
                  <TableHead className="font-bold text-xs">Name</TableHead>
                  <TableHead className="font-bold text-xs">Email</TableHead>
                  <TableHead className="font-bold text-xs">System Role</TableHead>
                  <TableHead className="text-right font-bold text-xs">Actions / Access Promotion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-gray-400 dark:text-zinc-500 italic">No employees found.</TableCell>
                  </TableRow>
                ) : (
                  employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-semibold text-gray-900 dark:text-zinc-200">{emp.name}</TableCell>
                      <TableCell className="text-gray-500 dark:text-zinc-400">{emp.email}</TableCell>
                      <TableCell>
                        <Badge className={cn("rounded-md border font-bold text-xs uppercase px-2.5 py-0.5", roleColors[emp.role] || '')}>
                          {emp.role.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {emp.role !== 'admin' && (
                          <>
                            {emp.role !== 'department_head' ? (
                              <Button 
                                variant="outline" 
                                size="xs" 
                                className="h-7 text-xs rounded-lg shadow-sm border border-gray-200 dark:border-zinc-800 font-semibold"
                                onClick={() => promoteEmployee(emp.id, 'department_head')}
                              >
                                Promote to Head
                              </Button>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="xs" 
                                className="h-7 text-xs rounded-lg shadow-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-950/20 font-semibold"
                                onClick={() => promoteEmployee(emp.id, 'employee')}
                              >
                                Demote to Employee
                              </Button>
                            )}

                            {emp.role !== 'asset_manager' ? (
                              <Button 
                                variant="outline" 
                                size="xs" 
                                className="h-7 text-xs rounded-lg shadow-sm border border-gray-200 dark:border-zinc-800 font-semibold"
                                onClick={() => promoteEmployee(emp.id, 'asset_manager')}
                              >
                                Promote to Manager
                              </Button>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="xs" 
                                className="h-7 text-xs rounded-lg shadow-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-950/20 font-semibold"
                                onClick={() => promoteEmployee(emp.id, 'employee')}
                              >
                                Demote to Employee
                              </Button>
                            )}
                          </>
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
    </div>
  );
}
