'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Mail, Lock, ArrowRight, Layers } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setError('');
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Theme Toggle — top right */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Animated background blobs */}
      <div className="absolute inset-0 dot-grid opacity-60" />
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/20 dark:bg-blue-500/10 blur-[120px] animate-float" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-violet-500/20 dark:bg-violet-500/10 blur-[130px] animate-float-delayed" />
      <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-cyan-500/15 dark:bg-cyan-500/10 blur-[100px] animate-pulse-glow" />

      {/* Floating decorative shapes */}
      <div className="absolute top-[12%] left-[8%] w-16 h-16 rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-sm rotate-12 animate-float opacity-70" />
      <div className="absolute bottom-[18%] left-[12%] w-10 h-10 rounded-full border border-violet-400/30 bg-violet-400/5 backdrop-blur-sm animate-float-delayed opacity-60" />
      <div className="absolute top-[25%] right-[10%] w-12 h-12 rounded-xl border border-cyan-400/20 bg-cyan-400/5 backdrop-blur-sm -rotate-6 animate-pulse-glow opacity-60" />
      <div className="absolute top-[60%] right-[5%] w-8 h-8 rounded-lg border border-primary/20 bg-primary/5 rotate-45 animate-float opacity-50" />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-slide-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8 opacity-0 animate-fade-in anim-delay-100" style={{ animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-animated shadow-glow-blue">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-gradient">AssetFlow</span>
        </div>

        {/* Glass card */}
        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-glass p-8 space-y-6">
          {/* Header */}
          <div className="space-y-1 opacity-0 animate-fade-in anim-delay-200" style={{ animationFillMode: 'forwards' }}>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your AssetFlow workspace</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2 opacity-0 animate-slide-up anim-delay-200" style={{ animationFillMode: 'forwards' }}>
              <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  className="pl-9 h-10 bg-background/50 border-border/60 focus:border-primary/60 transition-colors"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2 opacity-0 animate-slide-up anim-delay-300" style={{ animationFillMode: 'forwards' }}>
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9 h-10 bg-background/50 border-border/60 focus:border-primary/60 transition-colors"
                  {...register('password')}
                />
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="opacity-0 animate-slide-up anim-delay-400" style={{ animationFillMode: 'forwards' }}>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-gradient-animated text-white font-semibold shadow-glow-blue hover:shadow-glow-violet transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </form>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground opacity-0 animate-fade-in anim-delay-500" style={{ animationFillMode: 'forwards' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-primary hover:text-primary/80 transition-colors underline underline-offset-4">
              Create one
            </Link>
          </div>
        </div>

        {/* Feature hints */}
        <div className="flex items-center justify-center gap-6 mt-6 opacity-0 animate-fade-in anim-delay-500" style={{ animationFillMode: 'forwards' }}>
          {['Asset Tracking', 'Role-Based Access', 'Real-time Reports'].map((f) => (
            <span key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
