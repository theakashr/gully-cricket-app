"use client";
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import MatchCard from '@/components/MatchCard';

export default function Home() {
  const [allMatches, setAllMatches] = useState([]);
  const [teams, setTeams] = useState({});
  const [loading, setLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef(null);

  useEffect(() => {
    const unsubscribeTeams = onValue(ref(db, 'teams'), (snapshot) => {
      if (snapshot.exists()) setTeams(snapshot.val());
    });

    const unsubscribeMatches = onValue(ref(db, 'matches'), (snapshot) => {
      if (snapshot.exists()) {
        const matchesData = snapshot.val();
        const list = Object.entries(matchesData)
          .map(([id, val]) => ({ id, ...val }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setAllMatches(list);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeTeams();
      unsubscribeMatches();
    };
  }, []);

  // Categorize
  const liveMatches = allMatches.filter(m => m.status === 'live');
  const upcomingMatches = allMatches.filter(m => m.status === 'upcoming' || m.status === 'ready');
  const finishedMatches = allMatches.filter(m => m.status === 'completed');
  
  // Top matches = live first, then upcoming, then recent finished (max 8)
  const topMatches = [...liveMatches, ...upcomingMatches, ...finishedMatches].slice(0, 8);

  // Track carousel scroll for pagination dots
  const handleScroll = () => {
    if (!carouselRef.current || topMatches.length === 0) return;
    const el = carouselRef.current;
    const cardWidth = el.scrollWidth / topMatches.length;
    const idx = Math.round(el.scrollLeft / cardWidth);
    setCarouselIndex(idx);
  };

  return (
    <div className="relative overflow-hidden min-h-screen bg-[var(--background)] pb-28">
      
      {/* Compact Header */}
      <div className="container mx-auto max-w-3xl px-4 pt-6 pb-2">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">StumpFlow</h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">Live cricket scoring engine</p>
      </div>

      {/* Quick-Filter Pill Buttons */}
      <div className="container mx-auto max-w-3xl px-4 py-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {/* Pill 1: IND */}
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-full glass-card border border-slate-200/60 text-xs font-bold text-slate-700 whitespace-nowrap hover:border-emerald-300/50 transition-all flex-shrink-0">
            🇮🇳 IND <ChevronRight size={12} className="text-slate-400" />
          </button>
          {/* Pill 2: Live */}
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-full glass-card border border-slate-200/60 text-xs font-bold text-slate-700 whitespace-nowrap hover:border-emerald-300/50 transition-all flex-shrink-0">
            🔴 Live ({liveMatches.length}) <ChevronRight size={12} className="text-slate-400" />
          </button>
          {/* Pill 3: IPL 2026 */}
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-full glass-card border border-slate-200/60 text-xs font-bold text-slate-700 whitespace-nowrap hover:border-emerald-300/50 transition-all flex-shrink-0">
            🏆 IPL 2026 <ChevronRight size={12} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* TOP MATCHES Section */}
      <div className="container mx-auto max-w-3xl px-4 mt-2">
        {/* Section Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">Top Matches</h2>
          <Link href="/matches" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-0.5">
            See All <ChevronRight size={14} />
          </Link>
        </div>

        {/* Horizontal Carousel */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-emerald-500/25 border-t-emerald-600 rounded-full animate-spin"></div>
          </div>
        ) : topMatches.length > 0 ? (
          <>
            <div
              ref={carouselRef}
              onScroll={handleScroll}
              className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-3 pb-4 -mx-4 px-4"
            >
              {topMatches.map(match => (
                <div key={match.id} className="min-w-[80vw] sm:min-w-[340px] md:min-w-[360px] snap-center flex-shrink-0">
                  <MatchCard match={match} teams={teams} />
                </div>
              ))}
            </div>

            {/* Pagination Dots */}
            {topMatches.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-2">
                {topMatches.map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      i === carouselIndex 
                        ? 'w-5 h-1.5 bg-emerald-500' 
                        : 'w-1.5 h-1.5 bg-slate-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="glass-card rounded-2xl p-10 text-center border border-slate-200/60">
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">No matches available</p>
            <p className="text-[10px] text-slate-400 mt-1">Create a match from the dashboard to get started.</p>
          </div>
        )}
      </div>

      {/* Recent Results Section */}
      {finishedMatches.length > 0 && (
        <div className="container mx-auto max-w-3xl px-4 mt-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">Recent Results</h2>
            <Link href="/matches" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-0.5">
              See All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {finishedMatches.slice(0, 4).map(match => (
              <MatchCard key={match.id} match={match} teams={teams} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Fixtures Section */}
      {upcomingMatches.length > 0 && (
        <div className="container mx-auto max-w-3xl px-4 mt-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">Upcoming</h2>
          </div>
          <div className="space-y-3">
            {upcomingMatches.slice(0, 4).map(match => (
              <MatchCard key={match.id} match={match} teams={teams} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
