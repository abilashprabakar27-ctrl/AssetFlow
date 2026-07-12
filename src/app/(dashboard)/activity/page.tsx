import { createClient } from '@/lib/supabase/server';
import { NotificationBell } from './NotificationBell';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Bell, User, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

const actionColour = (action: string) => {
  const map: Record<string, string> = {
    'Create Booking':   'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20',
    'Cancel Booking':   'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20',
    'Register Asset':   'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20',
    'Allocate Asset':   'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    'Return Asset':     'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20',
    'File Maintenance': 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20',
    'Signup':           'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    'Create User':      'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/20',
  };
  return map[action] || 'bg-muted text-muted-foreground border-border/40';
};

export default async function ActivityPage() {
  const supabase = createClient();

  const { data: logsData } = await supabase
    .from('activity_logs')
    .select('id, action, details, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  // Fetch all users to join manually (mock DB limitation)
  const { data: usersData } = await supabase.from('users').select('id, name, email');
  const usersMap = Object.fromEntries((usersData || []).map((u: any) => [u.id, u]));

  interface LogRow { id: string; action: string; details: string; created_at: string; user_id?: string; }
  const rawLogs = (logsData || []) as unknown as (LogRow & { user_id?: string })[];

  const now = new Date();
  const logs = rawLogs.map((log: any) => {
    const user = usersMap[log.user_id] || null;
    const diff = now.getTime() - new Date(log.created_at).getTime();
    const mins = Math.floor(diff / 60000);
    let timeAgo = 'Just now';
    if (mins >= 1440) timeAgo = `${Math.floor(mins / 1440)}d ago`;
    else if (mins >= 60) timeAgo = `${Math.floor(mins / 60)}h ago`;
    else if (mins >= 1) timeAgo = `${mins}m ago`;
    return { ...log, user, timeAgo };
  });

  return (
    <div className="relative min-h-screen p-6 lg:p-8 space-y-8 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-5%] right-[-5%] w-[400px] h-[400px] rounded-full bg-blue-500/8 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-500/8 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 opacity-0 animate-slide-up" style={{ animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-animated shadow-glow-blue flex-shrink-0">
          <Activity className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Activity & Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">Full audit trail of all system events and real-time alerts.</p>
        </div>
      </div>

      <div className="relative z-10 grid lg:grid-cols-3 gap-6">
        {/* Notification Panel */}
        <Card className="border-border/60 bg-card/70 backdrop-blur-sm opacity-0 animate-slide-up anim-delay-200" style={{ animationFillMode: 'forwards' }}>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/15">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-base font-semibold">Notification Center</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <NotificationBell />
          </CardContent>
        </Card>

        {/* Activity Log Table */}
        <Card className="lg:col-span-2 border-border/60 bg-card/70 backdrop-blur-sm opacity-0 animate-slide-up anim-delay-300" style={{ animationFillMode: 'forwards' }}>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/15">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-base font-semibold">Audit Trail</CardTitle>
              <Badge variant="secondary" className="ml-auto text-xs">{logs.length} entries</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40 max-h-[600px] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No activity logs found.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
                    {/* User avatar */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 mt-0.5">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-0.5">
                        <span className="text-sm font-semibold">{log.user?.name || 'System'}</span>
                        <span className="text-xs text-muted-foreground">{log.user?.email || ''}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 font-semibold border ${actionColour(log.action)}`}
                        >
                          {log.action}
                        </Badge>
                        <p className="text-xs text-muted-foreground truncate max-w-xs">{log.details}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="text-[11px] text-muted-foreground/60 whitespace-nowrap">{log.timeAgo}</span>
                      <span className="text-[10px] text-muted-foreground/40 mt-0.5 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
