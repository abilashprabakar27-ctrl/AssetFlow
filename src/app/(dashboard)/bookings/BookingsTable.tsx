'use client';

import { cancelBooking } from './actions';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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

  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Resource</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Start Time</TableHead>
            <TableHead>End Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-24 text-gray-500">
                No bookings found.
              </TableCell>
            </TableRow>
          ) : (
            bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-medium">
                  {booking.resource?.name || 'Unknown Resource'} 
                  <span className="text-xs text-gray-500 block">{booking.resource?.tag}</span>
                </TableCell>
                <TableCell>
                  {booking.user?.name || 'Unknown User'}
                  <span className="text-xs text-gray-500 block">{booking.user?.email}</span>
                </TableCell>
                <TableCell>{new Date(booking.start_time).toLocaleString()}</TableCell>
                <TableCell>{new Date(booking.end_time).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={booking.status === 'active' ? 'default' : 'secondary'}>
                    {booking.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {booking.status === 'active' && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleCancel(booking.id)}
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
