'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const bookingSchema = z.object({
  resourceId: z.string().min(1, 'Resource is required'),
  userId: z.string().min(1, 'User is required'),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid start time',
  }),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid end time',
  }),
});

export async function fetchBookableAssets() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('assets')
    .select('id, name, tag, status')
    .eq('is_bookable', true);

  if (error) {
    console.error('Error fetching bookable assets:', error);
    return [];
  }
  return data;
}

export async function fetchBookings() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      start_time,
      end_time,
      status,
      resource:assets(id, name, tag),
      user:users(id, name, email)
    `)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching bookings:', error);
    return [];
  }

  interface RawBookingRow {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    resource: { id: string; name: string; tag: string }[] | { id: string; name: string; tag: string } | null;
    user: { id: string; name: string; email: string }[] | { id: string; name: string; email: string } | null;
  }

  // Coerce Supabase relationships that might be returned as arrays in TypeScript definitions
  return (data || []).map((b: RawBookingRow) => ({
    id: b.id,
    start_time: b.start_time,
    end_time: b.end_time,
    status: b.status,
    resource: Array.isArray(b.resource) ? b.resource[0] : b.resource,
    user: Array.isArray(b.user) ? b.user[0] : b.user,
  }));
}

export async function createBooking(prevState: { success: boolean; error: string | null } | null, formData: FormData) {
  const supabase = createClient();

  // Get current logged-in auth user
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) {
    return { success: false, error: 'Unauthorized. Please log in.' };
  }

  // Fetch role and details of current user from DB
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id, role, department_id')
    .eq('id', authUser.id)
    .single();

  if (profileError || !userProfile) {
    return { success: false, error: 'User profile not found.' };
  }

  const rawData = {
    resourceId: formData.get('resourceId'),
    userId: formData.get('userId'),
    startTime: formData.get('startTime'),
    endTime: formData.get('endTime'),
  };

  const validated = bookingSchema.safeParse(rawData);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  const { resourceId, userId, startTime, endTime } = validated.data;

  if (new Date(startTime) >= new Date(endTime)) {
    return { success: false, error: 'Start time must be before end time.' };
  }

  // RBAC Check
  if (userProfile.role === 'employee' && userId !== userProfile.id) {
    return { success: false, error: 'Employees can only book for themselves.' };
  }

  if (userProfile.role === 'department_head' && userId !== userProfile.id) {
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('department_id')
      .eq('id', userId)
      .single();

    if (targetError || !targetUser) {
      return { success: false, error: 'Target user not found.' };
    }

    if (targetUser.department_id !== userProfile.department_id) {
      return { success: false, error: 'Department heads can only book for members of their own department.' };
    }
  }

  // Overlap Detection — fetch all active/upcoming bookings for this resource
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('id, start_time, end_time, status')
    .eq('resource_id', resourceId);

  const newStart = new Date(startTime).getTime();
  const newEnd = new Date(endTime).getTime();

  const overlapping = (existingBookings || []).filter((b: any) => {
    if (b.status === 'cancelled' || b.status === 'completed') return false;
    const bStart = new Date(b.start_time).getTime();
    const bEnd = new Date(b.end_time).getTime();
    // Overlap: new starts before existing ends AND new ends after existing starts
    // End-to-start (bEnd === newStart) is NOT an overlap (spec: 10:00 end → 10:00 start is allowed)
    return newStart < bEnd && newEnd > bStart;
  });

  if (overlapping.length > 0) {
    const clash = overlapping[0];
    const clashStart = new Date(clash.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const clashEnd = new Date(clash.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return { success: false, error: `This resource is already booked from ${clashStart} to ${clashEnd}. Please choose a different time.` };
  }

  // Get resource name for the log
  const { data: resourceData } = await supabase.from('assets').select('name, tag').eq('id', resourceId).single();
  const resourceLabel = resourceData ? `${resourceData.name} (${resourceData.tag})` : resourceId;

  const { error: insertError } = await supabase
    .from('bookings')
    .insert([
      {
        resource_id: resourceId,
        user_id: userId,
        start_time: startTime,
        end_time: endTime,
        status: 'upcoming',
      },
    ]);

  if (insertError) {
    console.error('Error inserting booking:', insertError);
    return { success: false, error: insertError.message || 'Failed to create booking.' };
  }

  // Activity Log
  await supabase.from('activity_logs').insert([
    {
      user_id: userProfile.id,
      action: 'Create Booking',
      details: `Booked ${resourceLabel} from ${new Date(startTime).toLocaleString()} to ${new Date(endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    },
  ]);

  revalidatePath('/bookings');
  return { success: true, error: null };
}

export async function cancelBooking(bookingId: string) {
  const supabase = createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return { success: false, error: 'Unauthorized.' };
  }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId);

  if (error) {
    console.error('Error cancelling booking:', error);
    return { success: false, error: 'Failed to cancel booking.' };
  }

  // Create Activity Log
  await supabase.from('activity_logs').insert([
    {
      user_id: authUser.id,
      action: 'Cancel Booking',
      details: `Cancelled booking ID: ${bookingId}`,
    },
  ]);

  revalidatePath('/bookings');
  return { success: true };
}
