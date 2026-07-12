'use client';
import { useTheme } from './ThemeProvider';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycle}
      title={`Theme: ${theme}. Click to cycle.`}
      className="relative h-9 w-9 p-0 rounded-full border border-border hover:border-primary/40 transition-all duration-200"
    >
      <Sun  className={`h-4 w-4 transition-all duration-300 ${theme === 'light' ? 'opacity-100 scale-100' : 'opacity-0 scale-0 absolute'}`} />
      <Moon className={`h-4 w-4 transition-all duration-300 ${theme === 'dark'  ? 'opacity-100 scale-100' : 'opacity-0 scale-0 absolute'}`} />
      <Monitor className={`h-4 w-4 transition-all duration-300 ${theme === 'system' ? 'opacity-100 scale-100' : 'opacity-0 scale-0 absolute'}`} />
    </Button>
  );
}
