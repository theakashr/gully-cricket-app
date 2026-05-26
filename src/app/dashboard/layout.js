"use client";
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Trophy, Shield, Users, Activity, LogOut, Home, User, Menu, X } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: Home },
    { name: 'Tournaments', href: '/dashboard/tournaments', icon: Trophy },
    { name: 'Teams', href: '/dashboard/teams', icon: Shield },
    { name: 'Players', href: '/dashboard/players', icon: User },
    { name: 'Matches', href: '/dashboard/matches', icon: Activity },
    { name: 'Users & Access', href: '/dashboard/users', icon: Users },
  ];

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="flex min-h-screen bg-black">
        
        {/* Mobile Top Bar */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-white/10 px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[var(--color-cricket-accent)]/30 flex-shrink-0">
              <img src="/skcc-logo.jpg" alt="SKCC Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-tighter">
                SKCC <span className="text-[var(--color-cricket-accent)]">CRICKETRS</span>
              </h2>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Admin Panel</p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            {sidebarOpen ? <X size={22} className="text-white" /> : <Menu size={22} className="text-white" />}
          </button>
        </div>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - Desktop always visible, Mobile slide-in */}
        <aside className={`
          fixed md:sticky top-0 left-0 h-screen z-50
          w-64 glass border-r border-white/10 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0
        `}>
          {/* Logo - Desktop only (mobile has its own top bar) */}
          <div className="hidden md:flex p-6 items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[var(--color-cricket-accent)]/30 flex-shrink-0 shadow-[0_0_15px_rgba(0,255,65,0.15)]">
              <img src="/skcc-logo.jpg" alt="SKCC Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tighter">
                SKCC <span className="text-[var(--color-cricket-accent)]">CRICKETRS</span>
              </h2>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Admin Panel</p>
            </div>
          </div>

          {/* Mobile spacer for top bar */}
          <div className="md:hidden h-16"></div>

          <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${
                    isActive
                      ? 'bg-[var(--color-cricket-accent)]/20 text-[var(--color-cricket-accent)] border border-[var(--color-cricket-accent)]/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon size={20} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/10">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 font-bold transition-colors"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pt-16 md:pt-0 pb-20 md:pb-0">
          {children}
        </main>

        {/* Mobile Bottom Tab Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-white/10 px-1 py-1 safe-area-bottom">
          <div className="flex justify-around items-center">
            {navItems.slice(0, 5).map(item => {
              const isActive = pathname === item.href;
              return (
                <Link 
                  key={item.name}
                  href={item.href}
                  className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all min-w-0 ${
                    isActive 
                      ? 'text-[var(--color-cricket-accent)]' 
                      : 'text-gray-500'
                  }`}
                >
                  <item.icon size={18} className={isActive ? 'drop-shadow-[0_0_6px_rgba(0,255,65,0.6)]' : ''} />
                  <span className="text-[9px] font-bold mt-0.5 uppercase tracking-wider truncate">{item.name.split(' ')[0]}</span>
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    </ProtectedRoute>
  );
}
