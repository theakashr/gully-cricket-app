"use client";
import { useState, useEffect, use, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, AlertTriangle, PlayCircle, LogOut, ArrowRight, Settings2, Search, Zap, CheckCircle2, Plus, Users, Target } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { db } from '@/lib/firebase';
import { ref, onValue, push, set, update, get, remove } from 'firebase/database';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

// ════════════════════════════════════════════════════════════
// CORE LOGIC HELPERS
// ════════════════════════════════════════════════════════════

function oversToTotalBalls(overs, ballsPerOver) {
  const o = typeof overs === 'number' ? overs : parseFloat(overs || 0);
  const completedOvers = Math.floor(o);
  const partialBalls = Math.round((o - completedOvers) * 10);
  return (completedOvers * ballsPerOver) + partialBalls;
}

function totalBallsToOvers(totalBalls, ballsPerOver) {
  const completedOvers = Math.floor(totalBalls / ballsPerOver);
  const remainingBalls = totalBalls % ballsPerOver;
  return parseFloat(`${completedOvers}.${remainingBalls}`);
}

function getPartnership(ballsObj, currentInnings) {
  if (!ballsObj) return { runs: 0, balls: 0 };
  const inningsBalls = Object.values(ballsObj)
    .filter(b => b.innings === currentInnings)
    .sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  let pRuns = 0;
  let pBalls = 0;
  for (let i = inningsBalls.length - 1; i >= 0; i--) {
     const b = inningsBalls[i];
     if (b.type === 'wicket') break;
     
     let r = b.runs || 0;
     if (b.type === 'wd' || b.type === 'nb') r += 1;
     pRuns += r;
     
     if (b.isLegalBall || b.type === 'nb') pBalls += 1;
  }
  return { runs: pRuns, balls: pBalls };
}

// ════════════════════════════════════════════════════════════
// AUTO-SAVING SEARCHABLE PLAYER SELECT
// ════════════════════════════════════════════════════════════

function SearchablePlayerSelect({ label, value, onChange, options, onSave, placeholder, isBowler }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = (name) => {
    onChange(name);
    setIsOpen(false);
    setSearch('');
    onSave(name);
  };

  const handleCustomAdd = () => {
    if (!search.trim()) return;
    onChange(search.trim());
    setIsOpen(false);
    onSave(search.trim());
    setSearch('');
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <label className={`text-[10px] uppercase tracking-wider font-black ml-1 mb-1.5 block ${isBowler ? 'text-emerald-700' : 'text-slate-500'}`}>
        {label}
      </label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white border ${isBowler ? 'border-emerald-200 hover:border-emerald-300 shadow-emerald-50' : 'border-slate-200 hover:border-slate-300 shadow-sm'} rounded-xl px-3 py-2.5 text-slate-900 text-sm font-bold flex justify-between items-center cursor-pointer transition-colors`}
      >
        <span className={value ? 'text-slate-900 truncate' : 'text-slate-400 truncate font-medium'}>
          {value || placeholder}
        </span>
        <Search size={14} className={isBowler ? 'text-emerald-400' : 'text-slate-400'} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-slate-100 bg-slate-50">
              <input 
                type="text" 
                autoFocus
                placeholder="Search players..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="max-h-48 overflow-y-auto p-1 bg-white">
              {filtered.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => handleSelect(p.name)}
                  className="px-3 py-2.5 hover:bg-slate-50 rounded-lg cursor-pointer text-sm font-bold text-slate-700 transition-colors"
                >
                  {p.name}
                </div>
              ))}
              {search.trim() && filtered.length === 0 && (
                <div 
                  onClick={handleCustomAdd}
                  className="px-3 py-2.5 hover:bg-blue-50 rounded-lg cursor-pointer text-sm font-black text-blue-600 flex items-center gap-2"
                >
                  <Plus size={14} /> Add "{search}"
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN SCORER COMPONENT
// ════════════════════════════════════════════════════════════

export default function ScorerPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const matchId = params.id;
  const router = useRouter();

  const [match, setMatch] = useState(null);
  const [teamA, setTeamA] = useState(null);
  const [teamB, setTeamB] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  
  const [currentOver, setCurrentOver] = useState([]);
  const [lastBallId, setLastBallId] = useState(null);
  const [striker, setStriker] = useState({ name: '', runs: 0, balls: 0 });
  const [nonStriker, setNonStriker] = useState({ name: '', runs: 0, balls: 0 });
  const [bowler, setBowler] = useState({ name: '', overs: 0, runs: 0, wickets: 0 });
  
  const [loading, setLoading] = useState(true);
  const [showOversEditor, setShowOversEditor] = useState(false);
  const [editOvers, setEditOvers] = useState(20);
  const [editBallsPerOver, setEditBallsPerOver] = useState(6);
  
  const { role: userRole } = useAuth();

  // 1. Fetch Data
  useEffect(() => {
    if (!matchId) return;
    
    // Fetch Global Players once
    onValue(ref(db, 'players'), snap => {
       if (snap.exists()) {
          const arr = Object.entries(snap.val()).map(([id, v]) => ({ id, ...v }));
          setAllPlayers(arr);
       }
    });

    const matchRef = ref(db, `matches/${matchId}`);
    const unsubscribe = onValue(matchRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Ensure ballsPerOver defaults to 6 if not present
        if (!data.ballsPerOver) data.ballsPerOver = 6;
        
        setMatch(data);
        
        if (!teamA || !teamB) {
           try {
              if (data.teamA) {
                 const taSnap = await get(ref(db, `teams/${data.teamA}`));
                 setTeamA(taSnap.exists() ? { id: data.teamA, ...taSnap.val() } : { id: data.teamA, shortName: 'TBA', name: 'Unknown Team A' });
              }
              if (data.teamB) {
                 const tbSnap = await get(ref(db, `teams/${data.teamB}`));
                 setTeamB(tbSnap.exists() ? { id: data.teamB, ...tbSnap.val() } : { id: data.teamB, shortName: 'TBA', name: 'Unknown Team B' });
              }
           } catch (error) {
              console.error("Error fetching teams:", error);
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
           setLastBallId(ballsEntries.length > 0 ? ballsEntries[ballsEntries.length - 1][0] : null);

           // Filter to just the current over in the current innings
           const currInnBalls = ballsEntries.filter(b => b[1].innings === data.currentInnings);
           
           // Calculate exactly what balls belong to the current over visualization
           const currOversRaw = data.score[`innings${data.currentInnings}`].overs;
           const ballsThrownInOver = Math.round((currOversRaw % 1) * 10);
           
           // If ballsThrownInOver is 0 but we've bowled balls, it means an over JUST finished.
           // Show the full over momentarily, or clear it. Let's show the last N balls if ballsThrownInOver > 0.
           // Actually, simply take the last `ballsThrownInOver` legal balls, plus any extras that occurred in between.
           // A simpler robust method: get all balls since the last time `overs` was an integer.
           const recentOver = [];
           for (let i = currInnBalls.length - 1; i >= 0; i--) {
              const b = currInnBalls[i][1];
              recentOver.unshift(b);
              // Stop if this ball was a legal ball and made the over whole (e.g. 1.0, 2.0)
              // Wait, the over value *on the ball* is the over AFTER it was bowled.
              const bPart = Math.round((b.over % 1) * 10);
              if (bPart === 0 && b.isLegalBall) {
                 // If we are currently at an exact over (e.g. 2.0) we want to SHOW the completed over
                 // So if `currOversRaw` is exactly whole, we collect the last full over.
                 const isCurrentlyWhole = Math.round((currOversRaw % 1) * 10) === 0;
                 if (!isCurrentlyWhole && recentOver.length > 1) {
                    recentOver.shift(); // remove this ball as it belongs to previous over
                 }
                 break;
              }
           }

           const mappedRecent = recentOver.map(b => {
             if (b.type === 'wicket') return 'W';
             if (b.type === 'wd') return b.runs > 1 ? `${b.runs}wd` : 'wd';
             if (b.type === 'nb') return b.runs > 1 ? `${b.runs}nb` : 'nb';
             if (b.type === 'b' || b.type === 'lb') return `${b.runs}${b.type}`;
             if (b.type === 'boundary') return b.runs.toString();
             return b.runs.toString();
           });
           setCurrentOver(mappedRecent);
        } else {
           setCurrentOver([]);
           setLastBallId(null);
        }
      } else {
        router.push('/dashboard');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [matchId, router, teamA, teamB]);

  // 2. Auto-Save Players Logic
  const handleSavePlayer = async (roleType, newName) => {
    if (!match) return;
    const currInningsKey = match.currentInnings === 1 ? 'innings1' : 'innings2';
    
    const newStriker = roleType === 'striker' ? { ...striker, name: newName } : striker;
    const newNonStriker = roleType === 'nonStriker' ? { ...nonStriker, name: newName } : nonStriker;
    const newBowler = roleType === 'bowler' ? { ...bowler, name: newName } : bowler;

    try {
      await update(ref(db, `matches/${matchId}/score/${currInningsKey}/currentPlayers`), {
        striker: newStriker,
        nonStriker: newNonStriker,
        bowler: newBowler
      });
      toast.success("Player updated", { id: 'save-player' });
    } catch (error) {
      console.error("Error saving player:", error);
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

  // 3. Core Record Ball
  const recordBall = async (runs, type) => {
    if (!match) return;
    const bpo = match.ballsPerOver || 6;
    const currInningsKey = match.currentInnings === 1 ? 'innings1' : 'innings2';
    const currentScore = match.score[currInningsKey];
    
    let newRuns = currentScore.runs + runs;
    let newWickets = currentScore.wickets + (type === 'wicket' ? 1 : 0);
    
    const extras = { ...currentScore.extras };
    let isLegalBall = true;

    if (type === 'wd') {
      newRuns += 1;
      extras.wd += (1 + runs);
      isLegalBall = false;
    } else if (type === 'nb') {
      newRuns += 1;
      extras.nb += (1 + runs);
      isLegalBall = false;
    } else if (type === 'b') {
      extras.b += runs;
    } else if (type === 'lb') {
      extras.lb += runs;
    }

    let newOvers = currentScore.overs;
    if (isLegalBall) {
      const currentTotalBalls = oversToTotalBalls(currentScore.overs, bpo);
      newOvers = totalBallsToOvers(currentTotalBalls + 1, bpo);
    }

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
       if (type === 'nb') newStriker.balls += 1;
    } else if (type === 'b' || type === 'lb') {
       newStriker.balls += 1;
    }

    if (isLegalBall) {
       const bowlerTotalBalls = oversToTotalBalls(newBowler.overs, bpo);
       newBowler.overs = totalBallsToOvers(bowlerTotalBalls + 1, bpo);
    }

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

    let shouldSwap = false;
    if (type === 'normal' || type === 'boundary' || type === 'b' || type === 'lb') {
       if (runs % 2 !== 0) shouldSwap = !shouldSwap;
     }
    
    if (isLegalBall) {
       const ballsPart = Math.round((newOvers - Math.floor(newOvers)) * 10);
       if (ballsPart === 0 && newOvers > 0) {
         shouldSwap = !shouldSwap;
       }
    }

    if (shouldSwap) {
       const temp = newStriker;
       newStriker = newNonStriker;
       newNonStriker = temp;
    }

    if (type === 'wicket') {
       newStriker = { name: '', runs: 0, balls: 0 };
    }

    setStriker(newStriker);
    setNonStriker(newNonStriker);
    setBowler(newBowler);

    try {
      const ballsRef = ref(db, `matches/${matchId}/balls`);
      const newBallRef = push(ballsRef);
      await set(newBallRef, {
        runs, type, isLegalBall, over: newOvers, innings: match.currentInnings, commentary,
        timestamp: new Date().toISOString(),
        previousPlayers: match.score[currInningsKey].currentPlayers || { striker, nonStriker, bowler }
      });

      const updates = {
        status: 'live',
        [`score/${currInningsKey}/runs`]: newRuns,
        [`score/${currInningsKey}/wickets`]: newWickets,
        [`score/${currInningsKey}/overs`]: newOvers,
        [`score/${currInningsKey}/extras`]: extras,
        [`score/${currInningsKey}/currentPlayers`]: { striker: newStriker, nonStriker: newNonStriker, bowler: newBowler }
      };

      await update(ref(db, `matches/${matchId}`), updates);
    } catch (error) {
      console.error("Error updating score:", error);
    }
  };

  const handleUndo = async () => {
    if (!lastBallId || !match) return;
    const bpo = match.ballsPerOver || 6;
    
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

    if (lastBall.type === 'wd') { revertRuns += 1; extras.wd -= (1 + lastBall.runs); } 
    else if (lastBall.type === 'nb') { revertRuns += 1; extras.nb -= (1 + lastBall.runs); } 
    else if (lastBall.type === 'b') { extras.b -= lastBall.runs; } 
    else if (lastBall.type === 'lb') { extras.lb -= lastBall.runs; }

    let revertedOvers = currentScore.overs;
    if (lastBall.isLegalBall) {
      const currentTotalBalls = oversToTotalBalls(currentScore.overs, bpo);
      revertedOvers = totalBallsToOvers(Math.max(0, currentTotalBalls - 1), bpo);
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
         <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const getTeamName = (id) => {
    if (id === teamA?.id) return teamA?.shortName;
    if (id === teamB?.id) return teamB?.shortName;
    return 'Unknown';
  };

  // 4. Derived Stats
  const bpo = match.ballsPerOver || 6;
  const currInningsKey = match.currentInnings === 1 ? 'innings1' : 'innings2';
  const { runs, wickets, overs } = match.score[currInningsKey];
  const battingTeam = getTeamName(match.score[currInningsKey].team);
  
  const currentTotalBalls = oversToTotalBalls(overs, bpo);
  const crr = runs > 0 && currentTotalBalls > 0 ? (runs / (currentTotalBalls / bpo)).toFixed(2) : '0.00';
  const proj = match.currentInnings === 1 ? Math.round((runs / (currentTotalBalls > 0 ? currentTotalBalls : 1)) * (match.overs * bpo)) : null;

  const isAllOut = wickets === 10;
  const isOversDone = overs >= match.overs;
  
  let targetRuns = null, runsNeeded = null, ballsRemaining = null;
  if (match.currentInnings === 2) {
    targetRuns = match.score.innings1.runs + 1;
    runsNeeded = targetRuns - runs;
    const maxBalls = match.overs * bpo;
    ballsRemaining = maxBalls - currentTotalBalls;
  }

  const bOversNum = typeof bowler.overs === 'number' ? bowler.overs : parseFloat(bowler.overs || 0);
  const bComplete = Math.floor(bOversNum);
  const bBalls = Math.round((bOversNum - bComplete) * 10);
  const totalBowlerBalls = (bComplete * bpo) + bBalls;
  const econ = totalBowlerBalls > 0 ? ((bowler.runs || 0) / (totalBowlerBalls / bpo)).toFixed(2) : '0.00';

  const partnership = getPartnership(match.balls, match.currentInnings);

  // Timeline slots
  const ballsInCurrentOver = Math.round((overs % 1) * 10);
  const timelineSlots = Array.from({ length: bpo }).map((_, i) => currentOver[i] || null);
  // Note: if extra balls are bowled (wides/noballs), timeline might exceed bpo. We just render them.
  const actualTimeline = currentOver.length > bpo ? currentOver : timelineSlots;

  return (
    <ProtectedRoute allowedRoles={['admin', 'scorer', 'manager']}>
      <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 font-sans">
        
        {/* STICKY HEADER */}
        <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm px-4 py-3 flex justify-between items-center">
           <div className="flex items-center gap-3">
             <button onClick={() => router.push('/dashboard/matches')} className="text-slate-400 hover:text-slate-900 transition-colors p-1 bg-slate-50 hover:bg-slate-100 rounded-lg">
                <LogOut size={18} />
             </button>
             <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Live Scoring</p>
               <h1 className="text-sm font-black text-slate-900">{teamA.shortName} vs {teamB.shortName}</h1>
             </div>
           </div>
           <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Innings {match.currentInnings}</p>
              {match.currentInnings === 1 ? (
                <p className="text-xs font-black text-slate-800">Proj: {proj}</p>
              ) : (
                <p className="text-xs font-black text-slate-800">Req: {(runsNeeded / (ballsRemaining / bpo)).toFixed(2)}</p>
              )}
           </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
          
          {/* ADMIN OVERS CONFIG */}
          {(userRole === 'admin' || userRole === 'manager') && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <button
                onClick={() => { setShowOversEditor(!showOversEditor); setEditOvers(match.overs); setEditBallsPerOver(match.ballsPerOver || 6); }}
                className="w-full flex items-center justify-between px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <span className="flex items-center gap-2"><Settings2 size={14} /> Format Config</span>
                <span className="text-emerald-600">{match.overs} OVERS • {match.ballsPerOver || 6} BPO</span>
              </button>
              <AnimatePresence>
                {showOversEditor && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-5 pb-4 pt-2 border-t border-slate-100 bg-slate-50 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5">Total Overs</label>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setEditOvers(Math.max(1, editOvers - 1))} className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-lg font-black text-slate-700 transition-colors active:bg-slate-300">-</button>
                            <input type="number" min="1" max="50" value={editOvers} onChange={(e) => setEditOvers(parseInt(e.target.value) || 1)} className="w-full min-w-0 bg-white border border-slate-200 rounded-lg px-2 py-2 text-center text-sm font-bold focus:border-blue-500 outline-none appearance-none m-0" style={{MozAppearance: 'textfield'}} />
                            <button onClick={() => setEditOvers(Math.min(50, editOvers + 1))} className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-lg font-black text-slate-700 transition-colors active:bg-slate-300">+</button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5">Balls/Over</label>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setEditBallsPerOver(Math.max(1, editBallsPerOver - 1))} className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-lg font-black text-slate-700 transition-colors active:bg-slate-300">-</button>
                            <input type="number" min="1" max="10" value={editBallsPerOver} onChange={(e) => setEditBallsPerOver(parseInt(e.target.value) || 1)} className="w-full min-w-0 bg-white border border-slate-200 rounded-lg px-2 py-2 text-center text-sm font-bold focus:border-blue-500 outline-none appearance-none m-0" style={{MozAppearance: 'textfield'}} />
                            <button onClick={() => setEditBallsPerOver(Math.min(10, editBallsPerOver + 1))} className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-lg font-black text-slate-700 transition-colors active:bg-slate-300">+</button>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            await update(ref(db, `matches/${matchId}`), { overs: editOvers, ballsPerOver: editBallsPerOver });
                            toast.success("Format updated");
                            setShowOversEditor(false);
                          } catch (err) { toast.error("Failed to update format"); }
                        }}
                        className="w-full bg-slate-900 text-white text-xs font-bold uppercase py-3 rounded-lg shadow-sm"
                      >
                        Save Configuration
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* MASTER SCOREBOARD */}
          <div className="bg-white rounded-3xl p-6 relative overflow-hidden shadow-sm border border-slate-200">
            <div className="flex justify-between items-end gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-lg font-black text-slate-400 mb-1 leading-none truncate">{battingTeam}</p>
                <h2 className="text-5xl sm:text-7xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">
                  {runs}<span className="text-3xl sm:text-4xl text-slate-300">/{wickets}</span>
                </h2>
              </div>
              <div className="text-right flex flex-col items-end flex-shrink-0">
                <div className="bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl mb-3">
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider block mb-0.5 text-left">Overs</span>
                  <span className="text-lg sm:text-xl font-black text-slate-900 tabular-nums">{overs.toFixed(1)} <span className="text-xs text-slate-400">/ {match.overs}.0</span></span>
                </div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">CRR: <span className="text-blue-600 text-sm">{crr}</span></p>
              </div>
            </div>
            
            {targetRuns && (
               <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Target: <span className="text-slate-900">{targetRuns}</span></p>
                  <p className="text-sm font-black text-emerald-600">Need {runsNeeded} from {ballsRemaining}</p>
               </div>
            )}
          </div>

          {/* LIVE CONTEXT CARDS */}
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Users size={12}/> Partnership</p>
                <p className="text-lg sm:text-xl font-black text-slate-800">{partnership.runs} <span className="text-xs text-slate-400 font-bold">({partnership.balls})</span></p>
             </div>
             <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Target size={12}/> Last Wicket</p>
                <p className="text-xs sm:text-sm font-bold text-slate-700 mt-1 truncate">
                   {match.balls && Object.values(match.balls).filter(b => b.innings === match.currentInnings && b.type === 'wicket').pop()?.commentary.split(',')[0] || 'None yet'}
                </p>
             </div>
          </div>

          {/* OVER TIMELINE */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                <PlayCircle size={14} className="text-emerald-500" /> Current Over
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {actualTimeline.map((ball, i) => (
                <div 
                  key={i} 
                  className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full text-sm font-black transition-all ${
                    ball === null ? 'bg-slate-50 border-2 border-dashed border-slate-200 text-transparent' :
                    ball === 'W' ? 'bg-red-500 text-white shadow-sm' : 
                    (ball === '6' || ball === '4') ? 'bg-emerald-500 text-white shadow-sm' : 
                    ball?.includes('wd') || ball?.includes('nb') ? 'bg-amber-400 text-white text-xs shadow-sm' :
                    'bg-slate-100 text-slate-700 border border-slate-200 shadow-sm'
                  }`}
                >
                  {ball || '-'}
                </div>
              ))}
            </div>
          </div>

          {/* END INNINGS TRIGGERS */}
          {(isAllOut || isOversDone) && match.currentInnings === 1 && (
            <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-center shadow-sm">
               <h3 className="text-amber-700 font-black text-lg mb-3">Innings Complete</h3>
               <button onClick={startNextInnings} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-sm py-4 rounded-xl transition-all shadow-sm">
                 Start 2nd Innings
               </button>
            </div>
          )}
          
          {(match.currentInnings === 2 && (isAllOut || isOversDone || runsNeeded <= 0)) && (
            <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl text-center shadow-sm">
               <h3 className="text-emerald-700 font-black text-lg mb-3">Match Complete</h3>
               <button onClick={() => {
                 if (runsNeeded <= 0) endMatch(match.score.innings2.team, `${getTeamName(match.score.innings2.team)} chased the target`);
                 else if (runsNeeded > 0) endMatch(match.score.innings1.team, `${getTeamName(match.score.innings1.team)} defended the target`);
                 else endMatch('Draw', 'Match Tied');
               }} className="w-full bg-emerald-600 text-white font-black uppercase tracking-widest text-sm py-4 rounded-xl transition-all shadow-sm">
                 Declare Result
               </button>
            </div>
          )}

          {/* PLAYER MANAGEMENT */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm relative">
            <div className="absolute right-4 top-4">
               <button onClick={manualSwapStrike} className="flex items-center gap-1.5 text-[9px] uppercase font-black tracking-widest text-slate-500 hover:text-slate-900 bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors">
                  <RotateCcw size={12} /> Swap
               </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <SearchablePlayerSelect 
                    label="Striker" 
                    placeholder="Search Striker"
                    value={striker.name} 
                    onChange={(val) => setStriker({...striker, name: val})}
                    options={allPlayers}
                    onSave={(val) => handleSavePlayer('striker', val)}
                  />
                  <div className="text-[10px] text-slate-400 font-black ml-1 mt-1.5">
                    <span className="text-slate-800">{striker.runs}</span> R <span className="text-slate-800">{striker.balls}</span> B
                  </div>
                </div>
                <div>
                  <SearchablePlayerSelect 
                    label="Non-Striker" 
                    placeholder="Search Non-Striker"
                    value={nonStriker.name} 
                    onChange={(val) => setNonStriker({...nonStriker, name: val})}
                    options={allPlayers}
                    onSave={(val) => handleSavePlayer('nonStriker', val)}
                  />
                  <div className="text-[10px] text-slate-400 font-black ml-1 mt-1.5">
                    <span className="text-slate-800">{nonStriker.runs}</span> R <span className="text-slate-800">{nonStriker.balls}</span> B
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <SearchablePlayerSelect 
                  label="Bowler" 
                  placeholder="Search Bowler"
                  isBowler={true}
                  value={bowler.name} 
                  onChange={(val) => setBowler({...bowler, name: val})}
                  options={allPlayers}
                  onSave={(val) => handleSavePlayer('bowler', val)}
                />
                <div className="text-[10px] text-emerald-600 font-black ml-1 mt-1.5 flex gap-3">
                  <span><span className="text-emerald-800">{bowler.overs}</span> O</span>
                  <span><span className="text-emerald-800">{bowler.runs}</span> R</span>
                  <span><span className="text-emerald-800">{bowler.wickets}</span> W</span>
                  <span className="text-emerald-400 ml-auto">ECON: {econ}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ADVANCED SCORING PAD */}
          {(!isAllOut && !isOversDone && (match.currentInnings === 1 || runsNeeded > 0)) && (
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
              
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                <button onClick={() => recordBall(0, 'wd')} className="h-10 sm:h-12 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-colors">Wide</button>
                <button onClick={() => recordBall(0, 'nb')} className="h-10 sm:h-12 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-colors">No Ball</button>
                <button onClick={() => recordBall(1, 'b')} className="h-10 sm:h-12 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-600 text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-colors">Bye 1</button>
                <button onClick={() => recordBall(1, 'lb')} className="h-10 sm:h-12 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-600 text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-colors">LB 1</button>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[0, 1, 2, 3, 4, 6].map(run => (
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    key={run} 
                    className={`h-[60px] sm:h-[72px] rounded-2xl text-2xl font-black transition-all ${
                      run === 4 || run === 6 
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' 
                      : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 shadow-sm'
                    }`}
                    onClick={() => recordBall(run, run >= 4 ? 'boundary' : 'normal')}
                  >
                    {run}
                  </motion.button>
                ))}
              </div>
              
              <div className="grid grid-cols-12 gap-2 sm:gap-3 pt-2">
                <motion.button 
                  whileTap={{ scale: 0.98 }}
                  disabled={!lastBallId}
                  className={`col-span-4 h-14 sm:h-16 rounded-2xl text-xs font-black uppercase tracking-widest flex flex-col justify-center items-center gap-1 transition-all ${
                    lastBallId 
                      ? 'bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200' 
                      : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
                  }`}
                  onClick={handleUndo}
                >
                  <RotateCcw size={16} /> Undo
                </motion.button>
                
                <motion.button 
                  whileTap={{ scale: 0.98 }}
                  className="col-span-8 h-14 sm:h-16 rounded-2xl bg-red-600 text-white text-lg sm:text-xl font-black uppercase tracking-widest shadow-md shadow-red-200 border-none flex justify-center items-center gap-2"
                  onClick={() => recordBall(0, 'wicket')}
                >
                  <AlertTriangle size={20} /> Wicket
                </motion.button>
              </div>
            </div>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}
