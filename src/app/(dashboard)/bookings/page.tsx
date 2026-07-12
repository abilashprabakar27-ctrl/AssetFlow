import { fetchBookableAssets, fetchBookings } from './actions';
import { BookingForm } from './BookingForm';
import { BookingsTable } from './BookingsTable';
import { createClient } from '@/lib/supabase/server';
import { Calendar } from 'lucide-react';

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
    <div className="relative min-h-screen p-6 lg:p-8 space-y-8 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-5%] right-[-5%] w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-animated shadow-glow-blue flex-shrink-0">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-zinc-50">Resource Bookings</h1>
            <p className="text-muted-foreground text-sm mt-1">Book, schedule, and view bookings for shared corporate devices.</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 grid md:grid-cols-3 gap-8 animate-in fade-in duration-500 delay-150">
        <div className="md:col-span-1">
          <BookingForm 
            resources={resources} 
            users={users} 
            currentUserId={currentUserId} 
          />
        </div>
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Active & Historic Bookings</h2>
          <BookingsTable bookings={bookings} />
        </div>
      </div>
    </div>
  );
}
