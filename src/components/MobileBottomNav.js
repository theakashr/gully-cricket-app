"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Activity, Trophy, User } from 'lucide-react';

export default function MobileBottomNav() {
  const pathname = usePathname();

  // Hide on dashboard and scorer screens
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/scorer')) {
    return null;
  }

  const tabs = [
    { name: 'Home', icon: Home, href: '/' },
    { name: 'Matches', icon: Activity, href: '/matches' },
    { name: 'Leagues', icon: Trophy, href: '/tournaments' },
    { name: 'Profile', icon: User, href: '/profile' }, // Just an example, maybe they don't have a profile page yet
  ];

  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)] pt-1 px-6 flex justify-between items-center z-50 md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      {tabs.map((tab) => {
        const isActive = tab.href === '/' ? pathname === '/' : pathname?.startsWith(tab.href);
        const Icon = tab.icon;
        
        return (
          <Link 
            key={tab.name}
            href={tab.href}
            className={`flex flex-col items-center justify-center w-14 h-14 active:scale-95 transition-transform ${
              isActive ? 'text-[#00A854]' : 'text-slate-400'
            }`}
          >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-bold mt-1">{tab.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
