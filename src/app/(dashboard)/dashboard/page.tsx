import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import {
  Package, GitMerge, Calendar, AlertTriangle,
  TrendingUp, Clock, ArrowRight, Activity,
  Wrench, Plus, BookOpen,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const actionColors: Record<string, string> = {
  'Create Booking':   'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  'Cancel Booking':   'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  'Register Asset':   'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  'Allocate Asset':   'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  'Return Asset':     'bg-teal-500/15 text-teal-600 dark:text-teal-400',
  'File Maintenance': 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  'Signup':           'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  'Create User':      'bg-pink-500/15 text-pink-600 dark:text-pink-400',
  'default':          'bg-muted text-muted-foreground',
};

export default async function DashboardPage() {
  const supabase = createClient();

  // Fetch all data concurrently
  const [assetsRes, bookingsRes, allocationsRes, logsRes, maintenanceRes] = await Promise.all([
    supabase.from('assets').select('*'),
    supabase.from('bookings').select('*'),
    supabase.from('allocations').select('*, asset:assets(*), user:users(*)'),
    supabase.from('activity_logs').select('*, user:users(name)').order('created_at', { ascending: false }).limit(6),
    supabase.from('maintenance_requests').select('*'),
  ]);

  const assetsList = assetsRes.data || [];
  const availableCount = assetsList.filter((a: any) => a.status === 'available').length;
  const allocatedCount = assetsList.filter((a: any) => a.status === 'allocated').length;
  const maintenanceCount = assetsList.filter((a: any) => a.status === 'under_maintenance').length;

  const activeBookingsCount = (bookingsRes.data || []).filter((b: any) =>
    b.status === 'upcoming' || b.status === 'active' || b.status === 'ongoing'
  ).length;

  const allocationsList = allocationsRes.data || [];
  const pendingTransfersCount = allocationsList.filter((a: any) => a.status === 'transfer_pending').length;

  const now = new Date();
  const activeAllocations = allocationsList.filter((a: any) => !a.returned_at);

  const upcomingReturnsCount = activeAllocations.filter((a: any) => {
    if (!a.expected_return_date) return false;
    const due = new Date(a.expected_return_date);
    return due > now && due <= new Date(now.getTime() + 7 * 86400000);
  }).length;

  const overdueAllocations = activeAllocations.filter((a: any) => {
    if (!a.expected_return_date) return false;
    return new Date(a.expected_return_date) < now;
  });

  // Maintenance today
  const today = new Date().toDateString();
  const maintenanceTodayCount = (maintenanceRes.data || []).filter((m: any) =>
    new Date(m.created_at).toDateString() === today
  ).length;

  const kpis = [
    { title: 'Available Assets',  value: availableCount,       icon: Package,       color: 'from-blue-500 to-cyan-500',     glow: 'shadow-glow-blue',   href: '/assets' },
    { title: 'Allocated Assets',  value: allocatedCount,       icon: GitMerge,      color: 'from-violet-500 to-purple-500', glow: 'shadow-glow-violet', href: '/assets' },
    { title: 'Active Bookings',   value: activeBookingsCount,  icon: Calendar,      color: 'from-emerald-500 to-teal-500',  glow: '',                   href: '/bookings' },
    { title: 'In Maintenance',    value: maintenanceCount,     icon: Wrench,        color: 'from-orange-500 to-amber-500',  glow: '',                   href: '/maintenance' },
    { title: 'Pending Transfers', value: pendingTransfersCount,icon: Clock,         color: 'from-pink-500 to-rose-500',     glow: '',                   href: '/assets' },
    { title: 'Upcoming Returns',  value: upcomingReturnsCount, icon: TrendingUp,    color: 'from-cyan-500 to-blue-500',     glow: 'shadow-glow-cyan',   href: '/assets' },
  ];

  // Map overdue allocations for UI
  const overdue = overdueAllocations.map((item: any) => {
    const daysOverdue = Math.max(1, Math.floor((now.getTime() - new Date(item.expected_return_date).getTime()) / 86400000));
    return {
      id: item.id,
      asset: item.asset?.name || 'Unknown Asset',
      tag: item.asset?.tag || '',
      user: item.user?.name || 'Unknown User',
      daysOverdue,
    };
  });

  // Recent activity logs
  const logs = (logsRes.data || []).map((log: any) => ({
    id: log.id,
    action: log.action || 'Action',
    detail: log.details || '',
    time: (() => {
      const diff = now.getTime() - new Date(log.created_at).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return `${Math.floor(hrs / 24)}d ago`;
    })(),
    user: log.user?.name || 'System',
  }));

  const quickActions = [
    { label: '+ Register Asset',       href: '/assets?register=true',          variant: 'outline' as const },
    { label: 'Book Resource',          href: '/bookings',         variant: 'default' as const },
    { label: 'Raise Maintenance',      href: '/maintenance/new',  variant: 'outline' as const },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Page header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 opacity-0 animate-slide-up" style={{ animationFillMode: 'forwards' }}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Good {now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'} 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Here&apos;s your operational snapshot for today.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((qa) => (
            <Link
              key={qa.href}
              href={qa.href}
              className={buttonVariants({
                variant: qa.variant,
                size: 'sm',
                className: qa.variant === 'default'
                  ? 'bg-gradient-animated text-white shadow-glow-blue hover:scale-[1.02] transition-all duration-200'
                  : '',
              })}
            >
              {qa.label}
              {qa.variant === 'default' && <ArrowRight className="ml-1 h-4 w-4 inline" />}
            </Link>
          ))}
        </div>
      </div>

      {/* Maintenance Today banner */}
      {maintenanceTodayCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-700 dark:text-orange-400 text-sm animate-slide-up opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '50ms' }}>
          <Wrench className="h-4 w-4 flex-shrink-0" />
          <span><strong>{maintenanceTodayCount}</strong> maintenance request{maintenanceTodayCount > 1 ? 's' : ''} filed today</span>
          <Link href="/maintenance" className="ml-auto text-xs underline">View →</Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi, idx) => (
          <Link
            href={kpi.href}
            key={idx}
            className="group block"
          >
            <Card
              className="card-hover border-border/60 bg-card/70 backdrop-blur-sm overflow-hidden relative opacity-0 animate-slide-up h-full"
              style={{ animationFillMode: 'forwards', animationDelay: `${idx * 80}ms` }}
            >
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${kpi.color}`} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
                <div className={`flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br ${kpi.color} ${kpi.glow}`}>
                  <kpi.icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <span className="text-3xl font-bold tracking-tight">{kpi.value}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Bottom grid */}
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
              <div className="py-6 text-sm text-muted-foreground italic text-center font-medium">
                ✅ No overdue returns. All good!
              </div>
            ) : (
              <>
                {overdue.slice(0, 4).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-destructive/5 border border-destructive/10 hover:bg-destructive/10 transition-colors">
                    <div>
                      <p className="text-sm font-semibold">{item.asset}</p>
                      <p className="text-xs text-muted-foreground">{item.user} {item.tag ? `· ${item.tag}` : ''}</p>
                    </div>
                    <Badge variant="outline" className="text-xs border-destructive/30 text-destructive">
                      {item.daysOverdue}d overdue
                    </Badge>
                  </div>
                ))}
                <Link href="/assets" className="block text-center text-xs text-primary hover:underline transition-colors mt-2">
                  Manage allocations →
                </Link>
              </>
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
          <CardContent className="space-y-2">
            {logs.length === 0 ? (
              <div className="py-6 text-sm text-muted-foreground italic text-center">No activity yet.</div>
            ) : (
              logs.map((item: any) => {
                const colourClass = actionColors[item.action] || actionColors['default'];
                return (
                  <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap flex-shrink-0 ${colourClass}`}>
                      {item.action}
                    </span>
                    <p className="text-xs text-muted-foreground flex-1 truncate">{item.detail}</p>
                    <p className="text-[10px] text-muted-foreground/60 whitespace-nowrap">{item.time}</p>
                  </div>
                );
              })
            )}
            <Link href="/activity" className="block text-center text-xs text-primary hover:underline mt-2 transition-colors">
              View all activity →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
