"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';

export default function Home() {
  const [liveMatch, setLiveMatch] = useState(null);
  const [teams, setTeams] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch Teams
    const unsubscribeTeams = onValue(ref(db, 'teams'), (snapshot) => {
      if (snapshot.exists()) {
        setTeams(snapshot.val());
      }
    });

    // Fetch Live Match
    const unsubscribeMatches = onValue(ref(db, 'matches'), (snapshot) => {
      if (snapshot.exists()) {
        const matchesData = snapshot.val();
        // Find the first live match, or latest match if none are live
        const allMatches = Object.entries(matchesData).map(([id, val]) => ({ id, ...val }));
        const live = allMatches.filter(m => m.status === 'live');
        
        if (live.length > 0) {
          setLiveMatch(live[live.length - 1]); // get latest live
        } else if (allMatches.length > 0) {
          setLiveMatch(allMatches[allMatches.length - 1]); // get latest anyway
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribeTeams();
      unsubscribeMatches();
    };
  }, []);

  const getTeamCode = (teamId) => teams[teamId]?.shortName || 'TBD';

  return (
    <div className="relative overflow-hidden min-h-[90vh] flex flex-col justify-center">
      {/* Background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--color-cricket-blue)]/20 rounded-full blur-[120px] -z-10"></div>
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[var(--color-cricket-accent)]/20 rounded-full blur-[100px] -z-10"></div>

      <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-[var(--color-cricket-accent)]/50 text-[var(--color-cricket-accent)] text-sm font-semibold">
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
          
          <p className="text-xl text-gray-400 max-w-lg leading-relaxed">
            Professional ball-by-ball scoring, real-time match centers, and in-depth analytics. Make every match feel like an international fixture.
          </p>
          
          <div className="flex flex-wrap gap-4 pt-4">
            <Link href="/login" className="px-8 py-4 rounded-full bg-[var(--color-cricket-accent)] text-[var(--color-cricket-dark)] font-bold hover:scale-105 transition-transform flex items-center gap-2 shadow-[0_0_30px_rgba(0,255,65,0.4)]">
              Login to Score <ArrowRight size={20} />
            </Link>
          </div>
        </motion.div>

        {/* Floating Match Card Preview */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-cricket-accent)] to-[var(--color-cricket-blue)] rounded-3xl blur-[40px] opacity-20 animate-pulse"></div>
          
          {loading ? (
             <div className="glass-card rounded-3xl p-16 flex justify-center relative z-10">
                <div className="w-12 h-12 border-4 border-[var(--color-cricket-accent)]/30 border-t-[var(--color-cricket-accent)] rounded-full animate-spin"></div>
             </div>
          ) : liveMatch ? (
            <Link href={`/match/${liveMatch.id}`} className="block relative z-10 group">
              <div className="glass-card rounded-3xl p-8 overflow-hidden group-hover:bg-white/5 transition-colors">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[var(--color-cricket-blue)] to-[var(--color-cricket-accent)]"></div>
                
                <div className="flex justify-between items-center mb-8">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Match Center</span>
                  <span className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-2 uppercase tracking-wider ${liveMatch.status === 'live' ? 'bg-red-500/20 text-red-500' : 'bg-gray-800 text-gray-400'}`}>
                    {liveMatch.status === 'live' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                    {liveMatch.status}
                  </span>
                </div>
                
                <div className="flex justify-between items-center mb-8">
                  <div className="text-center w-1/3">
                    <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-3 shadow-lg border border-[var(--color-cricket-accent)]/30 mx-auto">
                      <span className="text-xl font-black text-white">{getTeamCode(liveMatch.teamA)}</span>
                    </div>
                    <h3 className="text-3xl font-black text-white">{liveMatch.score?.innings1?.runs || 0}<span className="text-gray-400 text-xl">/{liveMatch.score?.innings1?.wickets || 0}</span></h3>
                    <p className="text-gray-400 font-medium">Overs: {liveMatch.score?.innings1?.overs || 0}</p>
                  </div>
                  
                  <div className="text-center w-1/3 px-2">
                    <span className="text-3xl font-black text-[var(--color-cricket-accent)] italic">VS</span>
                    <div className="mt-4 flex justify-center">
                       <span className="bg-[var(--color-cricket-accent)]/20 text-[var(--color-cricket-accent)] text-xs font-bold px-3 py-1 rounded-full group-hover:bg-[var(--color-cricket-accent)] group-hover:text-black transition-colors">
                         View Details
                       </span>
                    </div>
                  </div>
                  
                  <div className="text-center w-1/3">
                    <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-3 shadow-lg border border-gray-700 mx-auto">
                      <span className="text-xl font-black text-gray-500">{getTeamCode(liveMatch.teamB)}</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-500 mt-2">Yet to bat</h3>
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="glass-card rounded-3xl p-16 text-center relative z-10">
               <p className="text-gray-400 font-bold mb-4">No matches available yet.</p>
               <Link href="/login" className="text-[var(--color-cricket-accent)] hover:underline font-bold text-sm">Login as Admin to create a match.</Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
