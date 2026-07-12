'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
export default function DashboardPage() {
  const kpis = [
    { title: 'Available Assets', value: 142 },
    { title: 'Allocated Assets', value: 89 },
    { title: 'In Maintenance', value: 7 },
    { title: 'Active Bookings', value: 24 },
    { title: 'Pending Transfers', value: 3 },
    { title: 'Upcoming Returns', value: 12 },
  ];
  const overdue = [
    { id: '1', asset: 'MacBook Pro 16"', user: 'John Doe', daysOverdue: 5 },
    { id: '2', asset: 'iPad Pro 12.9"', user: 'Jane Smith', daysOverdue: 3 },
    { id: '3', asset: 'Dell UltraSharp 27"', user: 'Bob Johnson', daysOverdue: 8 },
  ];
  return (
    <div className="container mx-auto py-10 px-4 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-500">Asset & Resource Management overview</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/assets/register" className={buttonVariants({ variant: "outline" })}>Register Asset</Link>
          <Link href="/bookings/new" className={buttonVariants({ variant: "outline" })}>Book Resource</Link>
          <Link href="/maintenance/new" className={buttonVariants({ variant: "destructive" })}>Raise Maintenance Request</Link>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi, idx) => (
          <Card key={idx}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="border border-red-500 rounded-lg p-6 bg-red-50/50 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-red-700">Overdue Returns</h2>
          <Badge variant="destructive">Action Required</Badge>
        </div>
        <div className="divide-y divide-red-200">
          {overdue.map((item) => (
            <div key={item.id} className="py-3 flex justify-between items-center text-sm">
              <div>
                <span className="font-semibold text-red-900">{item.asset}</span>
                <span className="text-red-700 ml-2">assigned to {item.user}</span>
              </div>
              <span className="font-bold text-red-600">{item.daysOverdue} days overdue</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
