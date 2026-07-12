'use client';

import { cancelBooking } from './actions';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BookingItem {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  resource: { id: string; name: string; tag: string } | null;
  user: { id: string; name: string; email: string } | null;
}

interface BookingsTableProps {
  bookings: BookingItem[];
}

export function BookingsTable({ bookings }: BookingsTableProps) {
  const handleCancel = async (id: string) => {
    if (confirm('Are you sure you want to cancel this booking?')) {
      await cancelBooking(id);
    }
  };

  const statusColors: Record<string, string> = {
    upcoming:  'bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400',
    ongoing:   'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400',
    active:    'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400',
    completed: 'bg-muted text-muted-foreground border-border/40',
    cancelled: 'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:text-rose-400',
  };

  return (
    <div className="border border-border/60 bg-card/70 backdrop-blur-sm shadow-glass rounded-2xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50 dark:bg-zinc-900/50">
            <TableHead className="font-bold text-xs">Resource</TableHead>
            <TableHead className="font-bold text-xs">User</TableHead>
            <TableHead className="font-bold text-xs">Start Time</TableHead>
            <TableHead className="font-bold text-xs">End Time</TableHead>
            <TableHead className="font-bold text-xs">Status</TableHead>
            <TableHead className="text-right font-bold text-xs">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-24 text-gray-400 dark:text-zinc-500 italic text-xs">
                No bookings registered yet.
              </TableCell>
            </TableRow>
          ) : (
            bookings.map((booking) => (
              <TableRow key={booking.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-semibold text-gray-900 dark:text-zinc-200 text-xs">
                  {booking.resource?.name || 'Unknown Resource'} 
                  <span className="text-[10px] font-mono text-primary font-bold block mt-0.5">{booking.resource?.tag}</span>
                </TableCell>
                <TableCell className="text-xs">
                  <span className="font-semibold block">{booking.user?.name || 'Unknown User'}</span>
                  <span className="text-[10px] text-muted-foreground block">{booking.user?.email}</span>
                </TableCell>
                <TableCell className="text-xs font-medium text-muted-foreground">{new Date(booking.start_time).toLocaleString()}</TableCell>
                <TableCell className="text-xs font-medium text-muted-foreground">{new Date(booking.end_time).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md capitalize", statusColors[booking.status] || 'bg-muted text-muted-foreground')}>
                    {booking.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {(booking.status === 'upcoming' || booking.status === 'active' || booking.status === 'ongoing') && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleCancel(booking.id)}
                      className="h-8 rounded-lg text-[10px] font-bold hover:scale-[1.02] transition-transform"
                    >
                      Cancel
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
