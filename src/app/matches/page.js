"use client";
import { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import MobileMatchCard from '@/components/MobileMatchCard';

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
  }, [activeTabIdx]);

  const displayedMatches = tabs[activeTabIdx].list;

  return (
    <div className="bg-white min-h-screen relative text-[#1F2937] pb-24 mx-auto w-full max-w-md md:max-w-xl shadow-2xl md:border-x md:border-[#E5E7EB]">
      {/* Header */}
      <header className="pt-12 pb-2 px-4 sticky top-0 bg-white/90 backdrop-blur-md z-40 border-b border-[#E5E7EB]">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-black tracking-tight">Matches</h1>
          <button className="w-11 h-11 rounded-full bg-gray-50 flex items-center justify-center active:scale-95 transition-transform">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </button>
        </div>

        {/* Sliding Tabs */}
        <div className="relative">
          <div className="flex space-x-6 overflow-x-auto scrollbar-hide relative z-10">
            {tabs.map((tab, idx) => (
              <button
                key={tab.id}
                ref={el => tabRefs.current[idx] = el}
                onClick={() => setActiveTabIdx(idx)}
                className={`pb-3 font-bold whitespace-nowrap active:scale-95 transition-all text-sm focus:outline-none ${
                  activeTabIdx === idx ? 'text-[#00A854]' : 'text-gray-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div 
            className="absolute bottom-0 left-0 h-0.5 bg-[#00A854] rounded-t-md transition-all duration-300 ease-out" 
            style={indicatorStyle}
          ></div>
        </div>
      </header>

      {/* Matches Feed */}
      <main className="p-4 space-y-5">
        {loading ? (
          <>
            <article className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden p-4 space-y-5">
              <div className="flex justify-between items-center">
                 <div className="h-2 w-32 skeleton rounded-full"></div>
                 <div className="h-4 w-12 skeleton rounded-full"></div>
              </div>
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 skeleton rounded-full"></div>
                    <div className="h-3 w-32 skeleton rounded-full"></div>
                  </div>
                  <div className="h-4 w-12 skeleton rounded-full"></div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 skeleton rounded-full"></div>
                    <div className="h-3 w-28 skeleton rounded-full"></div>
                  </div>
                  <div className="h-4 w-12 skeleton rounded-full"></div>
                </div>
              </div>
            </article>
            <article className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden p-4 space-y-5 opacity-60">
              <div className="flex justify-between items-center">
                 <div className="h-2 w-32 skeleton rounded-full"></div>
                 <div className="h-4 w-12 skeleton rounded-full"></div>
              </div>
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 skeleton rounded-full"></div>
                    <div className="h-3 w-32 skeleton rounded-full"></div>
                  </div>
                  <div className="h-4 w-12 skeleton rounded-full"></div>
                </div>
              </div>
            </article>
          </>
        ) : displayedMatches.length > 0 ? (
          displayedMatches.map(match => (
            <MobileMatchCard 
              key={match.id} 
              match={match} 
              teams={teams} 
              tournamentName={tournaments[match.tournamentId]?.name || "Local Match"} 
            />
          ))
        ) : (
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-10 text-center space-y-3">
             <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2 text-xl">🏏</div>
             <h3 className="font-bold text-gray-800">No Matches Here</h3>
             <p className="text-xs text-gray-500 font-medium">There are currently no matches in this category.</p>
          </div>
        )}
      </main>
    </div>
  );
}
