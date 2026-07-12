import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import {
  Package, GitMerge, Calendar, AlertTriangle,
  TrendingUp, Clock, ArrowRight, Activity,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createClient();

  // Fetch all assets
  const { data: assets } = await supabase.from('assets').select('*');
  const assetsList = assets || [];
  const availableCount = assetsList.filter((a: any) => a.status === 'available').length;
  const allocatedCount = assetsList.filter((a: any) => a.status === 'allocated').length;
  const maintenanceCount = assetsList.filter((a: any) => a.status === 'under_maintenance').length;

  // Fetch all bookings
  const { data: bookings } = await supabase.from('bookings').select('*');
  const activeBookingsCount = (bookings || []).filter((b: any) => b.status === 'active').length;

  // Fetch all allocations
  const { data: allocations } = await supabase.from('allocations').select('*, asset:assets(*), user:users(*)');
  const allocationsList = allocations || [];
  
  // Pending transfers
  const pendingTransfersCount = allocationsList.filter((a: any) => a.status === 'transfer_pending').length;

  // Upcoming and Overdue returns
  const now = new Date();
  const activeAllocations = allocationsList.filter((a: any) => !a.returned_at);

  const upcomingReturnsCount = activeAllocations.filter((a: any) => {
    if (!a.expected_return_date) return false;
    return new Date(a.expected_return_date) > now;
  }).length;

  const overdueAllocations = activeAllocations.filter((a: any) => {
    if (!a.expected_return_date) return false;
    return new Date(a.expected_return_date) < now;
  });

  const kpis = [
    { title: 'Available Assets', value: availableCount, icon: Package, change: '', positive: true, color: 'from-blue-500 to-cyan-500', glow: 'shadow-glow-blue' },
    { title: 'Allocated Assets', value: allocatedCount, icon: GitMerge, change: '', positive: true, color: 'from-violet-500 to-purple-500', glow: 'shadow-glow-violet' },
    { title: 'Active Bookings', value: activeBookingsCount, icon: Calendar, change: '', positive: false, color: 'from-emerald-500 to-teal-500', glow: '' },
    { title: 'In Maintenance', value: maintenanceCount, icon: Activity, change: '', positive: false, color: 'from-orange-500 to-amber-500', glow: '' },
    { title: 'Pending Transfers', value: pendingTransfersCount, icon: Clock, change: '', positive: true, color: 'from-pink-500 to-rose-500', glow: '' },
    { title: 'Upcoming Returns', value: upcomingReturnsCount, icon: TrendingUp, change: '', positive: false, color: 'from-cyan-500 to-blue-500', glow: 'shadow-glow-cyan' },
  ];

  // Map overdue allocations for UI
  const overdue = overdueAllocations.map((item: any) => {
    const daysOverdue = Math.max(1, Math.floor((now.getTime() - new Date(item.expected_return_date).getTime()) / (1000 * 60 * 60 * 24)));
    return {
      id: item.id,
      asset: item.asset?.name || 'Unknown Asset',
      user: item.user?.name || 'Unknown User',
      dept: item.asset?.tag || '',
      daysOverdue: daysOverdue,
    };
  });

  // Mock recent activity
  const recentActivity = [
    { id: '1', action: 'Dashboard loaded', detail: 'System accessed', time: 'Just now', type: 'asset' },
  ];
  
  const typeColour: Record<string, string> = {
    asset:    'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    booking:  'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    transfer: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
    return:   'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Page header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 opacity-0 animate-slide-up" style={{ animationFillMode: 'forwards' }}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Good morning 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Here&apos;s what&apos;s happening across your organisation today.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/assets/register" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            + Register Asset
          </Link>
          <Link href="/bookings" className={buttonVariants({ size: 'sm', className: 'bg-gradient-animated text-white shadow-glow-blue hover:scale-[1.02] transition-all duration-200' })}>
            Book Resource <ArrowRight className="ml-1 h-4 w-4 inline" />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi, idx) => (
          <Card
            key={idx}
            className="group card-hover border-border/60 bg-card/70 backdrop-blur-sm overflow-hidden relative opacity-0 animate-slide-up"
            style={{ animationFillMode: 'forwards', animationDelay: `${idx * 80}ms` }}
          >
            {/* Gradient accent top bar */}
            <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${kpi.color}`} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
              <div className={`flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br ${kpi.color} ${kpi.glow}`}>
                <kpi.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold tracking-tight">{kpi.value}</span>
                {kpi.change && (
                  <Badge
                    variant="secondary"
                    className={`text-xs ${kpi.positive ? 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400' : 'text-orange-600 bg-orange-500/10 dark:text-orange-400'}`}
                  >
                    {kpi.change}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom two-col grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Overdue panel */}
        <Card className="border-border/60 bg-card/70 backdrop-blur-sm overflow-hidden opacity-0 animate-slide-up anim-delay-400" style={{ animationFillMode: 'forwards' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-destructive/15">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <CardTitle className="text-base font-semibold">Overdue Returns</CardTitle>
              </div>
              {overdue.length > 0 && <Badge variant="destructive" className="text-xs animate-pulse-glow">Action Required</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
                {overdue.length === 0 ? (
                  <div className="py-6 text-sm text-gray-500 dark:text-zinc-400 italic text-center font-medium">
                    No overdue returns. All good!
                  </div>
                ) : (
                  overdue.slice(0, 3).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-destructive/5 border border-destructive/10 hover:bg-destructive/10 transition-colors">
                  <div>
                    <p className="text-sm font-semibold">{item.asset}</p>
                    <p className="text-xs text-muted-foreground">{item.user} {item.dept ? `· ${item.dept}` : ''}</p>
                  </div>
                  <Badge variant="outline" className="text-xs border-destructive/30 text-destructive">
                    {item.daysOverdue}d overdue
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-border/60 bg-card/70 backdrop-blur-sm overflow-hidden opacity-0 animate-slide-up anim-delay-500" style={{ animationFillMode: 'forwards' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/15">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap ${typeColour[item.type]}`}>
                  {item.action}
                </span>
                <p className="text-xs text-muted-foreground flex-1 truncate">{item.detail}</p>
                <p className="text-[10px] text-muted-foreground/60 whitespace-nowrap">{item.time}</p>
              </div>
            ))}
            <Link href="/activity" className="block text-center text-xs text-primary hover:underline mt-2 transition-colors">
              View all activity →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
