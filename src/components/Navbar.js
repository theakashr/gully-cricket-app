"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy, Home, Activity, LogIn, Menu, X, User, Settings, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, role, optInAdmin } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const navLinks = [
    { name: 'Home', icon: Home, href: '/' },
    { name: 'Matches', icon: Activity, href: '/matches' },
    { name: 'Tournaments', icon: Trophy, href: '/tournaments' },
    ...(user && (role === 'admin' || role === 'manager' || role === 'scorer' || (role === 'viewer' && optInAdmin))
      ? [{ name: 'Dashboard', icon: LogIn, href: '/dashboard' }]
      : !user
        ? [{ name: 'Dashboard', icon: LogIn, href: '/dashboard' }]
        : []
    )
  ];

  // Hide navbar on dashboard pages (dashboard has its own sidebar)
  if (pathname?.startsWith('/dashboard')) return null;
  // Hide navbar on scorer pages for fullscreen experience
  if (pathname?.startsWith('/scorer')) return null;

  return (
    <>
      {/* Top Navbar */}
      <nav className="glass sticky top-0 z-50 px-4 md:px-6 py-3 md:py-4 border-b border-[var(--color-cricket-border)] shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 md:gap-3 cursor-pointer"
            >
              <div className="w-9 h-9 md:w-11 md:h-11 rounded-full overflow-hidden flex-shrink-0 shadow-lg shadow-[var(--color-cricket-accent)]/20">
                <img src="/skcc-logo.jpg" alt="SKCC Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-lg md:text-2xl font-black tracking-tight text-[var(--color-cricket-dark)]">
                SKCC CRICKETRS <span className="text-[var(--color-cricket-accent)] neon-text-green">Live</span>
              </span>
            </motion.div>
          </Link>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex gap-8">
            {navLinks.map((item, index) => (
              <motion.div 
                key={item.name}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link 
                  href={item.href} 
                  className={`flex items-center gap-2 text-sm font-bold transition-all hover:scale-105 ${
                    pathname === item.href 
                      ? 'text-[var(--color-cricket-accent)] drop-shadow-sm' 
                      : 'text-gray-600 hover:text-[var(--color-cricket-accent)]'
                  }`}
                >
                  <item.icon size={16} /> {item.name}
                </Link>
              </motion.div>
            ))}
          </div>
          
          {/* Desktop Auth Buttons */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden md:flex items-center gap-3"
          >
            {user ? (
              <>
                <Link href="/dashboard/settings" className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-700 transition-all shadow-sm hover:shadow-md hover:scale-105">
                  <Settings size={16} /> Settings
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-2 px-5 py-2.5 bg-red-50 hover:bg-red-100 border border-red-100 rounded-full text-sm font-bold text-red-600 transition-all shadow-sm hover:shadow-md hover:scale-105">
                  <LogOut size={16} /> Logout
                </button>
              </>
            ) : (
              <Link href="/login" className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[var(--color-cricket-accent)] to-[var(--color-cricket-blue)] hover:shadow-lg hover:shadow-[var(--color-cricket-accent)]/30 rounded-full text-sm font-bold text-white transition-all hover:scale-105">
                <LogIn size={16} /> Login
              </Link>
            )}
          </motion.div>

          {/* Mobile Hamburger */}
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[var(--color-cricket-dark)] transition-colors shadow-sm"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </motion.button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden mt-3 border-t border-gray-200 pt-3 pb-2 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-xl mb-4"
          >
            <div className="space-y-2">
              {navLinks.map(item => (
                <Link 
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black text-sm transition-all ${
                    pathname === item.href
                      ? 'bg-[var(--color-cricket-accent)]/10 text-[var(--color-cricket-accent)]'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <item.icon size={18} /> {item.name}
                </Link>
              ))}
              {user ? (
                <>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-100"
                  >
                    <Settings size={18} /> Settings
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={18} /> Logout
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-white bg-[var(--color-cricket-accent)] shadow-md mt-2"
                >
                  <LogIn size={18} /> Login
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-gray-200 px-2 py-1 safe-area-bottom shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center">
          {navLinks.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all ${
                  isActive 
                    ? 'text-[var(--color-cricket-blue)] font-black' 
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <item.icon size={isActive ? 24 : 20} className={isActive ? 'drop-shadow-md transition-all duration-300' : 'transition-all duration-300'} />
                <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
