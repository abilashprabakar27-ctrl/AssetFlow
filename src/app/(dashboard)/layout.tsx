import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Boxes, 
  Calendar, 
  Wrench, 
  ClipboardCheck, 
  BarChart3, 
  Settings, 
  LogOut, 
  User,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationBell } from './activity/NotificationBell';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch full user profile
  const { data: profile } = await supabase
    .from('users')
    .select('name, email, role, department:departments(name)')
    .eq('id', user.id)
    .single();

  const userProfile = profile || {
    name: user.email?.split('@')[0] || 'User',
    email: user.email || '',
    role: 'employee',
    department: null
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    asset_manager: 'Asset Manager',
    department_head: 'Dept Head',
    employee: 'Staff Member'
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-red-500/10 text-red-400 border-red-500/20',
    asset_manager: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    department_head: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    employee: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
    { name: 'Asset Directory', href: '/assets', icon: Boxes, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
    { name: 'Resource Bookings', href: '/bookings', icon: Calendar, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
    { name: 'Maintenance Log', href: '/maintenance', icon: Wrench, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
    { name: 'Audit Cycles', href: '/audit', icon: ClipboardCheck, roles: ['admin', 'asset_manager', 'department_head'] },
    { name: 'Reports & Analytics', href: '/reports', icon: BarChart3, roles: ['admin', 'asset_manager'] },
    { name: 'Organization Setup', href: '/admin/org-setup', icon: Settings, roles: ['admin'] },
  ];

  // Logout Server Action
  async function logoutAction() {
    'use server';
    const serverSupabase = createClient();
    await serverSupabase.auth.signOut();
    redirect('/login');
  }

  const activeRoles = [userProfile.role];

  return (
    <div className="flex min-h-screen bg-[#fafafc]">
      {/* Sidebar - Dark theme for high contrast premium appeal */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-68 border-r border-slate-900 bg-slate-950 flex-col md:flex shadow-2xl">
        {/* Brand/Logo */}
        <div className="flex h-20 items-center px-6 border-b border-slate-900/60 bg-slate-950">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
              <Boxes className="h-5.5 w-5.5 animate-pulse-slow" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-white font-heading">AssetFlow</span>
              <span className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase font-semibold">V2.0 PRO</span>
            </div>
          </Link>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-slate-900/60 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold shadow-md border-2 border-indigo-400/20 font-heading">
              {userProfile.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate text-white">{userProfile.name}</p>
              <p className="text-[11px] text-slate-400 truncate font-mono">{userProfile.email}</p>
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between gap-2">
            <span className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider font-mono",
              roleColors[userProfile.role] || 'bg-slate-800 text-slate-300 border-slate-700'
            )}>
              {roleLabels[userProfile.role] || userProfile.role}
            </span>
            {userProfile.department?.name && (
              <span className="text-[11px] text-indigo-400 font-semibold bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10 truncate max-w-[120px]" title={userProfile.department.name}>
                {userProfile.department.name}
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5 px-3 py-6 overflow-y-auto premium-scroll">
          {navItems
            .filter((item) => item.roles.some((r) => activeRoles.includes(r)))
            .map((item) => {
              // Note: active style comparison is done client side in child pages,
              // but we apply consistent styling so it looks amazing on hover and general state.
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="group flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-900/60 hover:text-white transition-all duration-300 border border-transparent hover:border-slate-800/40"
                >
                  <item.icon className="h-5 w-5 text-slate-500 group-hover:text-indigo-400 transition-colors duration-300" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-900/60 bg-slate-950/20">
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 border border-transparent hover:border-rose-500/20 transition-all duration-300"
            >
              <LogOut className="h-5 w-5" />
              <span>Log Out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-68 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="sticky top-0 z-35 flex h-16 items-center justify-between border-b bg-white/70 backdrop-blur-md px-5 md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-indigo-600">
            <Boxes className="h-6 w-6" />
            <span className="font-heading">AssetFlow</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/activity" className="relative p-2 text-slate-500 hover:text-indigo-600 rounded-full hover:bg-slate-100 transition-all">
              <Bell className="h-5 w-5" />
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-full transition-all">
                <LogOut className="h-5 w-5" />
              </button>
            </form>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="sticky top-0 z-35 hidden h-20 items-center justify-end border-b border-slate-100 bg-white/80 backdrop-blur-md px-10 md:flex shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-6">
            <NotificationBell />
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-2.5 text-xs text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200/50 font-mono shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Engine: <strong className="text-slate-700 font-bold uppercase">Supabase Cloud</strong></span>
            </div>
          </div>
        </header>

        {/* Main Content container */}
        <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
