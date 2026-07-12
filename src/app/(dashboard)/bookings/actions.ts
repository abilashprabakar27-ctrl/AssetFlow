'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const bookingSchema = z.object({
  resourceId: z.string().uuid(),
  userId: z.string().uuid(),
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
    .select('id, name, tag')
    .eq('is_bookable', true)
    .eq('status', 'available');

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

  // Handshake 2: RBAC Check
  // If employee: can only book for their own ID
  if (userProfile.role === 'employee' && userId !== userProfile.id) {
    return { success: false, error: 'Employees can only book for themselves.' };
  }

  // If department_head: allow booking for self OR their department_id matching the target user's department_id
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

  // Insert Booking and check for overlapping booking via Postgres Exclude Constraint (or DB return check)
  const { error: insertError } = await supabase
    .from('bookings')
    .insert([
      {
        resource_id: resourceId,
        user_id: userId,
        start_time: startTime,
        end_time: endTime,
        status: 'active',
      },
    ]);

  if (insertError) {
    console.error('Error inserting booking:', insertError);
    if (insertError.code === '23P01') {
      return { success: false, error: 'This resource is already booked during the selected timeframe.' };
    }
    return { success: false, error: insertError.message || 'Failed to create booking.' };
  }

  // Create Activity Log
  await supabase.from('activity_logs').insert([
    {
      user_id: userProfile.id,
      action: 'Create Booking',
      details: `Booked resource ${resourceId} for user ${userId} from ${startTime} to ${endTime}`,
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
