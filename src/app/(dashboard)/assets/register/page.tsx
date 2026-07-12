'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AssetCategory } from '@/lib/types';
import Link from 'next/link';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  categoryId: z.string().min(1, 'Category is required'),
  serialNumber: z.string().optional(),
  acquisitionDate: z.string().min(1, 'Acquisition date is required'),
  acquisitionCost: z.coerce.number().min(0, 'Cost must be 0 or greater'),
  condition: z.enum(['new', 'good', 'fair', 'poor']),
  location: z.string().optional(),
  isBookable: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export default function RegisterAssetPage() {
  const router = useRouter();
  const supabase = createClient();
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [generatedTag, setGeneratedTag] = useState<string>('Loading...');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      condition: 'good',
      isBookable: false,
    },
  });

  const isBookableValue = watch('isBookable');

  useEffect(() => {
    const loadFormData = async () => {
      try {
        // Fetch active categories
        const { data: catData, error: catErr } = await supabase
          .from('asset_categories')
          .select('*')
          .eq('status', 'active');
        
        if (catErr) throw catErr;
        setCategories(catData || []);

        // Generate Tag: count existing assets
        const { count, error: countErr } = await supabase
          .from('assets')
          .select('*', { count: 'exact', head: true });

        if (countErr) throw countErr;

        const nextNum = (count || 0) + 1;
        const paddedNum = String(nextNum).padStart(4, '0');
        setGeneratedTag(`AF-${paddedNum}`);
      } catch (err: any) {
        console.error(err);
        setError('Failed to fetch initial categories/tag count.');
      }
    };

    loadFormData();
  }, [supabase]);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError('');
    try {
      const { error: insertErr } = await supabase.from('assets').insert({
        tag: generatedTag,
        name: values.name,
        category_id: values.categoryId,
        serial_number: values.serialNumber || null,
        acquisition_date: values.acquisitionDate,
        acquisition_cost: values.acquisitionCost,
        condition: values.condition,
        location: values.location || null,
        is_bookable: values.isBookable,
        status: 'available',
      });

      if (insertErr) throw insertErr;

      router.push('/assets');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to register the asset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Register New Asset</h1>
          <p className="text-sm text-gray-500">Add a new physical asset to the inventory.</p>
        </div>
        <Link href="/assets">
          <Button variant="ghost">Cancel</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Asset Details</CardTitle>
          <CardDescription>
            The generated asset tag is <span className="font-mono font-bold text-indigo-600">{generatedTag}</span>
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="name">Asset Name *</Label>
              <Input id="name" placeholder="e.g. MacBook Pro M3" {...register('name')} />
              {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="category">Category *</Label>
                <Select onValueChange={(val: any) => setValue('categoryId', val || '')}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoryId && <span className="text-xs text-red-500">{errors.categoryId.message}</span>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input id="serialNumber" placeholder="e.g. C02X12345678" {...register('serialNumber')} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="acquisitionDate">Acquisition Date *</Label>
                <Input id="acquisitionDate" type="date" {...register('acquisitionDate')} />
                {errors.acquisitionDate && <span className="text-xs text-red-500">{errors.acquisitionDate.message}</span>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="acquisitionCost">Acquisition Cost (USD) *</Label>
                <Input id="acquisitionCost" type="number" step="0.01" placeholder="0.00" {...register('acquisitionCost')} />
                {errors.acquisitionCost && <span className="text-xs text-red-500">{errors.acquisitionCost.message}</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="condition">Condition *</Label>
                <Select defaultValue="good" onValueChange={(val) => setValue('condition', (val || 'good') as any)}>
                  <SelectTrigger id="condition">
                    <SelectValue placeholder="Select Condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="location">Location / Room</Label>
                <Input id="location" placeholder="e.g. Conference Room A" {...register('location')} />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                id="isBookable"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                checked={isBookableValue}
                onChange={(e) => setValue('isBookable', e.target.checked)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="isBookable" className="cursor-pointer">
                  Is Bookable / Shareable
                </Label>
                <p className="text-xs text-gray-500">
                  Allow other employees to request bookings for this asset.
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-2 border-t pt-6 mt-6">
            <Link href="/assets">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? 'Registering...' : 'Register Asset'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
