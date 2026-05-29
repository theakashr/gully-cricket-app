"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ChevronRight, Calendar } from 'lucide-react';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import Link from 'next/link';

export default function PublicTournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tournamentsRef = ref(db, 'tournaments');
    const unsubscribe = onValue(tournamentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const tList = Object.entries(data).map(([id, val]) => ({
          id,
          ...val,
        }));
        setTournaments(tList.reverse());
      } else {
        setTournaments([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* HEADER */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="container mx-auto max-w-6xl px-4 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-black text-xs">SL</span>
            </div>
            <span className="text-lg font-black tracking-tight">
              Stumpflow <span className="text-blue-500">Live</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors">Home</Link>
            <Link href="/matches" className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors">Matches</Link>
            <Link href="/tournaments" className="text-xs font-bold uppercase tracking-wider text-blue-600 transition-colors">Tournaments</Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto max-w-5xl px-4 py-8 md:py-12">
        <div className="mb-10 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">Tournaments</h1>
            <p className="text-slate-500 font-bold mt-2 text-sm uppercase tracking-widest">Select a league to view live analytics</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-sm">
            <Trophy size={64} className="mx-auto text-slate-300 mb-6" />
            <h2 className="text-2xl font-black text-slate-800">No Tournaments Yet</h2>
            <p className="text-slate-500 font-medium mt-2">Check back later for upcoming leagues.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((t, index) => (
              <Link href={`/tournament/${t.id}`} key={t.id}>
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform">
                      <Trophy size={24} className="text-blue-600" />
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${t.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                      {t.status}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight group-hover:text-blue-600 transition-colors">{t.name}</h3>
                  
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-400 font-medium text-xs">
                       <Calendar size={14} />
                       {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-blue-600">
                       View Dashboard <ChevronRight size={14} />
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
