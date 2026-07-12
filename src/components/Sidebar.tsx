'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, 
  Settings, 
  Package, 
  Layers, 
  GitMerge, 
  Calendar, 
  Wrench, 
  ClipboardCheck, 
  BarChart2, 
  Activity, 
  LogOut
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
  { href: '/admin/org-setup', label: 'Organization Setup', icon: Settings, roles: ['admin'] },
  { href: '/assets', label: 'Asset Directory', icon: Package, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
  { href: '/assets/register', label: 'Asset Registration', icon: Layers, roles: ['admin', 'asset_manager'] },
  { href: '/assets/allocate', label: 'Allocation & Transfer', icon: GitMerge, roles: ['admin', 'asset_manager', 'department_head'] },
  { href: '/bookings', label: 'Resource Bookings', icon: Calendar, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
  { href: '/maintenance', label: 'Maintenance Workflows', icon: Wrench, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
  { href: '/audit', label: 'Asset Audit', icon: ClipboardCheck, roles: ['admin', 'asset_manager'] },
  { href: '/reports', label: 'Reports & Analytics', icon: BarChart2, roles: ['admin', 'asset_manager'] },
  { href: '/activity', label: 'Activity & Alerts', icon: Activity, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [role, setRole] = useState<string>('employee');

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role) {
          setRole(profile.role);
        }
      }
    }
    getProfile();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="flex flex-col w-60 min-h-screen border-r border-border/60 bg-card/50 backdrop-blur-sm shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border/60">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-animated shadow-glow-blue flex-shrink-0">
          <Layers className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gradient leading-none">AssetFlow</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Enterprise ERP</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Menu Options</p>
        {navItems
          .filter((item) => {
            // Organization Setup is admin-only
            if (item.href === '/admin/org-setup' && role !== 'admin') {
              return false;
            }
            return true;
          })
          .map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                data-active={active}
                className="nav-item"
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate text-xs font-semibold">{label}</span>
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
                )}
              </Link>
            );
          })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-border/60 space-y-2">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs text-muted-foreground font-medium">Theme</span>
          <ThemeToggle />
        </div>
        <button
          onClick={handleLogout}
          className="nav-item w-full text-left text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span className="text-xs font-semibold">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
