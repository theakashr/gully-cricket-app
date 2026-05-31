"use client";
import { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Search, ChevronDown } from 'lucide-react';
import CompactMatchCard from '@/components/CompactMatchCard';

export default function MatchesHub() {
  const [allMatches, setAllMatches] = useState([]);
  const [teams, setTeams] = useState({});
  const [tournaments, setTournaments] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTabIdx, setActiveTabIdx] = useState(1); // 'For You' default
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

  const categorized = useMemo(() => {
    return {
      live: allMatches.filter(m => m.status === 'live'),
      foryou: allMatches, 
      upcoming: allMatches.filter(m => m.status === 'upcoming' || m.status === 'ready'),
      finished: allMatches.filter(m => m.status === 'completed')
    };
  }, [allMatches]);

  // Filter by search
  const filteredMatches = useMemo(() => {
    const tabsData = [categorized.live, categorized.foryou, categorized.upcoming, categorized.finished];
    const list = tabsData[activeTabIdx] || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(m => {
      const teamA = teams[m.teamA]?.shortName?.toLowerCase() || '';
      const teamB = teams[m.teamB]?.shortName?.toLowerCase() || '';
      const name = (m.matchName || '').toLowerCase();
      const tName = (tournaments[m.tournamentId]?.name || '').toLowerCase();
      return teamA.includes(q) || teamB.includes(q) || name.includes(q) || tName.includes(q);
    });
  }, [categorized, activeTabIdx, searchQuery, teams, tournaments]);

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
    { id: 'live', label: `Live (${categorized.live.length})` },
    { id: 'foryou', label: 'For You' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'finished', label: 'Finished' }
  ];

  return (
    <div className="bg-[#f3f4f6] md:bg-white min-h-screen relative text-[#1F2937] pb-24 mx-auto w-full max-w-md md:max-w-xl md:shadow-2xl md:border-x md:border-[#E5E7EB]">
      {/* Sticky Glassmorphism Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl z-40 border-b border-[#E5E7EB] pt-10 pb-0">
        <div className="px-4 mb-4">
          <h1 className="text-3xl font-black tracking-tight mb-4">Matches</h1>
          
          {/* Search Bar */}
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search matches..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm text-[#1F2937] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00A854]/20 focus:border-[#00A854] transition-all font-medium"
            />
          </div>
        </div>

        {/* Swipeable Tabs */}
        <div className="px-4 flex space-x-6 overflow-x-auto no-scrollbar border-b border-gray-100">
          {tabs.map((tab, idx) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabIdx(idx)}
              className={`pb-3 font-bold whitespace-nowrap text-sm border-b-2 active:scale-95 transition-transform origin-bottom focus:outline-none ${
                activeTabIdx === idx ? 'border-[#00A854] text-[#00A854]' : 'border-transparent text-gray-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content Feed */}
      <main className="p-4 space-y-6">
        {loading ? (
          <div className="space-y-6">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-3"></div>
            <article className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden p-4 space-y-5">
              <div className="flex justify-between items-center">
                 <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                 <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-5 w-12 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-4 w-28 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-5 w-12 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </article>
          </div>
        ) : filteredMatches.length > 0 ? (
          Object.entries(groupedByTournament).map(([groupId, group]) => {
            const isCollapsed = collapsedGroups[groupId];
            return (
              <div key={groupId}>
                {/* League Header (Accordion Toggle) */}
                <button 
                  onClick={() => toggleGroup(groupId)} 
                  className="w-full flex items-center justify-between py-2 group active:opacity-70 transition-opacity focus:outline-none mb-2"
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">{group.name}</h3>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{group.matches.length}</span>
                  </div>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
                </button>

                {/* League Content (Fluid Accordion) */}
                <div className={`accordion-content ${!isCollapsed ? 'expanded' : ''}`}>
                  <div className="accordion-inner space-y-3">
                    {group.matches.map(match => (
                      <CompactMatchCard 
                        key={match.id} 
                        match={match} 
                        teams={teams} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-10 text-center space-y-3 mt-4">
             <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2 text-xl">🏏</div>
             <h3 className="font-bold text-gray-800">No Matches Found</h3>
             <p className="text-xs text-gray-500 font-medium">Try checking another tab or adjust your search.</p>
          </div>
        )}
      </main>
    </div>
  );
}
