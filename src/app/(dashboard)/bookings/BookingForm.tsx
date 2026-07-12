'use client';

import { useFormState } from 'react-dom';
import { createBooking } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const initialState = {
  success: false,
  error: null as string | null,
};

interface BookingFormProps {
  resources: { id: string; name: string; tag: string }[];
  users: { id: string; name: string; email: string }[];
  currentUserId: string;
}

export function BookingForm({ resources, users, currentUserId }: BookingFormProps) {
  const [state, formAction] = useFormState(createBooking, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Book a Resource</CardTitle>
        <CardDescription>Reserve a bookable and available asset.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resourceId">Resource / Asset</Label>
            <Select name="resourceId" required>
              <SelectTrigger>
                <SelectValue placeholder="Select a resource" />
              </SelectTrigger>
              <SelectContent>
                {resources.length === 0 ? (
                  <SelectItem value="none" disabled>No bookable resources available</SelectItem>
                ) : (
                  resources.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.tag})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="userId">Book For User</Label>
            <Select name="userId" defaultValue={currentUserId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input type="datetime-local" name="startTime" required className="bg-white text-black" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input type="datetime-local" name="endTime" required className="bg-white text-black" />
            </div>
          </div>

          {state?.error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {state.error}
            </div>
          )}

          {state?.success && (
            <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
              Booking submitted successfully!
            </div>
          )}

          <Button type="submit" className="w-full">
            Confirm Booking
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
