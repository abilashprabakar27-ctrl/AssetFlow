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
import { 
  ArrowLeft, 
  Sparkles, 
  Settings2,
  Database,
  Building,
  CheckCircle,
  HelpCircle,
  Tag
} from 'lucide-react';

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
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Back button */}
      <Link href="/assets" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors font-medium">
        <ArrowLeft className="h-4 w-4" />
        <span>Return to directory</span>
      </Link>

      <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200/60 rounded-3xl overflow-hidden">
        {/* Header decoration */}
        <div className="h-2 bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 w-full" />
        
        <CardHeader className="p-8 pb-4">
          <CardTitle className="text-2xl font-extrabold font-heading text-slate-900 flex items-center gap-2">
            <Database className="h-6 w-6 text-indigo-600" />
            <span>Register New Asset</span>
          </CardTitle>
          <CardDescription className="text-slate-500 mt-1">
            Add a new physical asset or bookable resource to the corporate ledger.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="p-8 pt-4 space-y-6">
            {error && (
              <div className="p-4 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 animate-shake">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* General Settings Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono border-b pb-1.5 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                <span>Identity Settings</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tag" className="text-slate-700 font-semibold text-xs">Asset Tag</Label>
                  <Input 
                    id="tag" 
                    value={nextTag} 
                    disabled 
                    className="bg-indigo-50/50 border-indigo-100 font-bold text-indigo-700 h-11 rounded-xl cursor-not-allowed font-mono text-sm" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serial" className="text-slate-700 font-semibold text-xs">Serial Number</Label>
                  <Input 
                    id="serial" 
                    placeholder="S/N or Unique ID" 
                    value={serial} 
                    onChange={(e) => setSerial(e.target.value)} 
                    className="h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700 font-semibold text-xs">Asset Name / Title *</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. MacBook Pro 14-inch" 
                  required 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-slate-700 font-semibold text-xs">Category *</Label>
                  <Select onValueChange={(val) => { if (typeof val === 'string') handleCategoryChange(val); }} required>
                    <SelectTrigger id="category" className="h-11 rounded-xl border-slate-200">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost" className="text-slate-700 font-semibold text-xs">Acquisition Cost (USD)</Label>
                  <Input 
                    id="cost" 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    value={cost} 
                    onChange={(e) => setCost(e.target.value)} 
                    className="h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Custom Fields Section */}
            {selectedCategory?.custom_fields && Object.keys(selectedCategory.custom_fields).length > 0 && (
              <div className="border border-indigo-100 bg-indigo-50/10 p-5 rounded-2xl space-y-4 animate-fade-in">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 font-mono flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-indigo-500 animate-pulse-slow" />
                  <span>Category-Specific Specifications ({selectedCategory.name})</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.keys(selectedCategory.custom_fields).map((key) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={`custom-${key}`} className="capitalize text-slate-700 font-semibold text-xs">{key.replace('_', ' ')}</Label>
                      <Input 
                        id={`custom-${key}`} 
                        placeholder={`e.g. ${key.includes('ram') ? '32GB' : 'Value'}`}
                        value={customFieldValues[key] || ''} 
                        onChange={(e) => handleCustomFieldChange(key, e.target.value)} 
                        className="h-11 rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location & Condition Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono border-b pb-1.5 flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span>Lifecycle Configuration</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-slate-700 font-semibold text-xs">Initial Location</Label>
                  <Input 
                    id="location" 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)} 
                    className="h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="condition" className="text-slate-700 font-semibold text-xs">Check-in Condition</Label>
                  <Select onValueChange={(val) => setCondition(val || 'Excellent')} defaultValue="Excellent">
                    <SelectTrigger id="condition" className="h-11 rounded-xl border-slate-200">
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
            </div>

            {/* Bookable Flag Box */}
            <div className="flex items-start space-x-3.5 p-4 bg-indigo-50/20 border border-indigo-100/50 rounded-2xl">
              <input 
                id="isBookable" 
                type="checkbox" 
                className="h-5 w-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-0.5"
                checked={isBookable}
                onChange={(e) => setIsBookable(e.target.checked)}
              />
              <Label htmlFor="isBookable" className="font-bold text-slate-800 cursor-pointer select-none">
                Mark as Shared Bookable Resource
                <span className="font-normal text-[11px] text-slate-500 block mt-0.5">
                  Enables employees to reserve slots on the Booking calendar.
                </span>
              </Label>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between border-t border-slate-100 p-8 bg-slate-50/50">
            <Link href="/assets" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-all">
              Cancel
            </Link>
            <Button type="submit" disabled={loading} className="h-11 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-600/10 hover:bg-indigo-500 glow-btn-primary">
              {loading ? 'Registering...' : 'Register Asset'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
