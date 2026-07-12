import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

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
  const { data: allocations } = await supabase.from('allocations').select('*');
  const allocationsList = allocations || [];
  
  // Pending transfers: allocations where status is 'transfer_pending' or similar
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
    { title: 'Available Assets', value: availableCount },
    { title: 'Allocated Assets', value: allocatedCount },
    { title: 'In Maintenance', value: maintenanceCount },
    { title: 'Active Bookings', value: activeBookingsCount },
    { title: 'Pending Transfers', value: pendingTransfersCount },
    { title: 'Upcoming Returns', value: upcomingReturnsCount },
  ];

  return (
    <div className="container mx-auto py-6 px-4 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Operational Dashboard</h1>
          <p className="text-gray-500">Real-time status of physical assets and shared resources.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/assets" className={buttonVariants({ variant: "outline" })}>View Directory</Link>
          <Link href="/bookings" className={buttonVariants({ variant: "default" })}>Book Resource</Link>
          <Link href="/maintenance/new" className={buttonVariants({ variant: "destructive" })}>Raise Repair Ticket</Link>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className="shadow-xs border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-500">{kpi.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overdue Returns Notification Box */}
      <div className="border border-red-200 rounded-xl p-6 bg-red-50/30 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-red-800">Critical Overdue Returns</h2>
            <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-none font-semibold">Immediate Action Required</Badge>
          </div>
          <span className="text-sm font-semibold text-red-700">{overdueAllocations.length} total alerts</span>
        </div>
        
        <div className="divide-y divide-red-100">
          {overdueAllocations.length === 0 ? (
            <div className="py-3 text-sm text-gray-500 italic">No overdue returns at this time. Good job!</div>
          ) : (
            overdueAllocations.map((item: any) => {
              const daysOverdue = Math.max(1, Math.floor((now.getTime() - new Date(item.expected_return_date).getTime()) / (1000 * 60 * 60 * 24)));
              return (
                <div key={item.id} className="py-3 flex justify-between items-center text-sm">
                  <div>
                    <span className="font-semibold text-red-900">{item.asset?.name || 'Unknown Asset'}</span>
                    <span className="text-xs text-red-500 block sm:inline sm:ml-2">({item.asset?.tag})</span>
                    <span className="text-red-700 ml-2">assigned to {item.user?.name || 'Unknown User'}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-red-600 block">{daysOverdue} days overdue</span>
                    <span className="text-xs text-gray-500">Expected: {new Date(item.expected_return_date).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
