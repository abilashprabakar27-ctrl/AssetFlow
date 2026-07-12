import { createClient } from '@/lib/supabase/server';
import { NotificationBell } from './NotificationBell';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default async function ActivityPage() {
  const supabase = createClient();

  // Fetch recent activity logs
  const { data: logsData } = await supabase
    .from('activity_logs')
    .select(`
      id,
      action,
      details,
      created_at,
      user:users(name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  interface LogRow {
    id: string;
    action: string;
    details: string;
    created_at: string;
    user: { name: string; email: string }[] | { name: string; email: string } | null;
  }

  const rawLogs = (logsData || []) as unknown as LogRow[];
  const logs = rawLogs.map((log) => ({
    id: log.id,
    action: log.action,
    details: log.details,
    created_at: log.created_at,
    user: Array.isArray(log.user) ? log.user[0] : log.user,
  }));

  return (
    <div className="container mx-auto py-10 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Events & Notifications</h1>
        <p className="text-gray-500">View recent user actions and manage stubs for notifications.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          <h2 className="text-xl font-semibold">Notification Center</h2>
          <NotificationBell />
        </div>
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">Audit Trail / Activity Log</h2>
          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-gray-500">
                      No activity logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <span className="font-semibold block">{log.user?.name || 'System'}</span>
                        <span className="text-xs text-gray-500">{log.user?.email || ''}</span>
                      </TableCell>
                      <TableCell className="font-medium text-blue-700">{log.action}</TableCell>
                      <TableCell className="max-w-xs truncate" title={log.details}>
                        {log.details}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
