'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, GitMerge, Calendar,
  Activity, BarChart2, Settings, Layers, LogOut,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/assets',     label: 'Assets',      icon: Package },
  { href: '/allocations',label: 'Allocations', icon: GitMerge },
  { href: '/bookings',   label: 'Bookings',    icon: Calendar },
  { href: '/activity',   label: 'Activity',    icon: Activity },
  { href: '/reports',    label: 'Reports',     icon: BarChart2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="flex flex-col w-60 min-h-screen border-r border-border/60 bg-card/50 backdrop-blur-sm">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border/60">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-animated shadow-glow-blue flex-shrink-0">
          <Layers className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gradient leading-none">AssetFlow</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Enterprise ERP</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Main</p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              data-active={active}
              className="nav-item"
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
              )}
            </Link>
          );
        })}

        <div className="pt-4">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Admin</p>
          <Link
            href="/admin/org-setup"
            data-active={pathname.startsWith('/admin')}
            className="nav-item"
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            Org Setup
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-border/60 space-y-2">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        <button
          onClick={handleLogout}
          className="nav-item w-full text-left text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
