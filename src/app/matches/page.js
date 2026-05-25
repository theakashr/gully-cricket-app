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
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12">
           <Trophy size={48} className="mx-auto text-[var(--color-cricket-accent)] mb-4" />
           <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">Matches Hub</h1>
           <p className="text-gray-400 max-w-xl mx-auto">Track live scores, see upcoming fixtures, and review past match results.</p>
        </div>

        {/* Custom Tabs */}
        <div className="flex justify-center mb-12">
           <div className="glass p-2 rounded-full inline-flex gap-2">
              {tabs.map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={`relative px-6 py-3 rounded-full flex items-center gap-2 text-sm font-bold transition-all ${
                     activeTab === tab.id ? 'text-black' : 'text-gray-400 hover:text-white'
                   }`}
                 >
                   {activeTab === tab.id && (
                     <motion.div
                       layoutId="activeTab"
                       className="absolute inset-0 bg-[var(--color-cricket-accent)] rounded-full -z-10 shadow-[0_0_20px_rgba(0,255,65,0.3)]"
                       transition={{ type: "spring", stiffness: 300, damping: 20 }}
                     />
                   )}
                   <tab.icon size={16} />
                   {tab.label}
                   <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-black/20' : 'bg-white/10'}`}>
                     {tab.count}
                   </span>
                 </button>
              ))}
           </div>
        </div>

        {/* Content Area */}
        {loading ? (
           <div className="flex justify-center py-20">
              <div className="w-12 h-12 border-4 border-[var(--color-cricket-accent)]/30 border-t-[var(--color-cricket-accent)] rounded-full animate-spin"></div>
           </div>
        ) : (
           <AnimatePresence mode="wait">
              <motion.div
                 key={activeTab}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -20 }}
                 transition={{ duration: 0.2 }}
                 className="min-h-[40vh]"
              >
                 {matches[activeTab].length > 0 ? (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                       {matches[activeTab].map(match => (
                          <MatchCard key={match.id} match={match} teams={teams} />
                       ))}
                    </div>
                 ) : (
                    <div className="glass-card rounded-3xl p-16 text-center max-w-2xl mx-auto border-dashed border-2 border-white/10 mt-10">
                       {activeTab === 'live' && <Activity size={48} className="mx-auto text-gray-600 mb-4" />}
                       {activeTab === 'upcoming' && <Calendar size={48} className="mx-auto text-gray-600 mb-4" />}
                       {activeTab === 'completed' && <CheckCircle2 size={48} className="mx-auto text-gray-600 mb-4" />}
                       
                       <h3 className="text-xl font-bold text-white mb-2">No {activeTab} matches found</h3>
                       <p className="text-gray-500">
                          {activeTab === 'live' && "There are currently no live matches. Check the upcoming tab!"}
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
