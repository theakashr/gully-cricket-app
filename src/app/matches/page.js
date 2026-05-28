"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Calendar, CheckCircle2, Search, Bell, ChevronDown, ChevronUp } from 'lucide-react';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import Link from 'next/link';

export default function MatchesHub() {
  const [matches, setMatches] = useState({ live: [], forYou: [], upcoming: [], finished: [] });
  const [teams, setTeams] = useState({});
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('forYou'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTournaments, setExpandedTournaments] = useState({});

  useEffect(() => {
    // Fetch Teams
    const unsubscribeTeams = onValue(ref(db, 'teams'), (snapshot) => {
      if (snapshot.exists()) setTeams(snapshot.val());
    });

    // Fetch Tournaments
    const unsubscribeTournaments = onValue(ref(db, 'tournaments'), (snapshot) => {
      if (snapshot.exists()) {
        setTournaments(Object.entries(snapshot.val()).map(([id, val]) => ({ id, ...val })));
      }
    });

    // Fetch Matches
    const unsubscribeMatches = onValue(ref(db, 'matches'), (snapshot) => {
      if (snapshot.exists()) {
        const matchesData = snapshot.val();
        const allMatches = Object.entries(matchesData)
           .map(([id, val]) => ({ id, ...val }))
           .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        setMatches({
          live: allMatches.filter(m => m.status === 'live'),
          forYou: allMatches, // For you shows all for now
          upcoming: allMatches.filter(m => m.status === 'upcoming' || m.status === 'ready'),
          finished: allMatches.filter(m => m.status === 'completed')
        });
        
        // Auto-expand all tournaments by default
        const grouped = {};
        allMatches.forEach(m => {
          grouped[m.tournamentId || 'other'] = true;
        });
        setExpandedTournaments(grouped);

      } else {
        setMatches({ live: [], forYou: [], upcoming: [], finished: [] });
      }
      setLoading(false);
    });

    return () => {
      unsubscribeTeams();
      unsubscribeTournaments();
      unsubscribeMatches();
    };
  }, []);

  const tabs = [
    { id: 'live', label: 'Live' },
    { id: 'forYou', label: 'For you' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'finished', label: 'Finished' }
  ];

  const getTeamCode = (teamId) => teams[teamId]?.shortName || 'TBA';
  const getTeamName = (teamId) => teams[teamId]?.name || 'Unknown Team';
  const getTournamentName = (tId) => tournaments.find(t => t.id === tId)?.name || 'Other Matches';

  const toggleTournament = (tId) => {
    setExpandedTournaments(prev => ({...prev, [tId]: !prev[tId]}));
  };

  // Filter & Group Matches
  const filteredMatches = matches[activeTab].filter(m => {
    const tA = getTeamName(m.teamA).toLowerCase();
    const tB = getTeamName(m.teamB).toLowerCase();
    const tName = getTournamentName(m.tournamentId).toLowerCase();
    const q = searchQuery.toLowerCase();
    return tA.includes(q) || tB.includes(q) || tName.includes(q) || (m.matchName || '').toLowerCase().includes(q);
  });

  const groupedMatches = {};
  filteredMatches.forEach(m => {
    const tId = m.tournamentId || 'other';
    if (!groupedMatches[tId]) groupedMatches[tId] = [];
    groupedMatches[tId].push(m);
  });

  return (
    <div className="min-h-screen pb-20 bg-[var(--background)]">
      <div className="container mx-auto max-w-4xl px-4 pt-8">
        
        {/* Header & Search */}
        <div className="mb-6">
           <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-4 px-1">Matches Hub</h1>
           
           <div className="relative">
             <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
               <Search size={18} className="text-slate-400" />
             </div>
             <input 
               type="text" 
               placeholder="Search matches..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
             />
           </div>
        </div>

        {/* 4-Tab Navigation */}
        <div className="flex justify-between items-center mb-6 px-2 border-b border-slate-200">
           {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative pb-3 px-1 text-sm font-black transition-colors ${
                  activeTab === tab.id ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-full"
                  />
                )}
              </button>
           ))}
        </div>

        {/* Content Area */}
        {loading ? (
           <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-emerald-500/25 border-t-emerald-600 rounded-full animate-spin"></div>
           </div>
        ) : (
           <AnimatePresence mode="wait">
              <motion.div
                 key={activeTab}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 transition={{ duration: 0.15 }}
                 className="min-h-[40vh]"
              >
                 {Object.keys(groupedMatches).length > 0 ? (
                    Object.keys(groupedMatches).map(tId => (
                      <div key={tId} className="mb-6">
                        {/* Tournament Header */}
                        <div 
                          className="flex justify-between items-center py-2 px-1 mb-3 cursor-pointer group"
                          onClick={() => toggleTournament(tId)}
                        >
                          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">{getTournamentName(tId)}</h2>
                          <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
                            {expandedTournaments[tId] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </div>
                        </div>

                        {/* Expandable Match List */}
                        <AnimatePresence initial={false}>
                          {expandedTournaments[tId] && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden space-y-4"
                            >
                              {groupedMatches[tId].map(match => {
                                const isLive = match.status === 'live';
                                const isFinished = match.status === 'completed';
                                const isUpcoming = match.status === 'upcoming';
                                
                                const inningsKey = match.currentInnings === 1 ? 'innings1' : 'innings2';
                                const runs = match.score?.[inningsKey]?.runs || 0;
                                const wickets = match.score?.[inningsKey]?.wickets || 0;
                                const overs = match.score?.[inningsKey]?.overs || 0;

                                let statusText = match.status;
                                let statusColor = "text-slate-500";
                                if (isLive) {
                                  statusText = "LIVE";
                                  statusColor = "text-red-500 animate-pulse";
                                } else if (isFinished && match.result) {
                                  statusText = match.result.margin || `${teams[match.result.winner]?.shortName} Won`;
                                  statusColor = "text-emerald-600";
                                } else if (isUpcoming && match.scheduledTime) {
                                  statusText = new Date(match.scheduledTime).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
                                  statusColor = "text-amber-600";
                                } else if (isUpcoming) {
                                  statusText = "Upcoming";
                                }

                                return (
                                  <Link href={`/match/${match.id}`} key={match.id} className="block group">
                                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                                      {/* Top Row: Context & Bell */}
                                      <div className="flex justify-between items-center mb-4">
                                        <span className="text-xs font-bold text-slate-500 tracking-wide uppercase">
                                          {match.matchName || match.stage || "League Match"} • T20
                                        </span>
                                        <Bell size={16} className="text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer" />
                                      </div>

                                      {/* Body Section */}
                                      <div className="flex justify-between items-end">
                                        {/* Left Align Teams Vertically */}
                                        <div className="space-y-3">
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shadow-inner">
                                              <span className="text-xs font-black text-slate-700">{getTeamCode(match.teamA).substring(0, 3)}</span>
                                            </div>
                                            <span className="text-sm sm:text-base font-black text-slate-900">{getTeamName(match.teamA)}</span>
                                          </div>
                                          
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shadow-inner">
                                              <span className="text-xs font-black text-slate-700">{getTeamCode(match.teamB).substring(0, 3)}</span>
                                            </div>
                                            <span className="text-sm sm:text-base font-black text-slate-900">{getTeamName(match.teamB)}</span>
                                          </div>
                                        </div>

                                        {/* Right Align Status & Score */}
                                        <div className="text-right flex flex-col items-end justify-end">
                                          {(isLive || isFinished) ? (
                                            <>
                                              <div className="flex items-baseline gap-1 mb-1">
                                                <span className="text-2xl font-black text-slate-900 tabular-nums leading-none">{runs}/{wickets}</span>
                                                <span className="text-xs font-black text-slate-500 tabular-nums">({overs})</span>
                                              </div>
                                              <span className={`text-[10px] font-black uppercase tracking-widest ${statusColor}`}>
                                                {statusText}
                                              </span>
                                            </>
                                          ) : (
                                            <span className={`text-[11px] font-black uppercase tracking-widest ${statusColor} bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100`}>
                                              {statusText}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </Link>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))
                  ) : (
                    <div className="glass rounded-3xl p-10 text-center border border-slate-200 shadow-sm mt-8">
                       <Search size={32} className="mx-auto text-slate-300 mb-3" />
                       <h3 className="text-lg font-black text-slate-700 mb-1">No Matches Found</h3>
                       <p className="text-xs text-slate-500 font-bold">Try adjusting your search or check a different tab.</p>
                    </div>
                 )}
              </motion.div>
           </AnimatePresence>
        )}
      </div>
    </div>
  );
}
