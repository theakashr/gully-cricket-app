"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Calendar, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import MatchCard from '@/components/MatchCard';

export default function Home() {
  const [matches, setMatches] = useState({ live: [], upcoming: [], finished: [] });
  const [teams, setTeams] = useState({});
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('live');

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
           upcoming: allMatches.filter(m => m.status === 'upcoming' || m.status === 'ready'),
           finished: allMatches.filter(m => m.status === 'completed')
        });
      }
      setLoading(false);
    });

    return () => {
      unsubscribeTeams();
      unsubscribeMatches();
    };
  }, []);

  // Floating particles array for zero-g effect
  const particles = Array.from({ length: 15 });

  return (
    <div className="relative overflow-hidden min-h-screen bg-[var(--background)] pb-24 text-slate-900">
      
      {/* Zero-G Particle Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {particles.map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-[var(--color-cricket-accent)] rounded-full shadow-[0_0_10px_var(--color-cricket-accent)]"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000) + 200,
              opacity: Math.random() * 0.5 + 0.1
            }}
            animate={{
              y: [null, -100],
              opacity: [null, 0]
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
        {/* Glow ambient spots */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[var(--color-cricket-accent)]/10 rounded-full blur-[100px]"></div>
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-[var(--color-cricket-cyan)]/5 rounded-full blur-[120px]"></div>
      </div>



      {/* High-Density Navigation Tabs */}
       <div className="relative z-20 container mx-auto px-4 max-w-5xl mb-6">
          <div className="flex items-center mb-4">
            <button onClick={() => setShowSearch(prev => !prev)} className="px-4 py-2 bg-emerald-600 text-white rounded-md mr-2">Search</button>
            {showSearch && (
              <input
                type="text"
                placeholder="Search matches..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            )}
          </div>
        <div className="glass-dark rounded-xl p-1.5 flex justify-between sm:justify-start gap-1 sm:gap-2 overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setActiveTab('live')}
            className={`flex-1 sm:flex-none relative px-4 py-3 rounded-lg text-xs md:text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'live' ? 'text-slate-900' : 'text-slate-600 hover:text-slate-700'}`}
          >
            <span className={`w-2 h-2 rounded-full ${activeTab === 'live' ? 'bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-gray-600'}`}></span>
            Live ({matches.live.length})
            {activeTab === 'live' && (
              <motion.div layoutId="tabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-cricket-accent)] shadow-[0_0_10px_var(--color-cricket-accent)]" />
            )}
          </button>
          
          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 sm:flex-none relative px-4 py-3 rounded-lg text-xs md:text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'upcoming' ? 'text-slate-900' : 'text-slate-600 hover:text-slate-700'}`}
          >
            <Calendar size={14} className={activeTab === 'upcoming' ? 'text-[var(--color-cricket-cyan)]' : 'text-gray-600'} />
            Upcoming ({matches.upcoming.length})
            {activeTab === 'upcoming' && (
              <motion.div layoutId="tabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-cricket-cyan)] shadow-[0_0_10px_var(--color-cricket-cyan)]" />
            )}
          </button>

          <button 
            onClick={() => setActiveTab('finished')}
            className={`flex-1 sm:flex-none relative px-4 py-3 rounded-lg text-xs md:text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'finished' ? 'text-slate-900' : 'text-slate-600 hover:text-slate-700'}`}
          >
            <CheckCircle2 size={14} className={activeTab === 'finished' ? 'text-green-500' : 'text-gray-600'} />
            Finished ({matches.finished.length})
            {activeTab === 'finished' && (
              <motion.div layoutId="tabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
            )}
          </button>
        </div>
        
        {/* Secondary Filters */}
        <div className="flex gap-4 mt-3 px-2 overflow-x-auto scrollbar-hide text-[10px] uppercase font-bold tracking-widest text-slate-600">
          <span className="text-[var(--color-cricket-accent)] cursor-pointer">All</span>
          <span className="cursor-pointer hover:text-slate-700">T20</span>
          <span className="cursor-pointer hover:text-slate-700">ODI</span>
          <span className="cursor-pointer hover:text-slate-700">Local Leagues</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative z-20 container mx-auto px-4 max-w-5xl">
        {loading ? (
           <div className="flex justify-center py-20">
              <div className="w-12 h-12 border-4 border-[var(--color-cricket-accent)]/20 border-t-[var(--color-cricket-accent)] rounded-full animate-spin shadow-[0_0_15px_var(--color-cricket-accent)]"></div>
           </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* LIVE TAB */}
              {activeTab === 'live' && (
                <div className="w-full pb-8">
                  {(() => {
                  const filteredLive = matches.live.filter(m => !searchTerm || (m.matchName && m.matchName.toLowerCase().includes(searchTerm.toLowerCase())));
                  const filteredUpcoming = matches.upcoming.filter(m => !searchTerm || (m.matchName && m.matchName.toLowerCase().includes(searchTerm.toLowerCase())));
                  const filteredFinished = matches.finished.filter(m => !searchTerm || (m.matchName && m.matchName.toLowerCase().includes(searchTerm.toLowerCase())));
                  return (
                    filteredLive.length > 0 ? (
                     <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4 pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 md:grid-cols-3">
                       {filteredLive.map(match => (
                         <div key={match.id} className="min-w-[85vw] sm:min-w-0 snap-center">
                           <MatchCard match={match} teams={teams} />
                         </div>
                       ))}
                     </div>
                  ) : (
                    <div className="glass-dark rounded-2xl p-10 text-center border-dashed border border-slate-300">
                      <Activity size={32} className="mx-auto text-gray-600 mb-3" />
                      <p className="text-slate-500 font-bold mb-1 uppercase tracking-widest text-xs">No live matches</p>
                      <p className="text-[10px] text-gray-600">Check the upcoming tab for schedules.</p>
                    </div>
                  )})()}
                </div>
              )}

              {/* UPCOMING TAB */}
              {activeTab === 'upcoming' && (
                <div className="flex flex-col gap-4 pb-8">
                  {(() => {
                  const filteredUpcoming = matches.upcoming.filter(m => !searchTerm || (m.matchName && m.matchName.toLowerCase().includes(searchTerm.toLowerCase())));
                  return filteredUpcoming.length > 0 ? (
                      filteredUpcoming.map(match => (
                        <div key={match.id} className="w-full md:w-1/2 lg:w-1/3">
                          <MatchCard match={match} teams={teams} />
                        </div>
                      ))
                 ) : (
                    <div className="glass-dark rounded-2xl p-10 text-center border-dashed border border-slate-300">
                      <Calendar size={32} className="mx-auto text-gray-600 mb-3" />
                      <p className="text-slate-500 font-bold mb-1 uppercase tracking-widest text-xs">No upcoming matches</p>
                    </div>
                  )})()}
                </div>
              )}

              {/* FINISHED TAB */}
              {activeTab === 'finished' && (
                <div className="flex flex-col gap-4 pb-8">
                  {(() => {
                  const filteredFinished = matches.finished.filter(m => !searchTerm || (m.matchName && m.matchName.toLowerCase().includes(searchTerm.toLowerCase())));
                  return filteredFinished.length > 0 ? (
                      filteredFinished.map(match => (
                        <div key={match.id} className="w-full md:w-1/2 lg:w-1/3">
                          <MatchCard match={match} teams={teams} />
                        </div>
                      ))
                 ) : (
                    <div className="glass-dark rounded-2xl p-10 text-center border-dashed border border-slate-300">
                      <CheckCircle2 size={32} className="mx-auto text-gray-600 mb-3" />
                      <p className="text-slate-500 font-bold mb-1 uppercase tracking-widest text-xs">No finished matches</p>
                    </div>
                  )})()}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
