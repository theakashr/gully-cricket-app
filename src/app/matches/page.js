"use client";
import { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import MatchCard from '@/components/MatchCard';

export default function MatchesHub() {
  const [allMatches, setAllMatches] = useState([]);
  const [teams, setTeams] = useState({});
  const [tournaments, setTournaments] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTabIdx, setActiveTabIdx] = useState(1); // 'For You' default
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, transform: 'translateX(0px)' });
  
  const tabRefs = useRef([]);

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

  const tabs = [
    { id: 'live', label: `Live (${categorized.live.length})`, list: categorized.live },
    { id: 'foryou', label: 'For You', list: categorized.foryou },
    { id: 'upcoming', label: 'Upcoming', list: categorized.upcoming },
    { id: 'finished', label: 'Finished', list: categorized.finished }
  ];

  // Handle Tab Animation
  useEffect(() => {
    const currentTab = tabRefs.current[activeTabIdx];
    if (currentTab) {
      // Calculate position relative to container
      const container = currentTab.parentElement;
      const scrollLeft = container.scrollLeft;
      const btnRect = currentTab.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const leftPos = btnRect.left - containerRect.left + scrollLeft;
      
      setIndicatorStyle({
        width: `${btnRect.width}px`,
        transform: `translateX(${leftPos}px)`
      });
    }
  }, [activeTabIdx, allMatches.length]);

  const displayedMatches = tabs[activeTabIdx].list;

  return (
    <div className="bg-[#f3f4f6] md:bg-white min-h-screen relative text-[#111827] pb-24 mx-auto w-full max-w-md md:max-w-xl md:shadow-2xl md:border-x md:border-[#E5E7EB]">
      {/* Sticky Glassmorphism Header */}
      {/* top-0 since Navbar is usually static or not overlapping, we use z-40 */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl z-40 border-b border-[#E5E7EB] pt-6 pb-0">
        <div className="px-4 mb-4">
          <h1 className="text-3xl font-black tracking-tight mb-2">Matches Hub</h1>
          <p className="text-gray-500 text-sm font-medium">Track live scores and upcoming fixtures.</p>
        </div>

        {/* Swipeable Tabs */}
        <div className="relative px-4">
          <div className="flex space-x-6 overflow-x-auto no-scrollbar relative z-10">
            {tabs.map((tab, idx) => (
              <button
                key={tab.id}
                ref={el => tabRefs.current[idx] = el}
                onClick={() => setActiveTabIdx(idx)}
                className={`pb-3 font-bold whitespace-nowrap text-sm active:scale-95 transition-transform origin-bottom focus:outline-none ${
                  activeTabIdx === idx ? 'text-[#00A854]' : 'text-gray-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div 
            className="absolute bottom-0 left-4 h-0.5 bg-[#00A854] rounded-t-md transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)" 
            style={indicatorStyle}
          ></div>
        </div>
      </header>

      {/* Content Feed */}
      <main className="p-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            <article className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden p-4 space-y-5 animate-slide-up-fade stagger-1">
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
            <article className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden p-4 space-y-5 animate-slide-up-fade stagger-2 opacity-80">
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
        ) : displayedMatches.length > 0 ? (
          // Use key to remount components and trigger stagger animation on tab switch
          <div key={activeTabIdx} className="space-y-4">
            {displayedMatches.map((match, idx) => (
              <MatchCard 
                key={match.id} 
                match={match} 
                teams={teams} 
                tournamentName={tournaments[match.tournamentId]?.name} 
                index={idx}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-10 text-center space-y-3 mt-4 animate-slide-up-fade">
             <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2 text-xl">🏏</div>
             <h3 className="font-bold text-gray-800">No Matches Found</h3>
             <p className="text-xs text-gray-500 font-medium">Try checking another tab.</p>
          </div>
        )}
      </main>
    </div>
  );
}
