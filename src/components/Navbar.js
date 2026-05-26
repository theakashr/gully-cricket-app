"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy, Home, Activity, LogIn, Menu, X, User } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Home', icon: Home, href: '/' },
    { name: 'Matches', icon: Activity, href: '/matches' },
    { name: 'Tournaments', icon: Trophy, href: '/tournaments' },
    { name: 'Dashboard', icon: LogIn, href: '/dashboard' },
  ];

  // Hide navbar on dashboard pages (dashboard has its own sidebar)
  if (pathname?.startsWith('/dashboard')) return null;
  // Hide navbar on scorer pages for fullscreen experience
  if (pathname?.startsWith('/scorer')) return null;

  return (
    <>
      {/* Top Navbar */}
      <nav className="glass sticky top-0 z-50 px-4 md:px-6 py-3 md:py-4 border-b border-[var(--color-cricket-border)]">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 md:gap-3 cursor-pointer"
            >
              <div className="p-1.5 md:p-2 bg-[var(--color-cricket-accent)]/10 rounded-lg md:rounded-xl border border-[var(--color-cricket-accent)]/30">
                <Trophy size={20} className="text-[var(--color-cricket-accent)] md:w-6 md:h-6" />
              </div>
              <span className="text-lg md:text-2xl font-black tracking-tight text-white">
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
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    pathname === item.href 
                      ? 'text-[var(--color-cricket-accent)]' 
                      : 'text-gray-300 hover:text-[var(--color-cricket-accent)]'
                  }`}
                >
                  <item.icon size={16} /> {item.name}
                </Link>
              </motion.div>
            ))}
          </div>
          
          {/* Desktop Login Button */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden md:block"
          >
            <Link href="/login" className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-semibold text-white transition-all hover:border-[var(--color-cricket-accent)]/50 hover:shadow-[0_0_15px_rgba(0,255,65,0.2)]">
              <LogIn size={16} /> Login
            </Link>
          </motion.div>

          {/* Mobile Hamburger */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {mobileMenuOpen ? <X size={24} className="text-white" /> : <Menu size={24} className="text-white" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden mt-3 border-t border-white/10 pt-3 pb-2"
          >
            <div className="space-y-1">
              {navLinks.map(item => (
                <Link 
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                    pathname === item.href
                      ? 'bg-[var(--color-cricket-accent)]/10 text-[var(--color-cricket-accent)]'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <item.icon size={18} /> {item.name}
                </Link>
              ))}
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-gray-300 hover:bg-white/5"
              >
                <LogIn size={18} /> Login
              </Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10 px-2 py-1 safe-area-bottom">
        <div className="flex justify-around items-center">
          {navLinks.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all ${
                  isActive 
                    ? 'text-[var(--color-cricket-accent)]' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <item.icon size={20} className={isActive ? 'drop-shadow-[0_0_8px_rgba(0,255,65,0.6)]' : ''} />
                <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
