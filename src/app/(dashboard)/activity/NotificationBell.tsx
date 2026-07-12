'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Bell, AlertTriangle, Calendar, Wrench, GitMerge, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'overdue' | 'maintenance' | 'booking' | 'transfer' | 'audit';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const typeConfig = {
  overdue:     { icon: AlertTriangle, color: 'text-red-500',     bg: 'bg-red-500/10',     label: 'Overdue' },
  maintenance: { icon: Wrench,        color: 'text-orange-500',  bg: 'bg-orange-500/10',  label: 'Maintenance' },
  booking:     { icon: Calendar,      color: 'text-blue-500',    bg: 'bg-blue-500/10',    label: 'Booking' },
  transfer:    { icon: GitMerge,      color: 'text-violet-500',  bg: 'bg-violet-500/10',  label: 'Transfer' },
  audit:       { icon: CheckCircle,   color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Audit' },
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function buildNotifications() {
      const now = new Date();
      const items: Notification[] = [];

      // Overdue allocations
      const { data: allocations } = await supabase.from('allocations').select('*');
      (allocations || []).forEach((a: any) => {
        if (a.status === 'active' && a.expected_return_date && !a.returned_at) {
          const due = new Date(a.expected_return_date);
          if (due < now) {
            const days = Math.max(1, Math.floor((now.getTime() - due.getTime()) / 86400000));
            items.push({
              id: `overdue-${a.id}`,
              type: 'overdue',
              title: 'Overdue Return',
              message: `Allocation overdue by ${days} day${days > 1 ? 's' : ''}`,
              time: due.toLocaleDateString(),
              read: false,
            });
          }
        }
      });

      // Pending maintenance
      const { data: maintenance } = await supabase.from('maintenance_requests').select('*');
      (maintenance || []).forEach((m: any) => {
        if (m.status === 'pending') {
          items.push({
            id: `maint-${m.id}`,
            type: 'maintenance',
            title: 'Pending Maintenance',
            message: `Maintenance request awaiting approval`,
            time: new Date(m.created_at).toLocaleDateString(),
            read: false,
          });
        }
        if (m.status === 'approved') {
          items.push({
            id: `maint-approved-${m.id}`,
            type: 'maintenance',
            title: 'Maintenance Approved',
            message: `Repair ticket approved — awaiting technician`,
            time: new Date(m.created_at).toLocaleDateString(),
            read: false,
          });
        }
      });

      // Upcoming bookings (next 24h)
      const { data: bookings } = await supabase.from('bookings').select('*');
      (bookings || []).forEach((b: any) => {
        const start = new Date(b.start_time);
        const diffHrs = (start.getTime() - now.getTime()) / 3600000;
        if ((b.status === 'upcoming' || b.status === 'active') && diffHrs > 0 && diffHrs <= 24) {
          items.push({
            id: `booking-${b.id}`,
            type: 'booking',
            title: 'Upcoming Booking',
            message: `Booking reminder: starts at ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            time: start.toLocaleDateString(),
            read: false,
          });
        }
      });

      setNotifications(items.slice(0, 10));
      setLoading(false);
    }

    buildNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="h-5 w-5 text-muted-foreground" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center font-bold">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>
          <span className="font-semibold text-sm">Notifications</span>
          {unread > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 h-5">{unread} new</Badge>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-[11px] text-primary hover:underline transition-colors">
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-muted/30 p-6 text-center">
          <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-semibold">All caught up!</p>
          <p className="text-xs text-muted-foreground mt-1">No pending notifications.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const cfg = typeConfig[n.type];
            const Icon = cfg.icon;
            return (
              <div
                key={n.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-xl border transition-all duration-200',
                  n.read
                    ? 'border-border/30 bg-muted/20 opacity-60'
                    : 'border-border/60 bg-card/80 hover:bg-card shadow-sm'
                )}
              >
                <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0', cfg.bg)}>
                  <Icon className={cn('h-4 w-4', cfg.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold">{n.title}</p>
                    <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 border-0', cfg.bg, cfg.color)}>
                      {cfg.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{n.time}</p>
                </div>
                {!n.read && (
                  <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5 animate-pulse" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
