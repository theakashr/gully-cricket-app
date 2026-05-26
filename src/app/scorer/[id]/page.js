"use client";
import { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, AlertTriangle, PlayCircle, LogOut, ArrowRight } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { db } from '@/lib/firebase';
import { ref, onValue, push, set, update, get, remove } from 'firebase/database';
import { useRouter } from 'next/navigation';

export default function ScorerPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const matchId = params.id;
  const router = useRouter();

  const [match, setMatch] = useState(null);
  const [teamA, setTeamA] = useState(null);
  const [teamB, setTeamB] = useState(null);
  const [currentOver, setCurrentOver] = useState([]);
  const [lastBallId, setLastBallId] = useState(null);
  const [striker, setStriker] = useState({ name: '', runs: 0, balls: 0 });
  const [nonStriker, setNonStriker] = useState({ name: '', runs: 0, balls: 0 });
  const [bowler, setBowler] = useState({ name: '', overs: 0, runs: 0, wickets: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) return;
    const matchRef = ref(db, `matches/${matchId}`);
    
    const unsubscribe = onValue(matchRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setMatch(data);
        
        // Fetch teams once
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

        if (data.currentInnings) {
          const cp = data.score[`innings${data.currentInnings}`]?.currentPlayers;
          if (cp) {
            setStriker(prev => typeof cp.striker === 'string' ? { ...prev, name: cp.striker } : (cp.striker || prev));
            setNonStriker(prev => typeof cp.nonStriker === 'string' ? { ...prev, name: cp.nonStriker } : (cp.nonStriker || prev));
            setBowler(prev => typeof cp.bowler === 'string' ? { ...prev, name: cp.bowler } : (cp.bowler || prev));
          }
        }

        if (data.balls) {
           const ballsEntries = Object.entries(data.balls).sort((a, b) => new Date(a[1].timestamp) - new Date(b[1].timestamp));
           
           if (ballsEntries.length > 0) {
             setLastBallId(ballsEntries[ballsEntries.length - 1][0]);
           } else {
             setLastBallId(null);
           }

           const recentBalls = ballsEntries.slice(-6).map(([id, b]) => {
             if (b.type === 'wicket') return 'W';
             if (b.type === 'wd') return b.runs > 1 ? `${b.runs}wd` : 'wd';
             if (b.type === 'nb') return b.runs > 1 ? `${b.runs}nb` : 'nb';
             if (b.type === 'b' || b.type === 'lb') return `${b.runs}${b.type}`;
             if (b.type === 'boundary') return b.runs.toString();
             return b.runs.toString();
           });
           setCurrentOver(recentBalls);
        } else {
           setCurrentOver([]);
           setLastBallId(null);
        }
      } else {
        alert("Match not found!");
        router.push('/dashboard');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [matchId, router, teamA, teamB]);

  const updatePlayers = async () => {
    if (!match) return;
    const currInningsKey = match.currentInnings === 1 ? 'innings1' : 'innings2';
    try {
      await update(ref(db, `matches/${matchId}/score/${currInningsKey}/currentPlayers`), {
        striker,
        nonStriker,
        bowler
      });
    } catch (error) {
      console.error("Error updating players:", error);
    }
  };

  const manualSwapStrike = async () => {
    const temp = striker;
    setStriker(nonStriker);
    setNonStriker(temp);
    
    if (!match) return;
    const currInningsKey = match.currentInnings === 1 ? 'innings1' : 'innings2';
    try {
      await update(ref(db, `matches/${matchId}/score/${currInningsKey}/currentPlayers`), {
        striker: nonStriker,
        nonStriker: temp,
        bowler
      });
    } catch (error) {
      console.error("Error swapping players:", error);
    }
  };

  const recordBall = async (runs, type) => {
    if (!match) return;
    
    const currInningsKey = match.currentInnings === 1 ? 'innings1' : 'innings2';
    const currentScore = match.score[currInningsKey];
    
    let newRuns = currentScore.runs + runs;
    let newWickets = currentScore.wickets + (type === 'wicket' ? 1 : 0);
    
    // Extras logic
    const extras = { ...currentScore.extras };
    let isLegalBall = true;

    if (type === 'wd') {
      newRuns += 1; // Wide adds 1 run default
      extras.wd += (1 + runs);
      isLegalBall = false;
    } else if (type === 'nb') {
      newRuns += 1; // NB adds 1 run default
      extras.nb += (1 + runs);
      isLegalBall = false;
    } else if (type === 'b') {
      extras.b += runs;
    } else if (type === 'lb') {
      extras.lb += runs;
    }

    // Overs logic
    let newOvers = currentScore.overs;
    if (isLegalBall) {
      let currentOversInt = Math.floor(currentScore.overs);
      let currentBallsInt = Math.round((currentScore.overs - currentOversInt) * 10);
      
      let newBallsInt = currentBallsInt + 1;
      let newOversInt = currentOversInt;
      
      if (newBallsInt === 6) {
        newOversInt += 1;
        newBallsInt = 0;
      }
      newOvers = parseFloat(`${newOversInt}.${newBallsInt}`);
    }

    // Individual Stats Logic
    let newStriker = { ...striker };
    let newNonStriker = { ...nonStriker };
    let newBowler = { ...bowler };
    
    if (type === 'normal' || type === 'boundary') {
       newStriker.runs += runs;
       newStriker.balls += 1;
       newBowler.runs += runs;
    } else if (type === 'wicket') {
       newStriker.balls += 1;
       newBowler.wickets += 1;
    } else if (type === 'wd' || type === 'nb') {
       newBowler.runs += (runs + 1);
       if (type === 'nb') newStriker.balls += 1; // NB counts as ball faced usually
    } else if (type === 'b' || type === 'lb') {
       newStriker.balls += 1;
    }

    if (isLegalBall) {
       let currentOversInt = Math.floor(newBowler.overs);
       let currentBallsInt = Math.round((newBowler.overs - currentOversInt) * 10);
       let newBallsInt = currentBallsInt + 1;
       let newOversInt = currentOversInt;
       if (newBallsInt === 6) {
         newOversInt += 1;
         newBallsInt = 0;
       }
       newBowler.overs = parseFloat(`${newOversInt}.${newBallsInt}`);
    }

    // Commentary Generation
    let commentary = `${newBowler.name || 'Bowler'} to ${newStriker.name || 'Batsman'}, `;
    if (type === 'wicket') commentary += `OUT!`;
    else if (type === 'boundary') commentary += `FOUR!`;
    else if (runs === 6) commentary += `SIX!`;
    else if (type === 'wd') commentary += `${runs+1} Wide`;
    else if (type === 'nb') commentary += `${runs+1} No Ball`;
    else if (type === 'b') commentary += `${runs} Bye`;
    else if (type === 'lb') commentary += `${runs} Leg Bye`;
    else if (runs === 0) commentary += `no run.`;
    else commentary += `${runs} run${runs > 1 ? 's' : ''}.`;

    // Strike Rotation Logic
    let shouldSwap = false;
    if (type === 'normal' || type === 'boundary' || type === 'b' || type === 'lb') {
       if (runs % 2 !== 0) shouldSwap = !shouldSwap;
    }
    
    if (isLegalBall) {
       let currentBallsInt = Math.round((newOvers - Math.floor(newOvers)) * 10);
       if (currentBallsInt === 0) {
         shouldSwap = !shouldSwap; // Swap at end of over
       }
    }

    if (shouldSwap) {
       const temp = newStriker;
       newStriker = newNonStriker;
       newNonStriker = temp;
    }

    if (type === 'wicket') {
       // Reset striker for new batsman
       newStriker = { name: '', runs: 0, balls: 0 };
    }

    setStriker(newStriker);
    setNonStriker(newNonStriker);
    setBowler(newBowler);

    try {
      const ballsRef = ref(db, `matches/${matchId}/balls`);
      const newBallRef = push(ballsRef);
      await set(newBallRef, {
        runs,
        type,
        isLegalBall,
        over: newOvers,
        innings: match.currentInnings,
        commentary,
        timestamp: new Date().toISOString()
      });

      const updates = {
        status: 'live',
        [`score/${currInningsKey}/runs`]: newRuns,
        [`score/${currInningsKey}/wickets`]: newWickets,
        [`score/${currInningsKey}/overs`]: newOvers,
        [`score/${currInningsKey}/extras`]: extras,
        [`score/${currInningsKey}/currentPlayers`]: {
           striker: newStriker,
           nonStriker: newNonStriker,
           bowler: newBowler
        }
      };

      await update(ref(db, `matches/${matchId}`), updates);
    } catch (error) {
      console.error("Error updating score:", error);
    }
  };

  const handleUndo = async () => {
    if (!lastBallId || !match) return;
    
    const lastBall = match.balls[lastBallId];
    if (lastBall.innings !== match.currentInnings) {
      alert("Cannot undo a ball from the previous innings.");
      return;
    }

    if (!confirm("Are you sure you want to undo the last ball?")) return;

    const currInningsKey = match.currentInnings === 1 ? 'innings1' : 'innings2';
    const currentScore = match.score[currInningsKey];
    
    let revertRuns = lastBall.runs;
    let revertWickets = lastBall.type === 'wicket' ? 1 : 0;
    const extras = { ...currentScore.extras };

    if (lastBall.type === 'wd') {
      revertRuns += 1;
      extras.wd -= (1 + lastBall.runs);
    } else if (lastBall.type === 'nb') {
      revertRuns += 1;
      extras.nb -= (1 + lastBall.runs);
    } else if (lastBall.type === 'b') {
      extras.b -= lastBall.runs;
    } else if (lastBall.type === 'lb') {
      extras.lb -= lastBall.runs;
    }

    let revertedOvers = currentScore.overs;
    if (lastBall.isLegalBall) {
      let currentOversInt = Math.floor(currentScore.overs);
      let currentBallsInt = Math.round((currentScore.overs - currentOversInt) * 10);
      
      let newBallsInt = currentBallsInt - 1;
      let newOversInt = currentOversInt;
      
      if (newBallsInt < 0) {
        newOversInt -= 1;
        newBallsInt = 5;
      }
      revertedOvers = parseFloat(`${newOversInt}.${newBallsInt}`);
    }

    try {
      await remove(ref(db, `matches/${matchId}/balls/${lastBallId}`));

      const updates = {
        [`score/${currInningsKey}/runs`]: currentScore.runs - revertRuns,
        [`score/${currInningsKey}/wickets`]: currentScore.wickets - revertWickets,
        [`score/${currInningsKey}/overs`]: revertedOvers,
        [`score/${currInningsKey}/extras`]: extras
      };
      await update(ref(db, `matches/${matchId}`), updates);
    } catch (error) {
      console.error("Error undoing:", error);
    }
  };

  const startNextInnings = async () => {
    if (confirm("Start 2nd Innings?")) {
      await update(ref(db, `matches/${matchId}`), { currentInnings: 2 });
    }
  };

  const endMatch = async (winnerId, reason) => {
    if (confirm(`End match? Winner: ${getTeamName(winnerId)}`)) {
      await update(ref(db, `matches/${matchId}`), { 
        status: 'completed',
        result: { winner: winnerId, margin: reason }
      });
      router.push('/dashboard/matches');
    }
  };

  if (loading || !match || !teamA || !teamB) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
         <div className="w-10 h-10 border-4 border-[var(--color-cricket-accent)]/30 border-t-[var(--color-cricket-accent)] rounded-full animate-spin"></div>
      </div>
    );
  }

  const getTeamName = (id) => {
    if (id === teamA.id) return teamA.shortName;
    if (id === teamB.id) return teamB.shortName;
    return 'Unknown';
  };

  const currInningsKey = match.currentInnings === 1 ? 'innings1' : 'innings2';
  const { runs, wickets, overs } = match.score[currInningsKey];
  const battingTeam = getTeamName(match.score[currInningsKey].team);
  
  const crr = runs > 0 && overs > 0 ? (runs / (Math.floor(overs) + ((overs % 1) * 10 / 6))).toFixed(2) : '0.00';

  // Innings Transition Logic
  const isAllOut = wickets === 10;
  const isOversDone = overs >= match.overs;
  
  // 2nd Innings Target logic
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
    <ProtectedRoute allowedRoles={['admin', 'scorer', 'manager']}>
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <div className="flex justify-between items-center mb-6">
           <button onClick={() => router.push('/dashboard/matches')} className="text-gray-400 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors">
              <LogOut size={16} /> Exit Panel
           </button>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 pb-20"
        >
          {/* Main Score Board */}
          <div className="glass-card rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--color-cricket-blue)] to-[var(--color-cricket-accent)]"></div>
            
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">Innings {match.currentInnings}</span>
              <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> {match.status === 'live' ? 'SCORING LIVE' : 'MATCH READY'}
              </span>
            </div>

            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-6xl font-black text-white tracking-tighter tabular-nums drop-shadow-lg leading-none">
                  <span className="text-2xl text-[var(--color-cricket-accent)] block mb-2 tracking-normal">{battingTeam}</span>
                  <span className="text-white">{runs}</span>
                  <span className="text-4xl text-gray-500">/{wickets}</span>
                </h2>
                <div className="mt-4 bg-black/30 inline-flex items-center gap-3 px-3 py-1.5 rounded-lg border border-white/5">
                  <span className="text-gray-400 text-xs font-semibold">OVERS</span>
                  <span className="text-xl font-bold text-white tabular-nums">{overs.toFixed(1)} <span className="text-sm text-gray-500 font-medium">({match.overs}.0)</span></span>
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase mb-1">CRR</p>
                <div className="bg-[var(--color-cricket-blue)]/10 border border-[var(--color-cricket-blue)]/20 px-4 py-2 rounded-xl mb-2">
                  <p className="text-2xl font-black text-[var(--color-cricket-blue)] tabular-nums drop-shadow-md">{crr}</p>
                </div>
                {targetRuns && (
                  <div className="text-right">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">REQ: <span className="text-white">{(runsNeeded / (ballsRemaining / 6)).toFixed(2) || 0}</span></p>
                  </div>
                )}
              </div>
            </div>
            
            {targetRuns && (
               <div className="mt-4 pt-4 border-t border-white/10 text-center">
                  <p className="text-sm font-bold text-[var(--color-cricket-accent)]">
                    Need {runsNeeded} runs from {ballsRemaining} balls
                  </p>
               </div>
            )}
          </div>
          
          {/* Current Over Timeline */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                <PlayCircle size={14} className="text-[var(--color-cricket-accent)]" /> Recent Balls
              </span>
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              <AnimatePresence>
                {currentOver.length === 0 && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-600 text-sm font-medium italic">
                    Waiting for first ball...
                  </motion.span>
                )}
                {currentOver.map((ball, i) => (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    key={i} 
                    className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full text-lg font-black shadow-lg border ${
                      ball === 'W' ? 'bg-red-500 text-white border-red-400 shadow-red-500/20' : 
                      (ball === '6' || ball === '4') ? 'bg-[var(--color-cricket-accent)] text-[var(--color-cricket-dark)] border-[var(--color-cricket-accent)] shadow-[var(--color-cricket-accent)]/20' : 
                      ball.includes('wd') || ball.includes('nb') ? 'bg-orange-500 text-white border-orange-400 text-sm' :
                      'bg-gray-800 text-gray-200 border-gray-700'
                    }`}
                  >
                    {ball}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* End Innings / Match Triggers */}
          {(isAllOut || isOversDone) && match.currentInnings === 1 && (
            <div className="bg-orange-500/20 border border-orange-500 p-4 rounded-2xl text-center">
               <h3 className="text-orange-500 font-black text-xl mb-2">Innings Complete!</h3>
               <button onClick={startNextInnings} className="w-full bg-orange-500 text-black font-black uppercase tracking-widest py-3 rounded-xl flex justify-center items-center gap-2">
                 Start 2nd Innings <ArrowRight size={18} />
               </button>
            </div>
          )}
          
          {(match.currentInnings === 2 && (isAllOut || isOversDone || runsNeeded <= 0)) && (
            <div className="bg-green-500/20 border border-green-500 p-4 rounded-2xl text-center">
               <h3 className="text-green-500 font-black text-xl mb-2">Match Complete!</h3>
               <button onClick={() => {
                 if (runsNeeded <= 0) endMatch(match.score.innings2.team, `${getTeamName(match.score.innings2.team)} chased the target`);
                 else if (runsNeeded > 0) endMatch(match.score.innings1.team, `${getTeamName(match.score.innings1.team)} defended the target`);
                 else endMatch('Draw', 'Match Tied');
               }} className="w-full bg-green-500 text-black font-black uppercase tracking-widest py-3 rounded-xl">
                 Declare Result & End Match
               </button>
            </div>
          )}

          {/* Current Players Inputs */}
          <div className="glass rounded-2xl p-5 mb-4 border border-white/5 relative">
            <div className="flex justify-between items-center mb-3">
               <h3 className="text-gray-400 font-bold text-xs uppercase tracking-widest">Current Players</h3>
               <button onClick={manualSwapStrike} className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-[var(--color-cricket-accent)] hover:text-white transition-colors bg-[var(--color-cricket-accent)]/10 px-2 py-1 rounded">
                  <RotateCcw size={12} /> Swap Strike
               </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold ml-1">Striker</label>
                  <input 
                    type="text" 
                    value={striker.name} 
                    onChange={(e) => setStriker({...striker, name: e.target.value})}
                    onBlur={updatePlayers}
                    placeholder="Striker Name" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--color-cricket-accent)]"
                  />
                  <div className="text-[10px] text-gray-400 ml-1 mt-1">
                    {striker.runs} ({striker.balls})
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold ml-1">Non-Striker</label>
                  <input 
                    type="text" 
                    value={nonStriker.name} 
                    onChange={(e) => setNonStriker({...nonStriker, name: e.target.value})}
                    onBlur={updatePlayers}
                    placeholder="Non-Striker Name" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--color-cricket-accent)]"
                  />
                  <div className="text-[10px] text-gray-400 ml-1 mt-1">
                    {nonStriker.runs} ({nonStriker.balls})
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-[var(--color-cricket-accent)] uppercase tracking-wider font-bold ml-1">Bowler</label>
                <input 
                  type="text" 
                  value={bowler.name} 
                  onChange={(e) => setBowler({...bowler, name: e.target.value})}
                  onBlur={updatePlayers}
                  placeholder="Bowler Name" 
                  className="w-full bg-[var(--color-cricket-accent)]/10 border border-[var(--color-cricket-accent)]/30 rounded-xl px-3 py-2 text-[var(--color-cricket-accent)] font-bold text-sm focus:outline-none focus:border-[var(--color-cricket-accent)]"
                />
                <div className="text-[10px] text-[var(--color-cricket-accent)] ml-1 mt-1 font-semibold">
                  {bowler.overs} O - {bowler.runs} R - {bowler.wickets} W
                </div>
              </div>
            </div>
          </div>

          {/* Scoring Controls */}
          {(!isAllOut && !isOversDone && (match.currentInnings === 1 || runsNeeded > 0)) && (
            <>
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2, 3, 4, 6].map(run => (
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    key={run} 
                    className={`h-20 rounded-2xl text-3xl font-black transition-all ${
                      run === 4 || run === 6 
                      ? 'bg-gradient-to-br from-[var(--color-cricket-accent)] to-green-600 text-[var(--color-cricket-dark)] shadow-[0_0_20px_rgba(0,255,65,0.3)] border-none' 
                      : 'glass hover:bg-white/10 text-white'
                    }`}
                    onClick={() => recordBall(run, run >= 4 ? 'boundary' : 'normal')}
                  >
                    {run}
                  </motion.button>
                ))}
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white text-xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(239,68,68,0.3)] border-none flex justify-center items-center gap-2"
                  onClick={() => recordBall(0, 'wicket')}
                >
                  <AlertTriangle size={20} /> Wicket
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!lastBallId}
                  className={`h-16 rounded-2xl text-lg font-bold uppercase tracking-wider flex justify-center items-center gap-2 transition-all ${
                    lastBallId ? 'glass text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/10' : 'bg-white/5 text-gray-600 cursor-not-allowed'
                  }`}
                  onClick={handleUndo}
                >
                  <RotateCcw size={18} /> Undo
                </motion.button>
              </div>
              
              <div className="grid grid-cols-4 gap-3 mt-4">
                <button onClick={() => recordBall(0, 'wd')} className="h-14 rounded-xl glass hover:bg-white/5 text-orange-400 text-xs font-bold uppercase tracking-wider transition-colors">
                  Wide
                </button>
                <button onClick={() => recordBall(0, 'nb')} className="h-14 rounded-xl glass hover:bg-white/5 text-orange-400 text-xs font-bold uppercase tracking-wider transition-colors">
                  No Ball
                </button>
                <button onClick={() => recordBall(1, 'b')} className="h-14 rounded-xl glass hover:bg-white/5 text-gray-300 text-xs font-bold uppercase tracking-wider transition-colors">
                  Bye (1)
                </button>
                <button onClick={() => recordBall(1, 'lb')} className="h-14 rounded-xl glass hover:bg-white/5 text-gray-300 text-xs font-bold uppercase tracking-wider transition-colors">
                  L.Bye (1)
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </ProtectedRoute>
  );
}
