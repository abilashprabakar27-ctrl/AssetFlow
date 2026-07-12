'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Wrench, ArrowLeft, AlertTriangle } from 'lucide-react';
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
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
      setCurrentUser(profile);
    }
    const { data: assetsData } = await supabase.from('assets').select('*');
    if (assetsData) setAssets(assetsData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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
      resolved_at: null,
    };

    const { error: insertError } = await supabase.from('maintenance_requests').insert([payload]);

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    const asset = assets.find(a => a.id === selectedAssetId);
    await supabase.from('activity_logs').insert([{
      user_id: currentUser?.id,
      action: 'File Maintenance',
      details: `Filed repair ticket for ${asset?.name || 'Unknown'} (${asset?.tag || ''}). Priority: ${priority}`,
    }]);

    setLoading(false);
    router.push('/maintenance');
  };

  const priorityConfig = {
    low:    { label: 'Low — General / Cosmetic',      color: 'text-emerald-600 bg-emerald-500/10' },
    medium: { label: 'Medium — Functional Issues',    color: 'text-orange-600 bg-orange-500/10' },
    high:   { label: 'High — Critical Failure / Down',color: 'text-red-600 bg-red-500/10' },
  };

  return (
    <div className="relative min-h-screen p-6 lg:p-8 overflow-hidden">
      {/* Background */}
      <div className="absolute top-[-5%] right-[-5%] w-[400px] h-[400px] rounded-full bg-orange-500/8 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-8 opacity-0 animate-slide-up" style={{ animationFillMode: 'forwards' }}>
        <Link href="/maintenance" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Maintenance
        </Link>
      </div>

      <div className="max-w-xl mx-auto">
        <Card className="border-border/60 bg-card/70 backdrop-blur-sm shadow-glass rounded-2xl overflow-hidden relative opacity-0 animate-slide-up anim-delay-100" style={{ animationFillMode: 'forwards' }}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500" />

          <CardHeader className="pt-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500/15">
                <Wrench className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">Raise Maintenance Request</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  File a repair ticket. Asset managers will review and assign a technician.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="asset" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Affected Asset
                </Label>
                <Select onValueChange={(val) => { if (typeof val === 'string') setSelectedAssetId(val); }} required>
                  <SelectTrigger id="asset" className="bg-background/50 border-border/50">
                    <SelectValue placeholder="Select the asset with the issue…" />
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
                <Label htmlFor="priority" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Priority / Severity
                </Label>
                <Select onValueChange={(val) => setPriority(val || 'medium')} defaultValue="medium">
                  <SelectTrigger id="priority" className="bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([value, cfg]) => (
                      <SelectItem key={value} value={value}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {priority && (
                  <div className={`text-xs font-medium px-3 py-1.5 rounded-lg inline-flex ${priorityConfig[priority as keyof typeof priorityConfig]?.color}`}>
                    Priority: {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Issue Description
                </Label>
                <textarea
                  id="description"
                  rows={4}
                  className="w-full rounded-xl border border-border/50 bg-background/50 p-3 text-sm placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors resize-none"
                  placeholder="Describe the symptoms, error messages, or physical damage observed…"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </CardContent>

            <CardFooter className="flex justify-between border-t border-border/40 p-6">
              <Link
                href="/maintenance"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground border border-border/50 hover:bg-muted/40 transition-colors"
              >
                Cancel
              </Link>
              <Button
                type="submit"
                disabled={loading}
                className="h-10 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold px-6 rounded-xl hover:scale-[1.02] transition-all duration-200 shadow-md"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Filing…
                  </span>
                ) : (
                  'File Ticket'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
