"use client";
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';

export default function MatchCard({ match, teams }) {
  const getTeamCode = (teamId) => teams[teamId]?.shortName || 'TBD';
  
  const [recentBalls, setRecentBalls] = useState([]);

  const isLive = match.status === 'live';
  const isFinished = match.status === 'completed';
  const isUpcoming = match.status === 'upcoming';

  const inningsKey = match.currentInnings === 1 ? 'innings1' : 'innings2';
  const runs = match.score?.[inningsKey]?.runs || 0;
  const wickets = match.score?.[inningsKey]?.wickets || 0;
  const overs = match.score?.[inningsKey]?.overs || 0;

  useEffect(() => {
    if (isLive) {
      const ballsRef = query(ref(db, `balls/${match.id}`), orderByChild('timestamp'), limitToLast(6));
      const unsubscribe = onValue(ballsRef, (snapshot) => {
        if (snapshot.exists()) {
          const ballsData = snapshot.val();
          const ballsArr = Object.values(ballsData).sort((a, b) => a.timestamp - b.timestamp);
          setRecentBalls(ballsArr);
        }
      });
      return () => unsubscribe();
    }
  }, [match.id, isLive]);

  // Card Variants for Parallax Hover
  const cardVariants = {
    rest: { scale: 1, y: 0, rotateX: 0, rotateY: 0, boxShadow: "0px 10px 30px rgba(0,0,0,0.5)" },
    hover: { 
      scale: 1.02, 
      y: -5,
      boxShadow: "0px 20px 40px rgba(57, 255, 20, 0.15)",
      transition: { type: "spring", stiffness: 300, damping: 20 }
    }
  };

  const activeBatting = isLive ? (match.currentInnings === 1 ? match.teamA : match.teamB) : null;

  return (
    <Link href={`/match/${match.id}`} className="block relative z-10 w-full h-full perspective-1000">
      <motion.div 
        variants={cardVariants}
        initial="rest"
        whileHover="hover"
        whileTap={{ scale: 0.98 }}
        style={{ willChange: "transform" }}
        className="glass-dark rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-full relative overflow-hidden transition-colors border border-[var(--color-cricket-border)] hover:border-[var(--color-cricket-accent)]"
      >
        {/* Neon Light Streak on Live */}
        {isLive && (
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[var(--color-cricket-accent)] to-transparent opacity-75"></div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 truncate pr-2">
            {match.matchName || match.stage || "Match Center"}
          </span>
          <span className={`px-2 py-0.5 rounded-sm text-[10px] font-black flex items-center gap-1.5 uppercase tracking-wider ${
            isLive ? 'bg-[var(--color-cricket-accent)]/10 text-[var(--color-cricket-accent)] border border-[var(--color-cricket-accent)]/30' : 
            isFinished ? 'bg-gray-800 text-gray-300 border border-gray-700' :
            'bg-gray-800 text-gray-400 border border-gray-700'
          }`}>
            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-cricket-accent)] animate-pulse shadow-[0_0_8px_var(--color-cricket-accent)]"></span>}
            {match.status}
          </span>
        </div>
        
        {/* Team Grid */}
        <div className="space-y-3 mb-4 flex-1">
          {/* Team A */}
          <div className={`flex justify-between items-center pl-2 border-l-2 ${activeBatting === match.teamA ? 'border-[var(--color-cricket-accent)]' : 'border-transparent'}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                <span className="text-xs font-black text-white">{getTeamCode(match.teamA).substring(0, 3)}</span>
              </div>
              <span className="text-sm font-bold text-gray-100">{getTeamCode(match.teamA)}</span>
            </div>
            <div className="text-right">
              {((isLive || isFinished) && match.currentInnings >= 1) ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black text-white">{match.score?.innings1?.runs || 0}/{match.score?.innings1?.wickets || 0}</span>
                  <span className="text-[10px] text-gray-400 font-bold">({match.score?.innings1?.overs || 0})</span>
                </div>
              ) : isUpcoming ? (
                <span className="text-xs text-gray-500 font-bold">Yet to bat</span>
              ) : null}
            </div>
          </div>

          {/* Team B */}
          <div className={`flex justify-between items-center pl-2 border-l-2 ${activeBatting === match.teamB ? 'border-[var(--color-cricket-accent)]' : 'border-transparent'}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                <span className="text-xs font-black text-white">{getTeamCode(match.teamB).substring(0, 3)}</span>
              </div>
              <span className="text-sm font-bold text-gray-100">{getTeamCode(match.teamB)}</span>
            </div>
            <div className="text-right">
              {((isLive || isFinished) && match.currentInnings === 2) ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black text-white">{match.score?.innings2?.runs || 0}/{match.score?.innings2?.wickets || 0}</span>
                  <span className="text-[10px] text-gray-400 font-bold">({match.score?.innings2?.overs || 0})</span>
                </div>
              ) : isLive && match.currentInnings === 1 ? (
                <span className="text-xs text-gray-500 font-bold">Yet to bat</span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Live Analytics & Ticker */}
        {isLive && (
          <div className="mt-auto pt-3 border-t border-gray-800/60">
            {recentBalls.length > 0 && (
              <div className="flex items-center gap-1.5 mb-2 overflow-x-auto scrollbar-hide py-1">
                <span className="text-[9px] font-black uppercase text-gray-500 mr-1">Last 6:</span>
                {recentBalls.map((ball) => {
                  let ballClass = "border border-gray-600 text-gray-300";
                  let label = ball.runs;
                  
                  if (ball.type === 'wicket') {
                    ballClass = "bg-red-600 text-white border-red-500 shadow-[0_0_8px_rgba(220,38,38,0.5)]";
                    label = "W";
                  } else if (ball.runs === 4) {
                    ballClass = "bg-[var(--color-cricket-cyan)] text-black font-black shadow-[0_0_8px_rgba(0,240,255,0.4)]";
                  } else if (ball.runs === 6) {
                    ballClass = "bg-[var(--color-cricket-accent)] text-black font-black shadow-[0_0_8px_rgba(57,255,20,0.4)]";
                  } else if (ball.type === 'wide') {
                    label = "WD";
                  } else if (ball.type === 'noBall') {
                    label = "NB";
                  }

                  return (
                    <div key={ball.id} className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${ballClass}`}>
                      {label}
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[var(--color-cricket-cyan)] font-black uppercase tracking-wider">
                CRR: {overs > 0 ? (runs / overs).toFixed(2) : "0.00"}
              </span>
              <span className="text-gray-400 font-bold">
                {match.currentInnings === 2 ? `Target: ${match.score.innings1.runs + 1}` : `Innings 1`}
              </span>
            </div>
          </div>
        )}

        {isFinished && match.result && (
          <div className="mt-auto pt-3 border-t border-gray-800/60 text-center">
            <span className="text-[10px] font-black text-[var(--color-cricket-accent)] uppercase tracking-widest">
              {teams[match.result.winner]?.shortName} Won
            </span>
          </div>
        )}
        
        {isUpcoming && (
          <div className="mt-auto pt-3 border-t border-gray-800/60 text-center">
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
              Starts Soon
            </span>
          </div>
        )}
      </motion.div>
    </Link>
  );
}
