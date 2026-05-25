"use client";
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Trophy, Home, Activity, LogIn, Calendar } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="glass sticky top-0 z-50 px-6 py-4 border-b border-[var(--color-cricket-border)]">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="p-2 bg-[var(--color-cricket-accent)]/10 rounded-xl border border-[var(--color-cricket-accent)]/30">
              <Trophy size={24} className="text-[var(--color-cricket-accent)]" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">
              Gully Cricket <span className="text-[var(--color-cricket-accent)] neon-text-green">Live</span>
            </span>
          </motion.div>
        </Link>
        
        <div className="hidden md:flex gap-8">
          {[
            { name: 'Home', icon: Home, href: '/' },
            { name: 'Matches', icon: Activity, href: '/matches' },
            { name: 'Tournaments', icon: Trophy, href: '/tournaments' },
            { name: 'Dashboard', icon: LogIn, href: '/dashboard' },
          ].map((item, index) => (
            <motion.div 
              key={item.name}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={item.href} className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-[var(--color-cricket-accent)] transition-colors">
                <item.icon size={16} /> {item.name}
              </Link>
            </motion.div>
          ))}
        </div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link href="/login" className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-semibold text-white transition-all hover:border-[var(--color-cricket-accent)]/50 hover:shadow-[0_0_15px_rgba(0,255,65,0.2)]">
            <LogIn size={16} /> Login
          </Link>
        </motion.div>
      </div>
    </nav>
  );
}
