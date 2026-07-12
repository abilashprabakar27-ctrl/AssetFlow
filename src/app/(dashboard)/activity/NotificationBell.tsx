'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotificationBell() {
  const [notifications, setNotifications] = useState([
    { id: '1', message: 'System alert: Asset checkout overdue for user John Doe', read: false },
    { id: '2', message: 'Booking overlap checked: System validation enabled', read: false },
    { id: '3', message: 'New asset register success: Projector PX-100 is online', read: true },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center gap-4">
        <div className="relative p-2 rounded-full bg-gray-100 hover:bg-gray-200 cursor-pointer transition">
          <Bell className="h-6 h-6 text-gray-700" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            Mark all read
          </Button>
        )}
      </div>
      
      <div className="mt-4 border rounded-lg bg-white divide-y max-w-md shadow-sm">
        {notifications.map((n) => (
          <div 
            key={n.id} 
            className={`p-3 text-sm transition-colors ${n.read ? 'bg-white text-gray-500' : 'bg-blue-50/50 text-gray-900 font-medium'}`}
          >
            {n.message}
          </div>
        ))}
      </div>
    </div>
  );
}
