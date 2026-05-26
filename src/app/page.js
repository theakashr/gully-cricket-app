"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Activity, Calendar } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import MatchCard from '@/components/MatchCard';

export default function Home() {
  const [matches, setMatches] = useState({ live: [], upcoming: [] });
  const [teams, setTeams] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch Teams
    const unsubscribeTeams = onValue(ref(db, 'teams'), (snapshot) => {
      if (snapshot.exists()) {
        setTeams(snapshot.val());
      }
    });

    // Fetch Matches
    const unsubscribeMatches = onValue(ref(db, 'matches'), (snapshot) => {
      if (snapshot.exists()) {
        const matchesData = snapshot.val();
        const allMatches = Object.entries(matchesData).map(([id, val]) => ({ id, ...val }));
        
        setMatches({
          live: allMatches.filter(m => m.status === 'live'),
          upcoming: allMatches.filter(m => m.status === 'upcoming' || m.status === 'ready')
        });
      }
      setLoading(false);
    });

    return () => {
      unsubscribeTeams();
      unsubscribeMatches();
    };
  }, []);

  return (
    <div className="relative overflow-hidden min-h-[90vh]">
      {/* Background elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[var(--color-cricket-blue)]/20 rounded-full blur-[120px] -z-10"></div>
      
      {/* Hero Section */}
      <div className="container mx-auto px-6 pt-20 pb-12 text-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto space-y-8"
        >
          <div className="w-28 h-28 md:w-36 md:h-36 mx-auto rounded-full overflow-hidden border-4 border-[var(--color-cricket-accent)]/30 shadow-[0_0_40px_rgba(0,255,65,0.25)] mb-6">
            <img src="/skcc-logo.jpg" alt="Shree Krishna Cricket Club" className="w-full h-full object-cover" />
          </div>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-[var(--color-cricket-accent)]/50 text-[var(--color-cricket-accent)] text-sm font-semibold mx-auto">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-cricket-accent)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--color-cricket-accent)]"></span>
            </span>
            Premium Live Scoring Engine
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight">
            Elevate Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-cricket-accent)] to-[var(--color-cricket-blue)]">
              Local Cricket
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Professional ball-by-ball scoring, real-time match centers, and in-depth analytics. Make every match feel like an international fixture.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link href="/matches" className="px-8 py-4 rounded-full bg-[var(--color-cricket-accent)] text-[var(--color-cricket-dark)] font-bold hover:scale-105 transition-transform flex items-center gap-2 shadow-[0_0_30px_rgba(0,255,65,0.4)]">
              View All Matches <ArrowRight size={20} />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Live & Upcoming Matches Section */}
      <div className="container mx-auto px-6 pb-32 mt-10">
        {loading ? (
           <div className="flex justify-center py-20">
              <div className="w-12 h-12 border-4 border-[var(--color-cricket-accent)]/30 border-t-[var(--color-cricket-accent)] rounded-full animate-spin"></div>
           </div>
        ) : (
           <div className="space-y-16">
              {/* Live Matches */}
              <section>
                 <div className="flex items-center gap-3 mb-8">
                    <Activity className="text-[var(--color-cricket-accent)]" size={32} />
                    <h2 className="text-3xl font-black text-white tracking-tight">Live Matches</h2>
                 </div>
                 
                 {matches.live.length > 0 ? (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                       {matches.live.map(match => (
                          <MatchCard key={match.id} match={match} teams={teams} />
                       ))}
                    </div>
                 ) : (
                    <div className="glass-card rounded-2xl p-10 text-center border-dashed border-2 border-white/10">
                       <p className="text-gray-400 font-bold mb-2">No live matches at the moment.</p>
                       <p className="text-sm text-gray-500">Check the upcoming section or tell an Admin to start a match.</p>
                    </div>
                 )}
              </section>

              {/* Upcoming Matches */}
              <section>
                 <div className="flex items-center gap-3 mb-8">
                    <Calendar className="text-[var(--color-cricket-blue)]" size={32} />
                    <h2 className="text-3xl font-black text-white tracking-tight">Upcoming Matches</h2>
                 </div>
                 
                 {matches.upcoming.length > 0 ? (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                       {matches.upcoming.map(match => (
                          <MatchCard key={match.id} match={match} teams={teams} />
                       ))}
                    </div>
                 ) : (
                    <div className="glass-card rounded-2xl p-10 text-center border-dashed border-2 border-white/10">
                       <p className="text-gray-400 font-bold">No upcoming matches scheduled.</p>
                    </div>
                 )}
              </section>
           </div>
        )}
      </div>
    </div>
  );
}
