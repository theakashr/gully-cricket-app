"use client";
import { useState, useEffect, use } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Activity, Target } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';

export default function PlayerProfilePage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const playerId = params.id;
  
  const [player, setPlayer] = useState(null);
  const [careerStats, setCareerStats] = useState({
    matches: 0,
    runs: 0,
    highestScore: 0,
    average: '0.00',
    strikeRate: '0.00',
    fifties: 0,
    hundreds: 0,
    wickets: 0,
    bestBowling: '0/0',
    economy: '0.00'
  });
  const [loading, setLoading] = useState(true);

  // (State initialized above)

  useEffect(() => {
    const playerRef = ref(db, `players/${playerId}`);
    const matchesRef = ref(db, 'matches');

    let playerUnsub;
    let matchesUnsub;

    playerUnsub = onValue(playerRef, (snapshot) => {
      if (snapshot.exists()) {
        setPlayer(snapshot.val());
      }
      
      matchesUnsub = onValue(matchesRef, (matchesSnap) => {
         if (matchesSnap.exists()) {
            const allMatches = Object.values(matchesSnap.val()).filter(m => m.status === 'completed');
            calculateStats(allMatches);
         }
         setLoading(false);
      });
    });

    return () => {
      if (playerUnsub) playerUnsub();
      if (matchesUnsub) matchesUnsub();
    };
  }, [playerId]);

  const calculateStats = (allMatches) => {
     let tMatches = 0;
     let tRuns = 0;
     let tBalls = 0;
     let tOuts = 0;
     let hScore = 0;
     let fifties = 0;
     let hundreds = 0;

     let bMatches = 0;
     let tWickets = 0;
     let bRuns = 0;
     let bOvers = 0; // standard balls
     let bestW = 0;
     let bestR = 999;

     allMatches.forEach(m => {
        let playedBatting = false;
        let playedBowling = false;

        [1, 2].forEach(inn => {
           const innings = m.score?.[`innings${inn}`];
           if (!innings) return;

           // Batting
           if (innings.batting && innings.batting[playerId]) {
              const b = innings.batting[playerId];
              if (b.status !== 'did not bat') {
                 playedBatting = true;
                 const runs = b.runs || 0;
                 const balls = b.balls || 0;
                 tRuns += runs;
                 tBalls += balls;
                 if (b.status === 'out') tOuts += 1;
                 
                 if (runs > hScore) hScore = runs;
                 if (runs >= 100) hundreds += 1;
                 else if (runs >= 50) fifties += 1;
              }
           }

           // Bowling
           if (innings.bowling && innings.bowling[playerId]) {
              playedBowling = true;
              const bo = innings.bowling[playerId];
              const w = bo.wickets || 0;
              const r = bo.runs || 0;
              const oStr = (bo.overs || 0).toString();
              
              tWickets += w;
              bRuns += r;
              
              // Calculate balls bowled correctly
              const oParts = oStr.split('.');
              const completeOvers = parseInt(oParts[0]) || 0;
              const partialBalls = parseInt(oParts[1]) || 0;
              bOvers += (completeOvers * 6) + partialBalls;

              // Best bowling logic
              if (w > bestW || (w === bestW && r < bestR)) {
                 bestW = w;
                 bestR = r;
              }
           }
        });

        if (playedBatting || playedBowling) tMatches += 1;
     });

     const avg = tOuts > 0 ? (tRuns / tOuts).toFixed(2) : (tRuns > 0 ? tRuns.toFixed(2) : '0.00');
     const sr = tBalls > 0 ? ((tRuns / tBalls) * 100).toFixed(2) : '0.00';
     const totalOvers = Math.floor(bOvers / 6) + (bOvers % 6) / 10;
     const econ = bOvers > 0 ? ((bRuns / bOvers) * 6).toFixed(2) : '0.00';

     setCareerStats({
        matches: tMatches,
        runs: tRuns,
        highestScore: hScore,
        average: avg,
        strikeRate: sr,
        fifties,
        hundreds,
        wickets: tWickets,
        bestBowling: bestW > 0 ? `${bestW}/${bestR}` : '0/0',
        economy: econ
     });
  };

  if (loading || !player) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-10 h-10 border-4 border-[var(--color-cricket-accent)]/30 border-t-[var(--color-cricket-accent)] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl pb-20">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white font-bold text-sm mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Home
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Player Header Banner */}
        <div className="glass-card rounded-3xl p-8 relative overflow-hidden flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[var(--color-cricket-blue)] to-[var(--color-cricket-accent)]"></div>
          
          <div className="w-40 h-40 rounded-full bg-white/5 border-4 border-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-2xl relative z-10">
            {player.photoUrl ? (
               <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
            ) : (
               <User className="text-gray-500" size={64} />
            )}
          </div>
          
          <div className="flex-1 text-center md:text-left z-10 pt-4">
            <span className="inline-block bg-[var(--color-cricket-accent)]/20 text-[var(--color-cricket-accent)] text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3 border border-[var(--color-cricket-accent)]/30">
              {player.role}
            </span>
            <h1 className="text-5xl font-black text-white tracking-tighter mb-4">{player.name}</h1>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-6">
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-xl">🏏</span>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Batting Style</p>
                  <p className="text-sm text-white font-semibold">{player.battingStyle || 'Right-Handed'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-xl">🥎</span>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Bowling Style</p>
                  <p className="text-sm text-white font-semibold">{player.bowlingStyle || 'Right-arm Fast'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Background Decorative Element */}
          <div className="absolute -right-20 -bottom-20 opacity-5 pointer-events-none">
             <User size={300} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Batting Stats */}
          <div className="glass rounded-3xl p-8">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Activity className="text-[var(--color-cricket-accent)]" /> Batting Career
            </h2>
            <div className="grid grid-cols-2 gap-4">
               <StatBox label="Matches" value={careerStats.matches} />
               <StatBox label="Runs" value={careerStats.runs} highlight />
               <StatBox label="Average" value={careerStats.average} />
               <StatBox label="Strike Rate" value={careerStats.strikeRate} highlight />
               <StatBox label="Highest Score" value={careerStats.highestScore} />
               <StatBox label="50s / 100s" value={`${careerStats.fifties} / ${careerStats.hundreds}`} />
            </div>
          </div>

          {/* Bowling Stats */}
          <div className="glass rounded-3xl p-8">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Target className="text-purple-500" /> Bowling Career
            </h2>
            <div className="grid grid-cols-2 gap-4">
               <StatBox label="Matches" value={careerStats.matches} />
               <StatBox label="Wickets" value={careerStats.wickets} highlight color="text-purple-500" />
               <StatBox label="Economy" value={careerStats.economy} />
               <StatBox label="Best Bowling" value={careerStats.bestBowling} highlight color="text-purple-500" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function StatBox({ label, value, highlight = false, color = "text-[var(--color-cricket-accent)]" }) {
  return (
    <div className={`p-4 rounded-2xl ${highlight ? 'bg-white/5 border border-white/10' : ''}`}>
      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">{label}</p>
      <p className={`text-3xl font-black ${highlight ? color : 'text-white'} tabular-nums`}>{value}</p>
    </div>
  );
}
