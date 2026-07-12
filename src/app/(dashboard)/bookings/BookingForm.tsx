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
    <Card className="border-border/60 bg-card/70 backdrop-blur-sm shadow-glass rounded-2xl overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-animated" />
      <CardHeader className="pt-6">
        <CardTitle className="text-xl font-bold tracking-tight">Book a Resource</CardTitle>
        <CardDescription className="text-xs text-muted-foreground mt-1">Reserve a bookable and available asset.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="resourceId" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resource / Asset</Label>
            <Select name="resourceId" required>
              <SelectTrigger className="bg-background/50 border-border/50 dark:bg-zinc-950 dark:border-zinc-800">
                <SelectValue placeholder="Select a resource" />
              </SelectTrigger>
              <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                {resources.length === 0 ? (
                  <SelectItem value="none" disabled className="text-xs">No bookable resources available</SelectItem>
                ) : (
                  resources.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      {r.name} ({r.tag})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="userId" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Book For User</Label>
            <Select name="userId" defaultValue={currentUserId} required>
              <SelectTrigger className="bg-background/50 border-border/50 dark:bg-zinc-950 dark:border-zinc-800">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id} className="text-xs">
                    {u.name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startTime" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start Time</Label>
              <Input type="datetime-local" name="startTime" required className="bg-background/50 border-border/50 dark:bg-zinc-950 dark:border-zinc-800 text-foreground text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endTime" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End Time</Label>
              <Input type="datetime-local" name="endTime" required className="bg-background/50 border-border/50 dark:bg-zinc-950 dark:border-zinc-800 text-foreground text-xs" />
            </div>
          </div>

          {state?.error && (
            <div className="p-3 text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
              {state.error}
            </div>
          )}

          {state?.success && (
            <div className="p-3 text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-xl dark:text-emerald-400">
              Booking submitted successfully!
            </div>
          )}

          <Button type="submit" className="w-full h-10 bg-gradient-animated text-white font-bold shadow-glow-blue hover:scale-[1.01] transition-all duration-200 rounded-xl text-xs mt-2">
            Confirm Booking
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
