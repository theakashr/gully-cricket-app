"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Activity, Calendar, CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import MatchCard from '@/components/MatchCard';

export default function MatchesHub() {
  const [matches, setMatches] = useState({ live: [], upcoming: [], completed: [] });
  const [teams, setTeams] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('live'); // 'live', 'upcoming', 'completed'

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
        const allMatches = Object.entries(matchesData)
           .map(([id, val]) => ({ id, ...val }))
           .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // newest first
        
        setMatches({
          live: allMatches.filter(m => m.status === 'live'),
          upcoming: allMatches.filter(m => m.status === 'upcoming' || m.status === 'ready'),
          completed: allMatches.filter(m => m.status === 'completed')
        });
      } else {
        setMatches({ live: [], upcoming: [], completed: [] });
      }
      setLoading(false);
    });

    return () => {
      unsubscribeTeams();
      unsubscribeMatches();
    };
  }, []);

  const tabs = [
    { id: 'live', label: 'Live Now', icon: Activity, count: matches.live.length },
    { id: 'upcoming', label: 'Upcoming', icon: Calendar, count: matches.upcoming.length },
    { id: 'completed', label: 'Results', icon: CheckCircle2, count: matches.completed.length }
  ];

  return (
    <div className="min-h-screen py-10 px-2 sm:px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-8 sm:mb-12">
           <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4 border border-emerald-200/50 shadow-inner">
             <Trophy size={28} className="text-emerald-600" />
           </div>
           <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-3">Matches Hub</h1>
           <p className="text-slate-500 font-medium max-w-md mx-auto text-sm sm:text-base">Track live scores, see upcoming fixtures, and review past match results.</p>
        </div>

        {/* Custom Tabs - Scrollable on mobile, Centered on desktop */}
        <div className="flex justify-start sm:justify-center overflow-x-auto scrollbar-hide mb-8 sm:mb-12 px-2">
           <div className="bg-slate-100/80 border border-slate-200/60 p-1.5 rounded-full inline-flex gap-1 shadow-inner min-w-max">
              {tabs.map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={`relative px-4 sm:px-6 py-2.5 rounded-full flex items-center gap-2 text-xs sm:text-sm font-bold transition-all ${
                     activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-900'
                   }`}
                 >
                   {activeTab === tab.id && (
                     <motion.div
                       layoutId="activeTabHub"
                       className="absolute inset-0 bg-emerald-600 rounded-full -z-10 shadow-sm shadow-emerald-100"
                       transition={{ type: "spring", stiffness: 350, damping: 25 }}
                     />
                   )}
                   <tab.icon size={14} className="flex-shrink-0" />
                   <span>{tab.label}</span>
                   <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                     activeTab === tab.id 
                       ? 'bg-white/20 text-white' 
                       : 'bg-slate-200 text-slate-500'
                   }`}>
                     {tab.count}
                   </span>
                 </button>
              ))}
           </div>
        </div>

        {/* Content Area */}
        {loading ? (
           <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-emerald-500/25 border-t-emerald-600 rounded-full animate-spin"></div>
           </div>
        ) : (
           <AnimatePresence mode="wait">
              <motion.div
                 key={activeTab}
                 initial={{ opacity: 0, y: 15 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -15 }}
                 transition={{ duration: 0.15 }}
                 className="min-h-[40vh] px-2 sm:px-0"
              >
                 {matches[activeTab].length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {matches[activeTab].map(match => (
                          <MatchCard key={match.id} match={match} teams={teams} />
                       ))}
                    </div>
                 ) : (
                    <div className="glass-card rounded-3xl p-10 sm:p-16 text-center max-w-md mx-auto border-dashed border border-slate-200 shadow-sm bg-white/90">
                       <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 border border-slate-200">
                         {activeTab === 'live' && <Activity size={24} className="text-slate-400" />}
                         {activeTab === 'upcoming' && <Calendar size={24} className="text-slate-400" />}
                         {activeTab === 'completed' && <CheckCircle2 size={24} className="text-slate-400" />}
                       </div>
                       
                       <h3 className="text-xl font-bold text-slate-800 mb-1.5">No {activeTab} matches found</h3>
                       <p className="text-sm text-slate-450 font-medium">
                          {activeTab === 'live' && "There are currently no live matches playing. Check the upcoming tab!"}
                          {activeTab === 'upcoming' && "No upcoming matches have been scheduled yet."}
                          {activeTab === 'completed' && "No match results are available yet."}
                       </p>
                    </div>
                 )}
              </motion.div>
           </AnimatePresence>
        )}
      </div>
    </div>
  );
}
