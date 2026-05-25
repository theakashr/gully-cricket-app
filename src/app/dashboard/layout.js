"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Trophy, Shield, Users, Activity, LogOut, Home } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: Home },
    { name: 'Tournaments', href: '/dashboard/tournaments', icon: Trophy },
    { name: 'Teams & Players', href: '/dashboard/teams', icon: Shield },
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
        {/* Sidebar */}
        <aside className="w-64 glass border-r border-white/10 flex flex-col">
          <div className="p-6">
            <h2 className="text-2xl font-black text-white italic tracking-tighter">
              GULLY<span className="text-[var(--color-cricket-accent)]">CRICKET</span>
            </h2>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Admin Panel</p>
          </div>

          <nav className="flex-1 px-4 space-y-2 mt-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
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
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
