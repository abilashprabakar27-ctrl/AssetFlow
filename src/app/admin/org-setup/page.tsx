'use client';
import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Department, AssetCategory, User } from '@/lib/types';
const deptSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  parent_dept_id: z.string().optional(),
  status: z.string(),
});
type DeptFormValues = z.infer<typeof deptSchema>;
const catSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  custom_fields: z.string(),
  status: z.string(),
});
type CatFormValues = z.infer<typeof catSchema>;
export default function OrgSetupPage() {
  const supabase = createClient();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
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
    const { data: depts } = await supabase.from('departments').select('*');
    if (depts) setDepartments(depts);
    const { data: cats } = await supabase.from('asset_categories').select('*');
    if (cats) setCategories(cats);
    const { data: emps } = await supabase.from('users').select('*');
    if (emps) setEmployees(emps);
  }, [supabase]);
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
    if (editingDept) {
      await supabase.from('departments').update(payload).eq('id', editingDept.id);
    } else {
      await supabase.from('departments').insert([payload]);
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
      catForm.setError('custom_fields', { message: 'Invalid JSON' });
      return;
    }
    const payload = {
      name: values.name,
      description: values.description || null,
      custom_fields: parsedFields,
      status: values.status,
    };
    if (editingCat) {
      await supabase.from('asset_categories').update(payload).eq('id', editingCat.id);
    } else {
      await supabase.from('asset_categories').insert([payload]);
    }
    setEditingCat(null);
    setIsCatOpen(false);
    catForm.reset();
    fetchData();
  };
  const promoteEmployee = async (id: string, role: 'department_head' | 'asset_manager') => {
    await supabase.from('users').update({ role }).eq('id', id);
    fetchData();
  };
  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8">Organization Setup</h1>
      <Tabs defaultValue="departments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
        </TabsList>
        <TabsContent value="departments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Departments</h2>
            <Dialog open={isDeptOpen} onOpenChange={(open) => { setIsDeptOpen(open); if (!open) setEditingDept(null); }}>
              <DialogTrigger render={
                <Button onClick={() => { deptForm.reset({ name: '', code: '', parent_dept_id: '', status: 'active' }); setEditingDept(null); }}>Add Department</Button>
              } />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingDept ? 'Edit Department' : 'Add Department'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={deptForm.handleSubmit(onDeptSubmit)} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="dept-name">Name</Label>
                    <Input id="dept-name" {...deptForm.register('name')} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dept-code">Code</Label>
                    <Input id="dept-code" {...deptForm.register('code')} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dept-parent">Parent Department</Label>
                    <Select onValueChange={(val) => deptForm.setValue('parent_dept_id', val === null ? undefined : val)} defaultValue={editingDept?.parent_dept_id || ''}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Parent (Optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.filter(d => d.id !== editingDept?.id).map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dept-status">Status</Label>
                    <Select onValueChange={(val) => deptForm.setValue('status', val || 'active')} defaultValue={editingDept?.status || 'active'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">Save</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Parent Department</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.code}</TableCell>
                  <TableCell>{dept.name}</TableCell>
                  <TableCell>{departments.find(d => d.id === dept.parent_dept_id)?.name || '-'}</TableCell>
                  <TableCell>{dept.employee_count}</TableCell>
                  <TableCell>{dept.status}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => {
                      setEditingDept(dept);
                      deptForm.reset({
                        name: dept.name,
                        code: dept.code,
                        parent_dept_id: dept.parent_dept_id || '',
                        status: dept.status,
                      });
                      setIsDeptOpen(true);
                    }}>Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Asset Categories</h2>
            <Dialog open={isCatOpen} onOpenChange={(open) => { setIsCatOpen(open); if (!open) setEditingCat(null); }}>
              <DialogTrigger render={
                <Button onClick={() => { catForm.reset({ name: '', description: '', custom_fields: '{}', status: 'active' }); setEditingCat(null); }}>Add Category</Button>
              } />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCat ? 'Edit Category' : 'Add Category'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={catForm.handleSubmit(onCatSubmit)} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="cat-name">Name</Label>
                    <Input id="cat-name" {...catForm.register('name')} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cat-description">Description</Label>
                    <Input id="cat-description" {...catForm.register('description')} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cat-custom">Custom Fields (JSON)</Label>
                    <Input id="cat-custom" {...catForm.register('custom_fields')} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cat-status">Status</Label>
                    <Select onValueChange={(val) => catForm.setValue('status', val || 'active')} defaultValue={editingCat?.status || 'active'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">Save</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Custom Fields</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell>{cat.description || '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{JSON.stringify(cat.custom_fields)}</TableCell>
                  <TableCell>{cat.status}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => {
                      setEditingCat(cat);
                      catForm.reset({
                        name: cat.name,
                        description: cat.description || '',
                        custom_fields: JSON.stringify(cat.custom_fields),
                        status: cat.status,
                      });
                      setIsCatOpen(true);
                    }}>Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="employees" className="space-y-4">
          <h2 className="text-xl font-semibold">Employees</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell>{emp.email}</TableCell>
                  <TableCell className="capitalize">{emp.role.replace('_', ' ')}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {emp.role !== 'department_head' && (
                      <Button variant="outline" size="sm" onClick={() => promoteEmployee(emp.id, 'department_head')}>Promote to Head</Button>
                    )}
                    {emp.role !== 'asset_manager' && (
                      <Button variant="outline" size="sm" onClick={() => promoteEmployee(emp.id, 'asset_manager')}>Promote to Manager</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
