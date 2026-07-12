'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AssetCategory, Department } from '@/lib/types';

interface AssetWithRelations {
  id: string;
  tag: string;
  name: string;
  category_id: string | null;
  department_id: string | null;
  serial_number: string | null;
  acquisition_date: string;
  acquisition_cost: number;
  condition: string;
  location: string | null;
  is_bookable: boolean;
  status: string;
  asset_categories: { id: string; name: string } | null;
  departments: { id: string; name: string } | null;
}

export default function AssetDirectoryPage() {
  const supabase = createClient();
  const [assets, setAssets] = useState<AssetWithRelations[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  
  const [loading, setLoading] = useState(true);

  // Status mapping to color badges
  const statusBadges: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    available: "secondary", // green/blue in CSS
    allocated: "default", // dark grey
    reserved: "outline", // bordered
    under_maintenance: "destructive", // red
    lost: "destructive",
    retired: "outline",
    disposed: "outline",
  };

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [catRes, deptRes] = await Promise.all([
          supabase.from('asset_categories').select('*').eq('status', 'active'),
          supabase.from('departments').select('*').eq('status', 'active'),
        ]);

        if (catRes.data) setCategories(catRes.data);
        if (deptRes.data) setDepartments(deptRes.data);
      } catch (err) {
        console.error('Error loading filters', err);
      }
    };
    loadFilters();
  }, [supabase]);

  useEffect(() => {
    const loadAssets = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('assets')
          .select(`
            *,
            asset_categories (id, name),
            departments (id, name)
          `);

        const { data, error } = await query;
        if (error) throw error;
        setAssets((data as unknown as AssetWithRelations[]) || []);
      } catch (err) {
        console.error('Error loading assets', err);
      } finally {
        setLoading(false);
      }
    };

    loadAssets();
  }, [supabase]);

  // Filter logic on client-side to make interactions lightning fast
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      asset.tag.toLowerCase().includes(search.toLowerCase()) ||
      (asset.serial_number && asset.serial_number.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = selectedCategory === 'ALL' || asset.category_id === selectedCategory;
    const matchesStatus = selectedStatus === 'ALL' || asset.status === selectedStatus;
    const matchesDept = selectedDept === 'ALL' || asset.department_id === selectedDept;

    return matchesSearch && matchesCategory && matchesStatus && matchesDept;
  });

  return (
    <div className="container mx-auto py-10 px-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asset Directory</h1>
          <p className="text-gray-500">Search and filter physical resources in the organization.</p>
        </div>
        <Link href="/assets/register">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
            Register Asset
          </Button>
        </Link>
      </div>

      {/* Modern Filter panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Search</label>
          <Input
            placeholder="Search by tag, name, serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Category</label>
          <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val || 'ALL')}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Status</label>
          <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val || 'ALL')}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
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
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Department</label>
          <Select value={selectedDept} onValueChange={(val) => setSelectedDept(val || 'ALL')}>
            <SelectTrigger>
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-500 text-sm">
            Loading assets...
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="py-20 text-center text-gray-500 text-sm">
            No assets found matching the filter criteria.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Tag</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Bookable</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.map((asset) => (
                <TableRow key={asset.id} className="hover:bg-gray-50/50">
                  <TableCell className="font-mono font-bold text-indigo-600 text-sm">
                    {asset.tag}
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">
                    <div>
                      {asset.name}
                      {asset.serial_number && (
                        <span className="text-xs text-gray-400 block font-mono">
                          SN: {asset.serial_number}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {asset.asset_categories?.name || 'Uncategorized'}
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">
                    {asset.location || '—'}
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">
                    {asset.departments?.name || 'Not assigned'}
                  </TableCell>
                  <TableCell>
                    {asset.is_bookable ? (
                      <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50/30">
                        Yes
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">No</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadges[asset.status] || "outline"} className="capitalize">
                      {asset.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/allocations?assetId=${asset.id}`}>
                      <Button variant="outline" size="sm" className="hover:text-indigo-600 hover:border-indigo-200">
                        Manage
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
