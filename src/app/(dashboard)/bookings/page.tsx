import { fetchBookableAssets, fetchBookings } from './actions';
import { BookingForm } from './BookingForm';
import { BookingsTable } from './BookingsTable';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function BookingsPage() {
  const supabase = createClient();
  
  // Get active session user
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const currentUserId = authUser?.id || '';

  // Fetch bookable assets
  const resources = await fetchBookableAssets();

  // Fetch all users for select list mapping
  const { data: usersData } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('status', 'active');
  
  const users = usersData || [];

  // Fetch bookings list
  const bookings = await fetchBookings();

  return (
    <div className="container mx-auto py-10 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resource Bookings</h1>
        <p className="text-gray-500">Manage, book, and schedule available resources.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <BookingForm 
            resources={resources} 
            users={users} 
            currentUserId={currentUserId} 
          />
        </div>
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">Active & Historic Bookings</h2>
          <BookingsTable bookings={bookings} />
        </div>
      </div>
    </div>
  );
}
