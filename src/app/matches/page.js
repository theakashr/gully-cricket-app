"use client";
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Calendar, CheckCircle2, Search, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import MatchCard from '@/components/MatchCard';

export default function MatchesHub() {
  const [allMatches, setAllMatches] = useState([]);
  const [teams, setTeams] = useState({});
  const [tournaments, setTournaments] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('foryou');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState({});

  useEffect(() => {
    const unsubscribeTeams = onValue(ref(db, 'teams'), (snapshot) => {
      if (snapshot.exists()) setTeams(snapshot.val());
    });

    const unsubscribeTournaments = onValue(ref(db, 'tournaments'), (snapshot) => {
      if (snapshot.exists()) setTournaments(snapshot.val());
    });

    const unsubscribeMatches = onValue(ref(db, 'matches'), (snapshot) => {
      if (snapshot.exists()) {
        const matchesData = snapshot.val();
        const list = Object.entries(matchesData)
          .map(([id, val]) => ({ id, ...val }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setAllMatches(list);
      } else {
        setAllMatches([]);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeTeams();
      unsubscribeTournaments();
      unsubscribeMatches();
    };
  }, []);

  // Categorize matches
  const categorized = useMemo(() => {
    return {
      live: allMatches.filter(m => m.status === 'live'),
      foryou: allMatches, // Show all matches for "For you"
      upcoming: allMatches.filter(m => m.status === 'upcoming' || m.status === 'ready'),
      finished: allMatches.filter(m => m.status === 'completed')
    };
  }, [allMatches]);

  // Filter by search
  const filteredMatches = useMemo(() => {
    const list = categorized[activeTab] || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(m => {
      const teamA = teams[m.teamA]?.shortName?.toLowerCase() || '';
      const teamB = teams[m.teamB]?.shortName?.toLowerCase() || '';
      const name = (m.matchName || '').toLowerCase();
      const stage = (m.stage || '').toLowerCase();
      const tName = (tournaments[m.tournamentId]?.name || '').toLowerCase();
      return teamA.includes(q) || teamB.includes(q) || name.includes(q) || stage.includes(q) || tName.includes(q);
    });
  }, [categorized, activeTab, searchQuery, teams, tournaments]);

  // Group by tournament
  const groupedByTournament = useMemo(() => {
    const groups = {};
    filteredMatches.forEach(m => {
      const tId = m.tournamentId || 'uncategorized';
      const tName = tournaments[tId]?.name || 'Other Matches';
      if (!groups[tId]) groups[tId] = { name: tName, matches: [] };
      groups[tId].matches.push(m);
    });
    return groups;
  }, [filteredMatches, tournaments]);

  const toggleGroup = (groupId) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const tabs = [
    { id: 'live', label: 'Live', icon: '🔴', count: categorized.live.length },
    { id: 'foryou', label: 'For you', icon: null, count: null },
    { id: 'upcoming', label: 'Upcoming', icon: '⏳', count: categorized.upcoming.length },
    { id: 'finished', label: 'Finished', icon: '✅', count: categorized.finished.length }
  ];

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6">
      <div className="container mx-auto max-w-3xl">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Matches Hub</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Track live scores, upcoming fixtures, and past results.</p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-5">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search matches..."
            className="w-full glass-card rounded-2xl pl-11 pr-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all font-medium shadow-sm"
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-0 border-b border-slate-200 mb-6 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-bold transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.icon && <span className="text-xs">{tab.icon}</span>}
              {tab.label}
              {tab.count !== null && (
                <span className={`ml-1 text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="matchesTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-emerald-500 rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-emerald-500/25 border-t-emerald-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + searchQuery}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {filteredMatches.length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(groupedByTournament).map(([groupId, group]) => (
                    <div key={groupId}>
                      {/* Tournament Header */}
                      <button
                        onClick={() => toggleGroup(groupId)}
                        className="w-full flex items-center justify-between py-2.5 px-1 mb-3 group"
                      >
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-700 transition-colors">
                          {group.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            {group.matches.length}
                          </span>
                          {collapsedGroups[groupId] ? (
                            <ChevronDown size={14} className="text-slate-400" />
                          ) : (
                            <ChevronUp size={14} className="text-slate-400" />
                          )}
                        </div>
                      </button>

                      {/* Match Cards */}
                      <AnimatePresence>
                        {!collapsedGroups[groupId] && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3 overflow-hidden"
                          >
                            {group.matches.map(match => (
                              <MatchCard
                                key={match.id}
                                match={match}
                                teams={teams}
                                tournamentName={group.name}
                              />
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-card rounded-2xl p-10 sm:p-16 text-center max-w-md mx-auto border border-slate-200/60 shadow-sm">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 border border-slate-200">
                    {activeTab === 'live' && <Activity size={24} className="text-slate-400" />}
                    {activeTab === 'foryou' && <Sparkles size={24} className="text-slate-400" />}
                    {activeTab === 'upcoming' && <Calendar size={24} className="text-slate-400" />}
                    {activeTab === 'finished' && <CheckCircle2 size={24} className="text-slate-400" />}
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mb-1">No matches found</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {searchQuery ? 'Try a different search term.' : 'No matches available for this category.'}
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
