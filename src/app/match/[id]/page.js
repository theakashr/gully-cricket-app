"use client";
import { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ArrowLeft, Trophy } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { ref, onValue, get } from 'firebase/database';

export default function MatchCenterPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const matchId = params.id;

  const [match, setMatch] = useState(null);
  const [teamA, setTeamA] = useState(null);
  const [teamB, setTeamB] = useState(null);
  const [balls, setBalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const matchRef = ref(db, `matches/${matchId}`);
    const unsubscribe = onValue(matchRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setMatch(data);
        
        // Fetch teams if we haven't already
        if (!teamA || !teamB) {
           try {
              if (data.teamA) {
                 const taSnap = await get(ref(db, `teams/${data.teamA}`));
                 setTeamA(taSnap.exists() ? taSnap.val() : { id: data.teamA, shortName: 'TBA', name: 'Unknown Team A' });
              } else {
                 setTeamA({ shortName: 'TBA', name: 'Unknown Team A' });
              }
              
              if (data.teamB) {
                 const tbSnap = await get(ref(db, `teams/${data.teamB}`));
                 setTeamB(tbSnap.exists() ? tbSnap.val() : { id: data.teamB, shortName: 'TBA', name: 'Unknown Team B' });
              } else {
                 setTeamB({ shortName: 'TBA', name: 'Unknown Team B' });
              }
           } catch (error) {
              console.error("Error fetching teams:", error);
              setTeamA({ shortName: 'TBA', name: 'Error' });
              setTeamB({ shortName: 'TBA', name: 'Error' });
           }
        }

        if (data.balls) {
          // Convert balls object to sorted array
          const ballsArr = Object.entries(data.balls)
            .map(([id, val]) => ({ id, ...val }))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // newest first
          setBalls(ballsArr);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [matchId, teamA, teamB]);

  if (loading || !match || !teamA || !teamB) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[var(--color-cricket-accent)]/30 border-t-[var(--color-cricket-accent)] rounded-full animate-spin"></div>
      </div>
    );
  }

  const getTeamName = (id) => {
    if (id === teamA.id) return teamA.name;
    if (id === teamB.id) return teamB.name;
    return 'Unknown';
  };

  const getTeamShort = (id) => {
    if (id === teamA.id) return teamA.shortName;
    if (id === teamB.id) return teamB.shortName;
    return 'UNK';
  };

  const currInningsKey = match.currentInnings === 1 ? 'innings1' : 'innings2';
  const { runs, wickets, overs, extras } = match.score[currInningsKey];
  const battingTeam = getTeamName(match.score[currInningsKey].team);
  const bowlingTeam = getTeamShort(match.currentInnings === 1 ? match.score.innings2.team : match.score.innings1.team);
  
  const crr = runs > 0 && overs > 0 ? (runs / (Math.floor(overs) + ((overs % 1) * 10 / 6))).toFixed(2) : '0.00';

  let targetRuns = null;
  let runsNeeded = null;
  let ballsRemaining = null;
  
  if (match.currentInnings === 2) {
    targetRuns = match.score.innings1.runs + 1;
    runsNeeded = targetRuns - runs;
    const maxBalls = match.overs * 6;
    const bowledBalls = (Math.floor(overs) * 6) + Math.round((overs % 1) * 10);
    ballsRemaining = maxBalls - bowledBalls;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl pb-20">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white font-bold text-sm mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Matches
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {match.status === 'completed' && match.result && (
           <div className="bg-gradient-to-r from-[var(--color-cricket-accent)]/20 to-[var(--color-cricket-blue)]/20 border border-[var(--color-cricket-accent)]/50 rounded-2xl p-6 text-center shadow-[0_0_30px_rgba(0,255,65,0.1)]">
              <Trophy size={40} className="mx-auto text-[var(--color-cricket-accent)] mb-3" />
              <h2 className="text-3xl font-black text-white">{getTeamName(match.result.winner)} Won!</h2>
              <p className="text-[var(--color-cricket-accent)] font-bold mt-1 uppercase tracking-widest text-sm">{match.result.margin}</p>
           </div>
        )}

        {/* Scorecard Header */}
        <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[var(--color-cricket-blue)] to-[var(--color-cricket-accent)]"></div>
          
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Innings {match.currentInnings}</span>
            <span className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider flex items-center gap-2 uppercase ${match.status === 'live' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-gray-800 text-gray-400'}`}>
              {match.status === 'live' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
              {match.status}
            </span>
          </div>

          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-7xl font-black text-white tracking-tighter tabular-nums drop-shadow-lg leading-none">
                <span className="text-2xl text-[var(--color-cricket-accent)] block mb-2 tracking-normal">{battingTeam}</span>
                <span className="text-white">{runs}</span>
                <span className="text-5xl text-gray-500">/{wickets}</span>
              </h2>
              <div className="flex gap-3 mt-4">
                 <div className="bg-black/30 inline-flex items-center gap-3 px-4 py-2 rounded-xl border border-white/5">
                   <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Overs</span>
                   <span className="text-2xl font-black text-white tabular-nums">{overs.toFixed(1)} <span className="text-sm text-gray-500 font-medium">({match.overs}.0)</span></span>
                 </div>
                 {extras && (
                    <div className="bg-black/30 inline-flex items-center gap-3 px-4 py-2 rounded-xl border border-white/5">
                      <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Extras</span>
                      <span className="text-sm font-bold text-gray-300">
                        {extras.wd + extras.nb + extras.b + extras.lb} 
                        <span className="text-xs text-gray-500 ml-1 font-normal">(W {extras.wd}, NB {extras.nb}, B {extras.b}, LB {extras.lb})</span>
                      </span>
                    </div>
                 )}
              </div>
            </div>
            
            <div className="flex flex-col items-end">
              <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase mb-2">Current Run Rate</p>
              <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-md mb-2">
                <p className="text-4xl font-black text-[var(--color-cricket-blue)] tabular-nums drop-shadow-md">{crr}</p>
              </div>
              {targetRuns && match.status !== 'completed' && (
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">REQ: <span className="text-white">{(runsNeeded / (ballsRemaining / 6)).toFixed(2) || 0}</span></p>
              )}
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <span className="text-xl font-black text-gray-600">{bowlingTeam}</span>
                <span className="text-sm text-gray-500 font-bold uppercase tracking-widest">{match.currentInnings === 1 ? 'Yet to bat' : `Scored ${match.score.innings1.runs}/${match.score.innings1.wickets}`}</span>
             </div>
             
             {match.currentInnings === 2 && match.status !== 'completed' ? (
                <p className="text-sm text-[var(--color-cricket-accent)] font-bold">
                  Need {runsNeeded} runs from {ballsRemaining} balls
                </p>
             ) : (
                <p className="text-sm text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  Toss: {getTeamShort(match.toss?.wonBy)} elected to {match.toss?.decision}
                </p>
             )}
          </div>
        </div>

        {/* Live Commentary Feed */}
        <div className="glass rounded-3xl p-8">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="text-[var(--color-cricket-accent)]" /> Ball by Ball Commentary
          </h3>

          <div className="space-y-4">
            {balls.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-500 italic">No balls bowled yet. Waiting for scorer...</p>
              </div>
            ) : (
              balls.map((ball, i) => {
                let ballLabel = ball.runs.toString();
                let isExtra = false;
                
                if (ball.type === 'wicket') ballLabel = 'W';
                else if (ball.type === 'wd') { ballLabel = ball.runs > 1 ? `${ball.runs}wd` : 'wd'; isExtra = true; }
                else if (ball.type === 'nb') { ballLabel = ball.runs > 1 ? `${ball.runs}nb` : 'nb'; isExtra = true; }
                else if (ball.type === 'b') { ballLabel = `${ball.runs}b`; isExtra = true; }
                else if (ball.type === 'lb') { ballLabel = `${ball.runs}lb`; isExtra = true; }
                
                return (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={ball.id} 
                    className={`flex gap-4 p-4 rounded-2xl transition-colors border ${i === 0 ? 'bg-white/5 border-white/10' : 'border-transparent hover:border-white/5 hover:bg-white/5'}`}
                  >
                    <div className="w-16 flex-shrink-0 text-center flex flex-col justify-center">
                      <span className="text-sm font-bold text-gray-400">{ball.over}</span>
                      <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-1">Inn {ball.innings}</span>
                    </div>
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-sm shadow-lg ${
                        ball.type === 'wicket' ? 'bg-red-500 text-white shadow-red-500/20' : 
                        (ball.runs === 4 || ball.runs === 6) && !isExtra ? 'bg-[var(--color-cricket-accent)] text-black shadow-[var(--color-cricket-accent)]/20' :
                        isExtra ? 'bg-orange-500 text-white shadow-orange-500/20' :
                        'bg-gray-800 text-gray-300'
                      }`}>
                        {ballLabel}
                      </div>
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="text-white font-medium">
                        {ball.type === 'wicket' ? 'OUT! Massive breakthrough for the bowling team.' : 
                         ball.type === 'wd' ? `Wide ball down the leg side.` :
                         ball.type === 'nb' ? `No ball! Free hit coming up.` :
                         ball.type === 'b' ? `Byes! Keeper missed it completely.` :
                         ball.type === 'lb' ? `Leg byes! Deflected off the pads.` :
                         ball.runs === 6 ? 'SIX! Clean strike over the ropes!' : 
                         ball.runs === 4 ? 'FOUR! Pierces the gap perfectly.' : 
                         `${ball.runs} run${ball.runs !== 1 ? 's' : ''}. Good rotation of strike.`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(ball.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
