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

export default function NewMaintenanceRequestPage() {
  const router = useRouter();
  const supabase = createClient();

  const [assets, setAssets] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // Current User
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
      setCurrentUser(profile);
    }

    // Assets
    const { data: assetsData } = await supabase.from('assets').select('*');
    if (assetsData) setAssets(assetsData);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!selectedAssetId || !description) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    const payload = {
      asset_id: selectedAssetId,
      reporter_id: currentUser?.id || null,
      description,
      priority,
      status: 'pending' as const,
      technician_id: null,
      resolved_at: null
    };

    const { error: insertError } = await supabase.from('maintenance_requests').insert([payload]);

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    // Log Activity
    const asset = assets.find(a => a.id === selectedAssetId);
    await supabase.from('activity_logs').insert([
      {
        user_id: currentUser?.id,
        action: 'File Maintenance',
        details: `Filed repair ticket for asset ${asset?.tag}. Priority: ${priority}`,
      }
    ]);

    setLoading(false);
    router.push('/maintenance');
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-xl">
      <Card className="shadow-xs border border-gray-200">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Raise Repair Ticket</CardTitle>
          <CardDescription>File a maintenance request for physical hardware. Managers will review and assign technicians.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="asset">Affected Asset</Label>
              <Select onValueChange={(val) => { if (typeof val === 'string') setSelectedAssetId(val); }} required>
                <SelectTrigger id="asset">
                  <SelectValue placeholder="Choose asset..." />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.tag})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="priority">Severity / Priority</Label>
              <Select onValueChange={(val) => setPriority(val || 'medium')} defaultValue="medium">
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - General maintenance</SelectItem>
                  <SelectItem value="medium">Medium - Functional issues</SelectItem>
                  <SelectItem value="high">High - Critical failure / Broken</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Issue Details</Label>
              <textarea 
                id="description" 
                rows={4} 
                className="w-full rounded-md border border-gray-200 p-2 text-sm focus:border-blue-500 focus:outline-none bg-white text-black" 
                placeholder="Describe the symptoms, error messages, or physical damage..." 
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t p-4 mt-6">
            <Link href="/maintenance" className="inline-flex h-10 items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50">
              Cancel
            </Link>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? 'Filing Request...' : 'File Ticket'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
