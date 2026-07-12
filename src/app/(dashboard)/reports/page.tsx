import { createClient } from '@/lib/supabase/server';
import { DepartmentChart } from './DepartmentChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart2, Package, AlertTriangle, TrendingUp, Wrench } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const supabase = createClient();

  const [deptAllocRes, assetsRes, maintenanceRes, allocationsRes] = await Promise.all([
    supabase.rpc('get_department_allocations_summary'),
    supabase.from('assets').select('*'),
    supabase.from('maintenance_requests').select('*'),
    supabase.from('allocations').select('*, asset:assets(*)'),
  ]);

  // Department chart data
  let chartData: { name: string; total_allocations: number }[] = [];
  if (!deptAllocRes.error && deptAllocRes.data) {
    chartData = (deptAllocRes.data as any[]).map((row) => ({
      name: row.name,
      total_allocations: Number(row.total_allocations || 0),
    }));
  } else {
    const { data: departments } = await supabase.from('departments').select('id, name');
    const { data: allocations } = await supabase.from('allocations').select('id, department_id');
    if (departments) {
      chartData = departments.map((dept: any) => ({
        name: dept.name,
        total_allocations: allocations?.filter((a: any) => a.department_id === dept.id).length || 0,
      }));
    }
  }

  // Summary stats
  const assets = assetsRes.data || [];
  const maintenance = maintenanceRes.data || [];
  const allocations = allocationsRes.data || [];

  const totalAssets = assets.length;
  const allocated = assets.filter((a: any) => a.status === 'allocated').length;
  const available = assets.filter((a: any) => a.status === 'available').length;
  const underMaintenance = assets.filter((a: any) => a.status === 'under_maintenance').length;

  const utilizationRate = totalAssets > 0 ? Math.round((allocated / totalAssets) * 100) : 0;

  const pendingMaintenance = maintenance.filter((m: any) => m.status === 'pending').length;
  const resolvedMaintenance = maintenance.filter((m: any) => m.status === 'resolved').length;

  // Most allocated categories
  const categoryCounts: Record<string, number> = {};
  assets.forEach((a: any) => {
    if (a.status === 'allocated' && a.category_id) {
      categoryCounts[a.category_id] = (categoryCounts[a.category_id] || 0) + 1;
    }
  });

  // Overdue allocations
  const now = new Date();
  const overdueCount = allocations.filter((a: any) =>
    a.status === 'active' && a.expected_return_date && new Date(a.expected_return_date) < now
  ).length;

  const summaryCards = [
    { title: 'Total Assets',       value: totalAssets,       icon: Package,       color: 'from-blue-500 to-cyan-500' },
    { title: 'Utilization Rate',   value: `${utilizationRate}%`, icon: TrendingUp,color: 'from-violet-500 to-purple-500' },
    { title: 'Under Maintenance',  value: underMaintenance,  icon: Wrench,        color: 'from-orange-500 to-amber-500' },
    { title: 'Overdue Returns',    value: overdueCount,      icon: AlertTriangle, color: 'from-red-500 to-rose-500' },
  ];

  return (
    <div className="relative min-h-screen p-6 lg:p-8 space-y-8 overflow-hidden">
      {/* Background */}
      <div className="absolute top-[-5%] right-[-5%] w-[400px] h-[400px] rounded-full bg-violet-500/8 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-blue-500/8 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 opacity-0 animate-slide-up" style={{ animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-animated shadow-glow-violet flex-shrink-0">
          <BarChart2 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Asset utilization, allocation trends, and maintenance insights.</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="relative z-10 grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <Card
            key={i}
            className="border-border/60 bg-card/70 backdrop-blur-sm overflow-hidden relative opacity-0 animate-slide-up"
            style={{ animationFillMode: 'forwards', animationDelay: `${i * 60}ms` }}
          >
            <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${card.color}`} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className={`flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br ${card.color}`}>
                <card.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold tracking-tight">{card.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative z-10 grid lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 space-y-3 opacity-0 animate-slide-up anim-delay-300" style={{ animationFillMode: 'forwards' }}>
          <h2 className="text-lg font-bold tracking-tight">Department-Wise Allocations</h2>
          <DepartmentChart data={chartData} />
        </div>

        {/* Sidebar stats */}
        <div className="space-y-4 opacity-0 animate-slide-up anim-delay-400" style={{ animationFillMode: 'forwards' }}>
          <h2 className="text-lg font-bold tracking-tight">Asset Status Breakdown</h2>
          <Card className="border-border/60 bg-card/70 backdrop-blur-sm">
            <CardContent className="pt-5 space-y-3">
              {[
                { label: 'Available',         value: available,         bar: 'bg-emerald-500' },
                { label: 'Allocated',         value: allocated,         bar: 'bg-blue-500' },
                { label: 'Under Maintenance', value: underMaintenance,  bar: 'bg-orange-500' },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-bold">{totalAssets > 0 ? Math.round((row.value / totalAssets) * 100) : 0}% ({row.value})</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${row.bar} transition-all duration-500`}
                      style={{ width: totalAssets > 0 ? `${(row.value / totalAssets) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <h2 className="text-lg font-bold tracking-tight">Maintenance Summary</h2>
          <Card className="border-border/60 bg-card/70 backdrop-blur-sm">
            <CardContent className="pt-5 space-y-3">
              {[
                { label: 'Pending Review',  value: pendingMaintenance, badge: 'bg-orange-500/15 text-orange-600 dark:text-orange-400' },
                { label: 'Resolved',        value: resolvedMaintenance, badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
                { label: 'Total Requests',  value: maintenance.length, badge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <Badge variant="secondary" className={`text-xs font-bold ${row.badge}`}>
                    {row.value}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
