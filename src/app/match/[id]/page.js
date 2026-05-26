"use client";
import { useState, useEffect, use, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ArrowLeft, Trophy, Share2, Download } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { ref, onValue, get } from 'firebase/database';
import toast from 'react-hot-toast';
import { toPng } from 'html-to-image';

export default function MatchCenterPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const matchId = params.id;

  const [match, setMatch] = useState(null);
  const [teamA, setTeamA] = useState(null);
  const [teamB, setTeamB] = useState(null);
  const [balls, setBalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const prevBallsLength = useRef(0);
  const summaryRef = useRef(null);

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
          
          if (prevBallsLength.current > 0 && ballsArr.length > prevBallsLength.current) {
             const latestBall = ballsArr[0];
             if (latestBall.type === 'wicket') {
                toast.error('WICKET! ☝️', { duration: 5000 });
             } else if (latestBall.runs === 6) {
                toast.success('SIX! 🚀', { duration: 4000, style: { background: '#10b981', color: '#fff' } });
             } else if (latestBall.runs === 4) {
                toast.success('FOUR! ✨', { duration: 4000, style: { background: '#10b981', color: '#fff' } });
             }
          }
          prevBallsLength.current = ballsArr.length;
          setBalls(ballsArr);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [matchId, teamA, teamB]);

  if (loading || !match || !teamA || !teamB) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-emerald-500/25 border-t-emerald-600 rounded-full animate-spin"></div>
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

  const handleShare = async () => {
    if (!summaryRef.current) return;
    try {
      setIsSharing(true);
      toast.loading("Generating graphic...", { id: "share-toast" });
      
      const dataUrl = await toPng(summaryRef.current, { cacheBust: true, pixelRatio: 2 });
      
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `match-summary-${matchId}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
         toast.dismiss("share-toast");
         await navigator.share({
            title: `${teamA.shortName} vs ${teamB.shortName}`,
            text: `Check out the live scorecard for ${teamA.shortName} vs ${teamB.shortName}!`,
            files: [file],
         });
      } else {
         // Fallback to download
         const link = document.createElement('a');
         link.download = `match-summary-${matchId}.png`;
         link.href = dataUrl;
         link.click();
         toast.success("Image saved!", { id: "share-toast" });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate image.", { id: "share-toast" });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-8 max-w-3xl pb-20">
      <div className="flex justify-between items-center mb-6">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm transition-all p-1">
          <ArrowLeft size={16} /> Back to Matches
        </Link>
        <button 
          onClick={handleShare}
          disabled={isSharing}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50"
        >
          {isSharing ? <Activity size={16} className="animate-spin text-slate-500" /> : <Share2 size={16} />}
          Share Score
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {match.status === 'completed' && match.result && (
           <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200/50 rounded-2xl p-6 text-center shadow-sm shadow-emerald-50/50">
              <Trophy size={40} className="mx-auto text-emerald-600 mb-3" />
              <h2 className="text-3xl font-black text-slate-900 leading-tight">{getTeamName(match.result.winner)} Won!</h2>
              <p className="text-emerald-700 font-bold mt-1.5 uppercase tracking-widest text-xs">{match.result.margin}</p>
           </div>
        )}

        {/* Scorecard Header Wrapper for Capture */}
        <div ref={summaryRef} className="rounded-3xl bg-white border border-slate-200 shadow-md overflow-hidden">
          {/* Scorecard Header */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-emerald-500"></div>
          
          <div className="flex justify-between items-center mb-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-550 bg-slate-100/80 border border-slate-200/50 px-2.5 py-1 rounded-lg">Innings {match.currentInnings}</span>
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider flex items-center gap-1.5 uppercase border ${
              match.status === 'live' 
                ? 'bg-red-50 text-red-650 border-red-150 shadow-sm' 
                : 'bg-slate-100 text-slate-500 border-slate-200/50'
            }`}>
              {match.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>}
              {match.status}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
            <div>
              <h2 className="text-6xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">
                <span className="text-2xl text-emerald-700 block mb-2 font-black tracking-normal">{battingTeam}</span>
                <span>{runs}</span>
                <span className="text-4xl text-slate-400 font-extrabold">/{wickets}</span>
              </h2>
              <div className="flex flex-wrap gap-2.5 mt-4">
                 <div className="bg-slate-50 inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-slate-200/60">
                   <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Overs</span>
                   <span className="text-lg font-black text-slate-800 tabular-nums">{overs.toFixed(1)} <span className="text-xs text-slate-400 font-medium">({match.overs}.0)</span></span>
                 </div>
                 {extras && (
                    <div className="bg-slate-50 inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-slate-200/60">
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Extras</span>
                      <span className="text-xs font-bold text-slate-700">
                        {extras.wd + extras.nb + extras.b + extras.lb} 
                        <span className="text-[10px] text-slate-400 ml-1 font-semibold">(W {extras.wd}, N {extras.nb}, B {extras.b}, L {extras.lb})</span>
                      </span>
                    </div>
                 )}
              </div>
            </div>
            
            <div className="flex flex-col items-start sm:items-end w-full sm:w-auto">
              <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-1.5">Current Run Rate</p>
              <div className="bg-blue-50 border border-blue-200/60 px-5 py-2.5 rounded-2xl mb-1.5">
                <p className="text-3xl font-black text-blue-700 tabular-nums">{crr}</p>
              </div>
              {targetRuns && match.status !== 'completed' && (
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">REQ: <span className="text-slate-850">{(runsNeeded / (ballsRemaining / 6)).toFixed(2) || 0}</span></p>
              )}
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
             <div className="flex items-center gap-4">
                <span className="text-xl font-black text-slate-450">{bowlingTeam}</span>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">{match.currentInnings === 1 ? 'Yet to bat' : `Scored ${match.score.innings1.runs}/${match.score.innings1.wickets}`}</span>
             </div>
             
             {match.currentInnings === 2 && match.status !== 'completed' ? (
                <p className="text-sm text-emerald-700 font-bold">
                  Need {runsNeeded} runs from {ballsRemaining} balls
                </p>
             ) : (
                <p className="text-xs text-slate-450 font-bold uppercase tracking-wider text-[10px]">
                  Toss: {getTeamShort(match.toss?.wonBy)} elected to {match.toss?.decision}
                </p>
             )}
          </div>
          
          {/* Current Players Display */}
          {match.score[currInningsKey]?.currentPlayers && (
            <div className="mt-6 bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3">
               <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><span className="text-sm">🏏</span> Batsmen</span>
               </div>
               <div className="flex justify-between items-center">
                 <div className="text-slate-850 font-bold text-base flex items-center">
                   {match.score[currInningsKey].currentPlayers.striker?.name || 'Striker'} 
                   <span className="text-emerald-600 ml-1.5 text-sm font-black">*</span>
                 </div>
                 <div className="text-slate-500 font-bold text-sm tabular-nums">
                   <span className="text-slate-800 font-black">{match.score[currInningsKey].currentPlayers.striker?.runs || 0}</span> ({match.score[currInningsKey].currentPlayers.striker?.balls || 0})
                 </div>
               </div>
               <div className="flex justify-between items-center mt-1">
                 <div className="text-slate-500 font-medium text-sm">
                   {match.score[currInningsKey].currentPlayers.nonStriker?.name || 'Non-Striker'}
                 </div>
                 <div className="text-slate-400 font-bold text-sm tabular-nums">
                   <span className="text-slate-700 font-black">{match.score[currInningsKey].currentPlayers.nonStriker?.runs || 0}</span> ({match.score[currInningsKey].currentPlayers.nonStriker?.balls || 0})
                 </div>
               </div>
               
               <div className="mt-2 pt-3 border-t border-slate-100 flex justify-between items-center">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><span className="text-sm">🥎</span> Bowler</span>
                 <div className="text-right">
                    <span className="text-emerald-700 font-extrabold text-base block leading-tight mb-0.5">
                      {match.score[currInningsKey].currentPlayers.bowler?.name || 'TBD'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono tracking-wider block font-bold">
                      {match.score[currInningsKey].currentPlayers.bowler?.overs || 0} O - {match.score[currInningsKey].currentPlayers.bowler?.runs || 0} R - {match.score[currInningsKey].currentPlayers.bowler?.wickets || 0} W
                    </span>
                 </div>
               </div>
            </div>
          )}
          </div>
        </div>

        {/* Live Commentary Feed */}
        <div className="glass rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm mt-6 bg-white/90">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Activity className="text-emerald-600" /> Ball by Ball Commentary
          </h3>

          <div className="space-y-4">
            {balls.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-slate-400 font-semibold italic text-sm">No balls bowled yet. Waiting for scorer...</p>
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
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.5) }}
                    key={ball.id} 
                    className={`flex gap-4 p-4 rounded-2xl transition-all border ${
                      i === 0 
                        ? 'bg-slate-50/80 border-slate-200 shadow-sm' 
                        : 'border-transparent hover:border-slate-100 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="w-14 flex-shrink-0 text-center flex flex-col justify-center">
                      <span className="text-sm font-black text-slate-400">{ball.over.toFixed(1)}</span>
                      <span className="text-[9px] text-slate-350 font-black uppercase tracking-widest mt-0.5">Inn {ball.innings}</span>
                    </div>
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-base shadow-sm border ${
                        ball.type === 'wicket' ? 'bg-red-600 text-white border-red-500 shadow-red-100' : 
                        (ball.runs === 4 || ball.runs === 6) && !isExtra ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-100' :
                        isExtra ? 'bg-amber-500 text-white border-amber-450 shadow-amber-50' :
                        'bg-slate-100 text-slate-800 border-slate-200'
                      }`}>
                        {ballLabel}
                      </div>
                    </div>
                    <div className="flex flex-col justify-center flex-1">
                      <p className="text-slate-750 font-bold text-sm sm:text-base leading-snug">
                        {ball.commentary ? ball.commentary : (
                          ball.type === 'wicket' ? 'OUT! Massive breakthrough for the bowling team.' : 
                          ball.type === 'wd' ? `Wide ball down the leg side.` :
                          ball.type === 'nb' ? `No ball! Free hit coming up.` :
                          ball.type === 'b' ? `Byes! Keeper missed it completely.` :
                          ball.type === 'lb' ? `Leg byes! Deflected off the pads.` :
                          ball.runs === 6 ? 'SIX! Clean strike over the ropes!' : 
                          ball.runs === 4 ? 'FOUR! Pierces the gap perfectly.' : 
                          `${ball.runs} run${ball.runs !== 1 ? 's' : ''}. Good rotation of strike.`
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">{new Date(ball.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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
