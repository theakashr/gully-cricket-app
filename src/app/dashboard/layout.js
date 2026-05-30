"use client";
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Trophy, Shield, Users, Activity, LogOut, Home, User, Menu, X, Settings } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { role, optInAdmin, updateOptInAdmin } = useAuth();

  const allNavItems = [
    { name: 'Overview', href: '/dashboard', icon: Home },
    { name: 'Tournaments', href: '/dashboard/tournaments', icon: Trophy },
    { name: 'Teams', href: '/dashboard/teams', icon: Shield },
    { name: 'Players', href: '/dashboard/players', icon: User },
    { name: 'Matches', href: '/dashboard/matches', icon: Activity },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    { name: 'Users & Access', href: '/dashboard/users', icon: Users, reqAdmin: true },
  ];

  const navItems = allNavItems.filter(item => !item.reqAdmin || role === 'admin');

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const isSettingsPage = pathname === '/dashboard/settings';

  if (role === 'viewer' && !optInAdmin && !isSettingsPage) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'manager', 'viewer']}>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50/50">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-8 md:p-12 shadow-xl text-center space-y-8 relative overflow-hidden">
            {/* Background blur decorative element */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>

            <div className="w-20 h-20 mx-auto rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-md">
              <Shield className="text-[var(--color-cricket-accent)] animate-pulse" size={40} />
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-100/50">
                Spectator / Viewer Feature
              </span>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Opt-in to Read-Only <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-cricket-accent)] to-[var(--color-cricket-blue)]">
                  Admin Dashboard
                </span>
              </h1>
            </div>

            <p className="text-sm md:text-base text-gray-600 font-medium leading-relaxed max-w-md mx-auto">
              By default, spectator accounts do not see the club administrative panel. 
              You can opt-in to view a secure, <strong>Read-Only Mode</strong> of the dashboard. 
              This allows you to browse tournament logs, team rosters, player details, and matches without the ability to modify any live data.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-bold text-slate-700 transition-all flex items-center justify-center gap-2"
              >
                Return to Public Site
              </button>
              <button
                onClick={() => updateOptInAdmin(true)}
                className="px-8 py-3.5 bg-gradient-to-r from-[var(--color-cricket-accent)] to-[var(--color-cricket-blue)] hover:shadow-lg hover:shadow-[var(--color-cricket-accent)]/20 text-white font-black uppercase tracking-wider text-xs rounded-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                Yes, Enable Read-Only Admin Panel
              </button>
            </div>

            <p className="text-[11px] text-slate-400 font-semibold italic pt-2">
              * You can toggle this setting off anytime from the Account Settings page.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'manager', 'viewer']}>
      <div className="flex min-h-screen bg-slate-50/50">
        
        {/* Mobile Top Bar */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-slate-200 px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[var(--color-cricket-accent)]/30 flex-shrink-0">
              <img src="/11shots-logo.png?v=2" alt="11shots Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tighter">
                11shots <span className="text-[var(--color-cricket-accent)]">CRICKETRS</span>
              </h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Admin Panel</p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            {sidebarOpen ? <X size={22} className="text-slate-900" /> : <Menu size={22} className="text-slate-900" />}
          </button>
        </div>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - Desktop always visible, Mobile slide-in */}
        <aside className={`
          fixed md:sticky top-0 left-0 h-screen z-50
          w-64 glass border-r border-slate-200 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0
        `}>
          {/* Logo - Desktop only (mobile has its own top bar) */}
          <div className="hidden md:flex p-6 items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[var(--color-cricket-accent)]/30 flex-shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <img src="/11shots-logo.png?v=2" alt="11shots Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tighter">
                11shots <span className="text-[var(--color-cricket-accent)]">CRICKETRS</span>
              </h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Admin Panel</p>
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
                      ? 'bg-[var(--color-cricket-accent)]/15 text-[var(--color-cricket-accent)] border border-[var(--color-cricket-accent)]/20 shadow-[0_4px_12px_rgba(16,185,129,0.08)]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <item.icon size={20} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 font-bold transition-colors"
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
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-slate-200 px-1 py-1 safe-area-bottom">
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
                      : 'text-slate-500'
                  }`}
                >
                  <item.icon size={18} className={isActive ? 'drop-shadow-[0_2px_4px_rgba(16,185,129,0.3)]' : ''} />
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
