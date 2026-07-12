import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
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

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    department_head: 'Department Head',
    employee: 'Employee'
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-red-50 text-red-700 border-red-200',
    asset_manager: 'bg-blue-50 text-blue-700 border-blue-200',
    department_head: 'bg-purple-50 text-purple-700 border-purple-200',
    employee: 'bg-green-50 text-green-700 border-green-200'
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
    { name: 'Asset Directory', href: '/assets', icon: Boxes, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
    { name: 'Resource Bookings', href: '/bookings', icon: Calendar, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
    { name: 'Maintenance', href: '/maintenance', icon: Wrench, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
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
    <div className="flex min-h-screen bg-gray-50/50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r bg-white flex-col md:flex">
        {/* Brand */}
        <div className="flex h-16 items-center px-6 border-b">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-blue-600">
            <Boxes className="h-6 w-6" />
            <span>AssetFlow</span>
          </Link>
        </div>

        {/* User Card */}
        <div className="p-4 border-b bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-semibold shadow-sm">
              {userProfile.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate text-gray-900">{userProfile.name}</p>
              <p className="text-xs text-gray-500 truncate">{userProfile.email}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider",
              roleColors[userProfile.role] || 'bg-gray-100 text-gray-800'
            )}>
              {roleLabels[userProfile.role] || userProfile.role}
            </span>
            {userProfile.department?.name && (
              <span className="text-xs text-gray-500 font-medium truncate max-w-[120px]" title={userProfile.department.name}>
                {userProfile.department.name}
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems
            .filter((item) => item.roles.some((r) => activeRoles.includes(r)))
            .map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <item.icon className="h-5 w-5 text-gray-500 group-hover:text-gray-900" />
                {item.name}
              </Link>
            ))}
        </nav>

        {/* Footer / Logout */}
        <div className="p-4 border-t">
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Log Out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col">
        {/* Mobile Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-4 md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-blue-600">
            <Boxes className="h-6 w-6" />
            <span>AssetFlow</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/activity" className="p-2 text-gray-500 hover:text-gray-700">
              <Bell className="h-5 w-5" />
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="p-2 text-red-600 hover:text-red-800">
                <LogOut className="h-5 w-5" />
              </button>
            </form>
          </div>
        </header>

        {/* Desktop Header Navigation bar */}
        <header className="sticky top-0 z-10 hidden h-16 items-center justify-end border-b bg-white px-8 md:flex shadow-sm">
          <div className="flex items-center gap-6">
            <Link href="/activity" className="relative p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors" title="System Logs & Notifications">
              <Bell className="h-5 w-5" />
            </Link>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4 text-gray-400" />
              <span>Session Mode: <strong className="text-gray-900 font-semibold uppercase text-xs tracking-wider">Local Mock</strong></span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
