'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import Link from 'next/link';

export default function RegisterAssetPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  
  const [nextTag, setNextTag] = useState('AF-0001');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [serial, setSerial] = useState('');
  const [location, setLocation] = useState('HQ - Floor 3');
  const [condition, setCondition] = useState('Excellent');
  const [cost, setCost] = useState('');
  const [isBookable, setIsBookable] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    // Categories
    const { data: cats } = await supabase.from('asset_categories').select('*').eq('status', 'active');
    if (cats) setCategories(cats);

    // Assets to generate next Tag
    const { data: assets } = await supabase.from('assets').select('tag');
    if (assets && assets.length > 0) {
      // Find maximum numeric tag
      const tags = assets.map((a: any) => {
        const num = parseInt(a.tag.split('-')[1]);
        return isNaN(num) ? 0 : num;
      });
      const maxTag = Math.max(...tags, 0);
      const nextNum = maxTag + 1;
      // Pad to 4 digits e.g. AF-0006
      const paddedNum = String(nextNum).padStart(4, '0');
      setNextTag(`AF-${paddedNum}`);
    } else {
      setNextTag('AF-0001');
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCategoryChange = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    setSelectedCategory(cat || null);
    
    // Reset custom fields values
    if (cat?.custom_fields) {
      const initialFields: Record<string, string> = {};
      Object.keys(cat.custom_fields).forEach((key) => {
        initialFields[key] = '';
      });
      setCustomFieldValues(initialFields);
    } else {
      setCustomFieldValues({});
    }
  };

  const handleCustomFieldChange = (key: string, val: string) => {
    setCustomFieldValues((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Get current user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Session expired. Please log in.');
      setLoading(false);
      return;
    }

    // Construct custom fields payload merged with category custom fields configuration values
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
      department_id: null, // default unassigned
      status: 'available' as const,
      is_bookable: isBookable,
      condition,
      location,
      cost: cost ? parseFloat(cost) : null,
      custom_fields: finalCustomFields, // wait, supabase schema defines category custom_fields, let's keep it locally on the asset too!
    };

    // Call insert
    const { error: insertError } = await supabase.from('assets').insert([payload]);

    if (insertError) {
      setError(insertError.message || 'Failed to register asset.');
      setLoading(false);
      return;
    }

    // Add activity log
    await supabase.from('activity_logs').insert([
      {
        user_id: user.id,
        action: 'Register Asset',
        details: `Registered asset ${nextTag}: ${name} under category ${selectedCategory?.name || 'None'}`,
      },
    ]);

    setLoading(false);
    router.push('/assets');
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-2xl">
      <Card className="shadow-xs border border-gray-200">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Register New Asset</CardTitle>
          <CardDescription>Add a new physical asset or bookable resource to the corporate ledger.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tag">Asset Tag</Label>
                <Input id="tag" value={nextTag} disabled className="bg-gray-100 font-semibold" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="serial">Serial Number</Label>
                <Input id="serial" placeholder="S/N or Unique ID" value={serial} onChange={(e) => setSerial(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Asset Name / Title</Label>
              <Input id="name" placeholder="e.g. MacBook Pro 14-inch" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Select onValueChange={(val) => { if (typeof val === 'string') handleCategoryChange(val); }} required>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cost">Acquisition Cost ($)</Label>
                <Input id="cost" type="number" step="0.01" placeholder="0.00" value={cost} onChange={(e) => setCost(e.target.value)} />
              </div>
            </div>

            {/* Dynamic Custom Fields Section */}
            {selectedCategory?.custom_fields && Object.keys(selectedCategory.custom_fields).length > 0 && (
              <div className="border border-blue-100 bg-blue-50/20 p-4 rounded-lg space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700">Category-Specific Specifications ({selectedCategory.name})</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.keys(selectedCategory.custom_fields).map((key) => (
                    <div key={key} className="space-y-1.5">
                      <Label htmlFor={`custom-${key}`} className="capitalize">{key.replace('_', ' ')}</Label>
                      <Input 
                        id={`custom-${key}`} 
                        placeholder={`Value for ${key.replace('_', ' ')}`}
                        value={customFieldValues[key] || ''} 
                        onChange={(e) => handleCustomFieldChange(key, e.target.value)} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="location">Initial Location</Label>
                <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="condition">Check-in Condition</Label>
                <Select onValueChange={(val) => setCondition(val || 'Excellent')} defaultValue="Excellent">
                  <SelectTrigger id="condition">
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

            {/* Bookable Flag */}
            <div className="flex items-center space-x-3 p-3 bg-gray-50 border rounded-lg">
              <input 
                id="isBookable" 
                type="checkbox" 
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                checked={isBookable}
                onChange={(e) => setIsBookable(e.target.checked)}
              />
              <Label htmlFor="isBookable" className="font-semibold text-gray-900 cursor-pointer">
                Mark as Shared Bookable Resource
                <span className="font-normal text-xs text-gray-500 block">Enables this resource to be scheduled by time slots on the Booking calendar.</span>
              </Label>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between border-t p-4 mt-6">
            <Link href="/assets" className="inline-flex h-10 items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50">
              Cancel
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? 'Registering...' : 'Register Asset'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
