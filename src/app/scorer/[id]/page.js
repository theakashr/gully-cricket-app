"use client";
import { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, AlertTriangle, PlayCircle, LogOut, ArrowRight } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { db } from '@/lib/firebase';
import { ref, onValue, push, set, update, get, remove } from 'firebase/database';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

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
      toast.success("Players saved successfully", { id: 'save-players' });
    } catch (error) {
      console.error("Error updating players:", error);
      toast.error("Failed to save players");
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
        timestamp: new Date().toISOString(),
        previousPlayers: match.score[currInningsKey].currentPlayers || { striker, nonStriker, bowler }
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
      
      if (lastBall.previousPlayers) {
        updates[`score/${currInningsKey}/currentPlayers`] = lastBall.previousPlayers;
        setStriker(lastBall.previousPlayers.striker || { name: '', runs: 0, balls: 0 });
        setNonStriker(lastBall.previousPlayers.nonStriker || { name: '', runs: 0, balls: 0 });
        setBowler(lastBall.previousPlayers.bowler || { name: '', overs: 0, runs: 0, wickets: 0 });
      }

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
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

  const bOversNum = typeof bowler.overs === 'number' ? bowler.overs : parseFloat(bowler.overs || 0);
  const bComplete = Math.floor(bOversNum);
  const bBalls = Math.round((bOversNum - bComplete) * 10);
  const totalBowlerBalls = (bComplete * 6) + bBalls;
  const econ = totalBowlerBalls > 0 ? ((bowler.runs || 0) / (totalBowlerBalls / 6)).toFixed(2) : '0.00';

  return (
    <ProtectedRoute allowedRoles={['admin', 'scorer', 'manager']}>
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <div className="flex justify-between items-center mb-6">
           <button onClick={() => router.push('/dashboard/matches')} className="text-slate-500 hover:text-slate-900 flex items-center gap-2 text-sm font-bold transition-all p-1">
              <LogOut size={16} /> Exit Panel
           </button>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 pb-20"
        >
          {/* Main Score Board */}
          <div className="glass-card rounded-3xl p-6 relative overflow-hidden border border-white shadow-sm">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500"></div>
            
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200/50">{match.matchName || match.stage || 'Match'} • Innings {match.currentInnings}</span>
              <span className="bg-red-50 text-red-650 border border-red-100 px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> {match.status === 'live' ? 'SCORING LIVE' : 'MATCH READY'}
              </span>
            </div>

            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-6xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">
                  <span className="text-2xl text-emerald-700 block mb-2 font-black tracking-normal">{battingTeam}</span>
                  <span>{runs}</span>
                  <span className="text-4xl text-slate-450 font-extrabold">/{wickets}</span>
                </h2>
                <div className="mt-4 bg-slate-50 border border-slate-150 inline-flex items-center gap-3 px-3.5 py-1.5 rounded-xl">
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">OVERS</span>
                  <span className="text-lg font-black text-slate-800 tabular-nums">{overs.toFixed(1)} <span className="text-xs text-slate-400 font-medium">({match.overs}.0)</span></span>
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-1">CRR</p>
                <div className="bg-blue-50 border border-blue-200/60 px-4 py-1.5 rounded-xl mb-2">
                  <p className="text-2xl font-black text-blue-700 tabular-nums">{crr}</p>
                </div>
                {targetRuns && (
                  <div className="text-right">
                     <p className="text-[10px] font-bold text-slate-455 uppercase tracking-widest">REQ: <span className="text-slate-700">{(runsNeeded / (ballsRemaining / 6)).toFixed(2) || 0}</span></p>
                  </div>
                )}
              </div>
            </div>
            
            {targetRuns && (
               <div className="mt-4 pt-4 border-t border-slate-150 text-center">
                  <p className="text-sm font-bold text-emerald-750">
                    Need {runsNeeded} runs from {ballsRemaining} balls
                  </p>
               </div>
            )}
          </div>
          
          {/* Current Over Timeline */}
          <div className="glass rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                <PlayCircle size={14} className="text-emerald-600" /> Recent Balls
              </span>
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              <AnimatePresence>
                {currentOver.length === 0 && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-slate-400 text-sm font-medium italic">
                    Waiting for first ball...
                  </motion.span>
                )}
                {currentOver.map((ball, i) => (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    key={i} 
                    className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full text-lg font-black shadow-sm border ${
                      ball === 'W' ? 'bg-red-600 text-white border-red-500 shadow-red-100' : 
                      (ball === '6' || ball === '4') ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-100' : 
                      ball.includes('wd') || ball.includes('nb') ? 'bg-amber-500 text-white border-amber-400 text-sm shadow-amber-50' :
                      'bg-slate-100 text-slate-800 border-slate-200'
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
            <div className="bg-amber-50 border border-amber-250 p-4 rounded-2xl text-center shadow-sm">
               <h3 className="text-amber-700 font-black text-xl mb-2">Innings Complete!</h3>
               <button onClick={startNextInnings} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-all shadow-sm shadow-amber-100">
                 Start 2nd Innings <ArrowRight size={18} />
               </button>
            </div>
          )}
          
          {(match.currentInnings === 2 && (isAllOut || isOversDone || runsNeeded <= 0)) && (
            <div className="bg-emerald-50 border border-emerald-250 p-4 rounded-2xl text-center shadow-sm">
               <h3 className="text-emerald-700 font-black text-xl mb-2">Match Complete!</h3>
               <button onClick={() => {
                 if (runsNeeded <= 0) endMatch(match.score.innings2.team, `${getTeamName(match.score.innings2.team)} chased the target`);
                 else if (runsNeeded > 0) endMatch(match.score.innings1.team, `${getTeamName(match.score.innings1.team)} defended the target`);
                 else endMatch('Draw', 'Match Tied');
               }} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-sm shadow-emerald-100">
                 Declare Result & End Match
               </button>
            </div>
          )}

          {/* Current Players Inputs */}
          <div className="glass rounded-2xl p-5 mb-4 border border-slate-200 shadow-sm relative">
            <div className="flex justify-between items-center mb-3">
               <h3 className="text-slate-500 font-bold text-xs uppercase tracking-widest">Current Players</h3>
               <button onClick={manualSwapStrike} className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-emerald-750 hover:text-emerald-800 transition-colors bg-emerald-100/80 px-2 py-1 rounded-lg">
                  <RotateCcw size={12} /> Swap Strike
               </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-black ml-1">Striker</label>
                  <input 
                    type="text" 
                    value={striker.name} 
                    onChange={(e) => setStriker({...striker, name: e.target.value})}
                    placeholder="Striker Name" 
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  />
                  <div className="text-[10px] text-slate-550 font-bold ml-1 mt-1">
                    {striker.runs} R ({striker.balls} B)
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-black ml-1">Non-Striker</label>
                  <input 
                    type="text" 
                    value={nonStriker.name} 
                    onChange={(e) => setNonStriker({...nonStriker, name: e.target.value})}
                    placeholder="Non-Striker Name" 
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  />
                  <div className="text-[10px] text-slate-550 font-bold ml-1 mt-1">
                    {nonStriker.runs} R ({nonStriker.balls} B)
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-emerald-700 uppercase tracking-wider font-black ml-1">Bowler</label>
                <input 
                  type="text" 
                  value={bowler.name} 
                  onChange={(e) => setBowler({...bowler, name: e.target.value})}
                  placeholder="Bowler Name" 
                  className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-emerald-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                <div className="text-[10px] text-emerald-700 ml-1 mt-1 font-bold flex justify-between">
                  <span>{bowler.overs} O - {bowler.runs} R - {bowler.wickets} W</span>
                  <span className="opacity-80">ECON: {econ}</span>
                </div>
              </div>
              <button 
                onClick={updatePlayers} 
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-widest py-3 rounded-xl transition-all border border-slate-200 shadow-sm"
              >
                Save Player Names
              </button>
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
                    className={`h-20 rounded-2xl text-3xl font-black transition-all shadow-sm ${
                      run === 4 || run === 6 
                      ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-emerald-100 border-none' 
                      : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-800'
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
                  className="h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white text-xl font-black uppercase tracking-widest shadow-sm shadow-red-100 border-none flex justify-center items-center gap-2"
                  onClick={() => recordBall(0, 'wicket')}
                >
                  <AlertTriangle size={20} /> Wicket
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!lastBallId}
                  className={`h-16 rounded-2xl text-lg font-bold uppercase tracking-wider flex justify-center items-center gap-2 transition-all shadow-sm ${
                    lastBallId 
                      ? 'bg-white hover:bg-amber-50 text-amber-600 border border-slate-200 hover:border-amber-200' 
                      : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
                  }`}
                  onClick={handleUndo}
                >
                  <RotateCcw size={18} /> Undo
                </motion.button>
              </div>
              
              <div className="grid grid-cols-4 gap-3 mt-4">
                <button onClick={() => recordBall(0, 'wd')} className="h-14 rounded-xl bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-250 text-amber-600 text-xs font-bold uppercase tracking-wider transition-all shadow-sm">
                  Wide
                </button>
                <button onClick={() => recordBall(0, 'nb')} className="h-14 rounded-xl bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-250 text-amber-600 text-xs font-bold uppercase tracking-wider transition-all shadow-sm">
                  No Ball
                </button>
                <button onClick={() => recordBall(1, 'b')} className="h-14 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 text-xs font-bold uppercase tracking-wider transition-all shadow-sm">
                  Bye (1)
                </button>
                <button onClick={() => recordBall(1, 'lb')} className="h-14 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 text-xs font-bold uppercase tracking-wider transition-all shadow-sm">
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
