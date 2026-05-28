"use client";
import { useState, useEffect, use, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ArrowLeft, Trophy, Share2, MessageCircle, Send } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { ref, onValue, get, push, serverTimestamp } from 'firebase/database';
import toast from 'react-hot-toast';
import { toPng } from 'html-to-image';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';

export default function MatchCenterPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const matchId = params.id;

  const [match, setMatch] = useState(null);
  const [teamA, setTeamA] = useState(null);
  const [teamB, setTeamB] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [balls, setBalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [activeTab, setActiveTab] = useState('Live'); // 'Live', 'Scorecard', 'Graphs', 'Commentary', 'Discussions'
  const [scorecardInnings, setScorecardInnings] = useState(1);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [guestName, setGuestName] = useState('');
  const chatEndRef = useRef(null);
  
  const prevBallsLength = useRef(0);
  const summaryRef = useRef(null);

  useEffect(() => {
    // Generate random guest name
    const adjectives = ['Smashing', 'Quick', 'Spinning', 'Bouncing', 'Flying', 'Sweeping', 'Fierce'];
    const nouns = ['Batsman', 'Bowler', 'Fielder', 'Spinner', 'Pacer', 'Keeper', 'Umpire'];
    const randName = `${adjectives[Math.floor(Math.random()*adjectives.length)]}${nouns[Math.floor(Math.random()*nouns.length)]}_${Math.floor(Math.random()*1000)}`;
    setGuestName(randName);
  }, []);

  useEffect(() => {
    if (!matchId) return;
    
    let isMounted = true;

    const fetchMatch = async () => {
      try {
        const res = await fetch(`/api/match/${matchId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;
        
        setMatch(data.match);
        setTeamA(data.teamA);
        setTeamB(data.teamB);
        setTournament(data.tournament);
        
        setScorecardInnings(prev => {
           if (data.match?.currentInnings && prev === 1 && !match) {
              return data.match.currentInnings;
           }
           return prev;
        });

        if (data.match?.balls) {
          const ballsArr = Object.entries(data.match.balls)
            .map(([id, val]) => ({ id, ...val }))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          
          if (prevBallsLength.current > 0 && ballsArr.length > prevBallsLength.current) {
             const latestBall = ballsArr[0];
             if (latestBall.type === 'wicket') toast.error('WICKET! ☝️', { duration: 5000 });
             else if (latestBall.runs === 6) toast.success('SIX! 🚀', { duration: 4000, style: { background: '#10b981', color: '#fff' } });
             else if (latestBall.runs === 4) toast.success('FOUR! ✨', { duration: 4000, style: { background: '#10b981', color: '#fff' } });
          }
          prevBallsLength.current = ballsArr.length;
          setBalls(ballsArr);
        }

        if (data.match?.chat) {
          const msgs = Object.entries(data.match.chat).map(([id, val]) => ({ id, ...val })).sort((a,b) => a.timestamp - b.timestamp);
          setChatMessages(msgs);
          
          if (msgs.length > chatMessages.length) {
             setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    fetchMatch();
    const interval = setInterval(fetchMatch, 2000);
    
    return () => {
       isMounted = false;
       clearInterval(interval);
    };
  }, [matchId]);

  // Dynamic Scorecard Engine
  const scorecardData = useMemo(() => {
    if (!match || balls.length === 0) return { batters: [], bowlers: [], fow: [], partnerships: [], extras: { wd: 0, nb: 0, b: 0, lb: 0, total: 0 } };
    
    // Sort oldest first for calculation
    const inningsBalls = balls.filter(b => b.innings === scorecardInnings).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const battersMap = {};
    const bowlersMap = {};
    const fow = [];
    const partnerships = [];
    let currentScore = 0;
    
    let currentPartnershipRuns = 0;
    let currentPartnershipBalls = 0;
    let currentPartnershipBatters = {};

    inningsBalls.forEach(ball => {
      const striker = ball.previousPlayers?.striker?.name || 'Unknown';
      const nonStriker = ball.previousPlayers?.nonStriker?.name || 'Unknown';
      const bowler = ball.previousPlayers?.bowler?.name || 'Unknown';
      
      if (!battersMap[striker]) battersMap[striker] = { name: striker, runs: 0, balls: 0, fours: 0, sixes: 0, status: 'Batting' };
      if (!battersMap[nonStriker]) battersMap[nonStriker] = { name: nonStriker, runs: 0, balls: 0, fours: 0, sixes: 0, status: 'Batting' };
      if (!bowlersMap[bowler]) bowlersMap[bowler] = { name: bowler, balls: 0, runs: 0, wickets: 0, maidens: 0 };
      
      currentPartnershipBatters[striker] = (currentPartnershipBatters[striker] || 0);
      currentPartnershipBatters[nonStriker] = (currentPartnershipBatters[nonStriker] || 0);

      if (ball.type === 'normal' || ball.type === 'boundary') {
        battersMap[striker].runs += ball.runs;
        battersMap[striker].balls += 1;
        if (ball.runs === 4) battersMap[striker].fours += 1;
        if (ball.runs === 6) battersMap[striker].sixes += 1;
        
        bowlersMap[bowler].runs += ball.runs;
        bowlersMap[bowler].balls += 1;
        
        currentScore += ball.runs;
        currentPartnershipRuns += ball.runs;
        currentPartnershipBatters[striker] += ball.runs;
        currentPartnershipBalls += 1;
      } else if (ball.type === 'wd') {
        bowlersMap[bowler].runs += (ball.runs + 1);
        currentScore += (ball.runs + 1);
        currentPartnershipRuns += (ball.runs + 1);
      } else if (ball.type === 'nb') {
        battersMap[striker].balls += 1;
        bowlersMap[bowler].runs += (ball.runs + 1);
        currentScore += (ball.runs + 1);
        currentPartnershipRuns += (ball.runs + 1);
        battersMap[striker].runs += ball.runs;
        currentPartnershipBatters[striker] += ball.runs;
        if (ball.runs === 4) battersMap[striker].fours += 1;
        if (ball.runs === 6) battersMap[striker].sixes += 1;
        currentPartnershipBalls += 1;
      } else if (ball.type === 'b' || ball.type === 'lb') {
        battersMap[striker].balls += 1;
        bowlersMap[bowler].balls += 1;
        currentScore += ball.runs;
        currentPartnershipRuns += ball.runs;
        currentPartnershipBalls += 1;
      } else if (ball.type === 'wicket') {
        battersMap[striker].balls += 1;
        battersMap[striker].status = `b ${bowler}`;
        bowlersMap[bowler].balls += 1;
        bowlersMap[bowler].wickets += 1;
        currentPartnershipBalls += 1;
        
        fow.push({
          batter: striker,
          score: `${fow.length + 1}-${currentScore}`,
          over: ball.over.toFixed(1)
        });
        
        partnerships.push({
          wicket: fow.length,
          runs: currentPartnershipRuns,
          balls: currentPartnershipBalls,
          batters: { ...currentPartnershipBatters }
        });
        
        currentPartnershipRuns = 0;
        currentPartnershipBalls = 0;
        currentPartnershipBatters = {};
      }
    });

    if (currentPartnershipRuns > 0 || currentPartnershipBalls > 0) {
      partnerships.push({
        wicket: fow.length + 1,
        runs: currentPartnershipRuns,
        balls: currentPartnershipBalls,
        batters: { ...currentPartnershipBatters }
      });
    }

    const battersArr = Object.values(battersMap);
    const bowlersArr = Object.values(bowlersMap).map(b => {
      const bComplete = Math.floor(b.balls / 6);
      const bBallsNum = b.balls % 6;
      b.overs = parseFloat(`${bComplete}.${bBallsNum}`);
      b.econ = b.balls > 0 ? (b.runs / (b.balls / 6)).toFixed(2) : '0.00';
      return b;
    });

    const scoreObj = match.score?.[`innings${scorecardInnings}`];
    const extrasObj = scoreObj?.extras || { wd: 0, nb: 0, b: 0, lb: 0 };
    const totalExtras = extrasObj.wd + extrasObj.nb + extrasObj.b + extrasObj.lb;

    return { batters: battersArr, bowlers: bowlersArr, fow, partnerships, extras: { ...extrasObj, total: totalExtras } };
  }, [match, balls, scorecardInnings]);

  // Graphs Data Engine
  const graphsData = useMemo(() => {
    if (!match || balls.length === 0) return { manhattan: [], worm: [] };
    
    // Sort oldest first
    const sortedBalls = [...balls].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const manhattan = [];
    const worm = [];
    let cumScoreInnings1 = 0;
    let cumScoreInnings2 = 0;
    
    const maxOvers = match.overs || 20;

    for (let i = 1; i <= maxOvers; i++) {
      manhattan.push({ over: i, runs: 0, wickets: 0 });
      worm.push({ over: i, innings1: null, innings2: null });
    }

    sortedBalls.forEach(ball => {
      const overIndex = Math.floor(ball.over); 
      if (overIndex >= maxOvers) return; 
      
      const runsFromBall = ball.runs + (ball.type === 'wd' || ball.type === 'nb' ? 1 : 0);
      
      if (ball.innings === scorecardInnings) {
         manhattan[overIndex].runs += runsFromBall;
         if (ball.type === 'wicket') manhattan[overIndex].wickets += 1;
      }

      if (ball.innings === 1) {
         cumScoreInnings1 += runsFromBall;
         for (let j = overIndex; j < maxOvers; j++) worm[j].innings1 = cumScoreInnings1;
      } else if (ball.innings === 2) {
         cumScoreInnings2 += runsFromBall;
         for (let j = overIndex; j < maxOvers; j++) worm[j].innings2 = cumScoreInnings2;
      }
    });

    const currInnings1Overs = match.score.innings1?.overs || 0;
    const currInnings2Overs = match.score.innings2?.overs || 0;
    
    const finalWorm = worm.map(w => {
       const res = { over: w.over };
       if (w.over <= Math.ceil(currInnings1Overs)) res.innings1 = w.innings1;
       if (w.over <= Math.ceil(currInnings2Overs) && match.currentInnings === 2) res.innings2 = w.innings2;
       return res;
    }).filter(w => w.innings1 !== undefined || w.innings2 !== undefined);

    const finalManhattan = manhattan.filter(m => m.over <= Math.ceil(match.score?.[`innings${scorecardInnings}`]?.overs || 0));

    return { manhattan: finalManhattan, worm: finalWorm };
  }, [match, balls, scorecardInnings]);

  const commentaryData = useMemo(() => {
     if (balls.length === 0) return [];
     const inningsBalls = balls.filter(b => b.innings === match.currentInnings).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
     
     const grouped = [];
     let currentOverGrp = null;
     
     inningsBalls.forEach(ball => {
        const overBase = Math.floor(ball.over);
        if (!currentOverGrp || currentOverGrp.over !== overBase) {
           if (currentOverGrp) grouped.push(currentOverGrp);
           currentOverGrp = { over: overBase, balls: [], runs: 0, wickets: 0 };
        }
        currentOverGrp.balls.push(ball);
        currentOverGrp.runs += (ball.runs + (ball.type === 'wd' || ball.type === 'nb' ? 1 : 0));
        if (ball.type === 'wicket') currentOverGrp.wickets += 1;
     });
     if (currentOverGrp) grouped.push(currentOverGrp);
     return grouped;
  }, [balls, match]);

  const recentBalls = useMemo(() => {
     if (!balls || !match) return [];
     return balls.filter(b => b.innings === match.currentInnings).slice(0, 18).reverse(); 
  }, [balls, match]);

  if (loading || !match || !teamA || !teamB) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-emerald-500/25 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const getTeamName = (id) => {
    if (teamA && id === teamA.id) return teamA.name || 'Unknown';
    if (teamB && id === teamB.id) return teamB.name || 'Unknown';
    return 'Unknown';
  };

  const getTeamShort = (id) => {
    if (teamA && id === teamA.id) return teamA.shortName || 'UNK';
    if (teamB && id === teamB.id) return teamB.shortName || 'UNK';
    return 'UNK';
  };

  const currInningsKey = match.currentInnings === 1 ? 'innings1' : 'innings2';
  const currInningsObj = match.score?.[currInningsKey] || { runs: 0, wickets: 0, overs: 0, extras: {wd:0,nb:0,b:0,lb:0} };
  const { runs = 0, wickets = 0, overs = 0, extras = {wd:0,nb:0,b:0,lb:0} } = currInningsObj;
  const battingTeam = getTeamName(currInningsObj?.team || match.team1);
  const bowlingTeam = getTeamShort(match.currentInnings === 1 ? (match.score?.innings2?.team || match.team2) : (match.score?.innings1?.team || match.team1));
  
  const crr = runs > 0 && overs > 0 ? (runs / (Math.floor(overs) + ((overs % 1) * 10 / 6))).toFixed(2) : '0.00';

  let targetRuns = null;
  let runsNeeded = null;
  let ballsRemaining = null;
  
  if (match.currentInnings === 2) {
    targetRuns = (match.score?.innings1?.runs || 0) + 1;
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
            text: `Check out the scorecard for ${teamA.shortName} vs ${teamB.shortName}!`,
            files: [file],
         });
      } else {
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

  const sendChatMessage = async (e) => {
     e.preventDefault();
     if (!chatInput.trim()) return;
     try {
        const chatRef = ref(db, `matches/${matchId}/chat`);
        await push(chatRef, {
           author: guestName,
           text: chatInput.trim(),
           timestamp: Date.now()
        });
        setChatInput('');
     } catch(err) {
        toast.error("Failed to send message");
     }
  };

  let currentOverBalls = [];
  let currentOverTotal = 0;
  if (balls && balls.length > 0) {
    const currentOverBase = Math.floor(overs);
    currentOverBalls = balls.filter(b => Math.floor(b.over) === currentOverBase && b.innings === match.currentInnings)
                            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    currentOverTotal = currentOverBalls.reduce((acc, curr) => acc + curr.runs + (curr.type === 'wd' || curr.type === 'nb' ? 1 : 0), 0);
  }
  
  const lastBall = balls.length > 0 && balls[0].innings === match.currentInnings ? balls[0] : null;
  let lastBallLabel = '';
  if (lastBall) {
    if (lastBall.type === 'wicket') lastBallLabel = 'W';
    else if (lastBall.type === 'wd') lastBallLabel = lastBall.runs > 1 ? `${lastBall.runs}wd` : 'wd';
    else if (lastBall.type === 'nb') lastBallLabel = lastBall.runs > 1 ? `${lastBall.runs}nb` : 'nb';
    else if (lastBall.type === 'b') lastBallLabel = `${lastBall.runs}b`;
    else if (lastBall.type === 'lb') lastBallLabel = `${lastBall.runs}lb`;
    else lastBallLabel = lastBall.runs.toString();
  }

  let winPercentBatting = 50;
  if (match.currentInnings === 2 && targetRuns) {
     const reqRunRate = (runsNeeded / (ballsRemaining / 6)) || 0;
     const currentRunRate = parseFloat(crr);
     if (reqRunRate <= 0) winPercentBatting = 100;
     else if (ballsRemaining === 0) winPercentBatting = 0;
     else {
        const diff = currentRunRate - reqRunRate;
        winPercentBatting = Math.max(5, Math.min(95, 50 + (diff * 10)));
     }
  }
  
  const cp = match.score?.[currInningsKey]?.currentPlayers;
  const strikerName = cp?.striker?.name || 'Striker';
  const strikerRuns = cp?.striker?.runs || 0;
  const strikerBalls = cp?.striker?.balls || 0;
  const strikerSR = strikerBalls > 0 ? ((strikerRuns / strikerBalls) * 100).toFixed(1) : '-';

  const nonStrikerName = cp?.nonStriker?.name || 'Non-Striker';
  const nonStrikerRuns = cp?.nonStriker?.runs || 0;
  const nonStrikerBalls = cp?.nonStriker?.balls || 0;
  const nonStrikerSR = nonStrikerBalls > 0 ? ((nonStrikerRuns / nonStrikerBalls) * 100).toFixed(1) : '-';

  const bowlerName = cp?.bowler?.name || 'TBD';
  const bowlerRuns = cp?.bowler?.runs || 0;
  const bowlerWickets = cp?.bowler?.wickets || 0;
  const bowlerOvers = cp?.bowler?.overs || 0;
  const bOversNum = typeof bowlerOvers === 'number' ? bowlerOvers : parseFloat(bowlerOvers || 0);
  const bComplete = Math.floor(bOversNum);
  const bBallsNum = Math.round((bOversNum - bComplete) * 10);
  const totalBowlerBalls = (bComplete * 6) + bBallsNum;
  const bowlerEcon = totalBowlerBalls > 0 ? (bowlerRuns / (totalBowlerBalls / 6)).toFixed(2) : '-';

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#151c27] text-white p-3 rounded-lg shadow-xl text-xs border border-slate-700">
          <p className="font-bold mb-1">Over {label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="font-medium">
              {entry.name}: {entry.value} {entry.payload.wickets > 0 && entry.name === 'Runs' ? `(${entry.payload.wickets} W)` : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-100 sm:py-6 font-sans">
      <div className="w-full max-w-lg mx-auto bg-slate-50 min-h-screen shadow-2xl relative pb-20 overflow-hidden">
        {/* Dark Theme Header Section */}
      <div className="bg-[#151c27] text-white">
        {/* Top Nav */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:text-slate-300 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-sm font-semibold tracking-wide">
              {getTeamShort(teamA.id)} vs {getTeamShort(teamB.id)}, {match.matchName || match.stage || 'Match'}
            </h1>
          </div>
          <div className="flex items-center gap-4 text-slate-300">
            <Share2 size={18} className="cursor-pointer hover:text-white" onClick={handleShare} />
            <Activity size={18} className="cursor-pointer hover:text-white" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar px-4 pt-1 border-b border-slate-700/50 text-sm font-medium">
          <div onClick={() => setActiveTab('Discussions')} className={`px-3 py-2.5 cursor-pointer ${activeTab === 'Discussions' ? 'text-[#ff7979] border-b-2 border-[#ff7979]' : 'text-slate-400'}`}>Discussions</div>
          <div onClick={() => setActiveTab('Commentary')} className={`px-3 py-2.5 cursor-pointer ${activeTab === 'Commentary' ? 'text-[#ff7979] border-b-2 border-[#ff7979]' : 'text-slate-400'}`}>Commentary</div>
          <div onClick={() => setActiveTab('Live')} className={`px-3 py-2.5 cursor-pointer ${activeTab === 'Live' ? 'text-[#ff7979] border-b-2 border-[#ff7979]' : 'text-slate-400'}`}>Live</div>
          <div onClick={() => setActiveTab('Scorecard')} className={`px-3 py-2.5 cursor-pointer ${activeTab === 'Scorecard' ? 'text-[#ff7979] border-b-2 border-[#ff7979]' : 'text-slate-400'}`}>Scorecard</div>
          <div onClick={() => setActiveTab('Graphs')} className={`px-3 py-2.5 cursor-pointer ${activeTab === 'Graphs' ? 'text-[#ff7979] border-b-2 border-[#ff7979]' : 'text-slate-400'}`}>Graphs</div>
        </div>

        {/* Main Score Area */}
        <div className="px-5 py-6 relative" ref={summaryRef}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 shadow-inner">
                <span className="text-xs font-bold text-slate-300">{getTeamShort(match.score?.[currInningsKey]?.team || match.team1).substring(0,2)}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{getTeamShort(match.score?.[currInningsKey]?.team || match.team1)}</h2>
                  {overs < 6 && <span className="bg-[#ff4757] text-white text-[10px] font-bold px-1 rounded uppercase tracking-wider">PP</span>}
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-black tracking-tighter text-[#1dd1a1]">
                    {runs}-{wickets}
                  </span>
                  <span className="text-slate-400 text-lg font-medium">{Number(overs || 0).toFixed(1)}</span>
                </div>
              </div>
            </div>
            
            {/* Huge Last Ball Indicator */}
            {lastBallLabel && (
              <div className="flex flex-col items-end opacity-90">
                <span className="text-5xl font-black text-[#eccc68] tracking-tighter">{lastBallLabel}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-6 text-xs text-slate-300 font-medium">
            <div>CRR: {crr}</div>
            {targetRuns && <div>RRR: {(runsNeeded / (ballsRemaining / 6)).toFixed(2) || '0.00'}</div>}
            {targetRuns ? <div>Target: {targetRuns}</div> : <div>Toss: {getTeamShort(match.toss?.wonBy)} ({match.toss?.decision})</div>}
          </div>
        </div>
      </div>

      {match.status === 'completed' && match.result && (
        <div className="bg-emerald-50 text-emerald-700 text-center py-2 text-sm font-bold border-b border-emerald-100 shadow-sm">
          {getTeamName(match.result.winner)} won by {match.result.margin}
        </div>
      )}

      {activeTab === 'Live' && (
        <>
          {/* Target/Need Banner */}
          {match.currentInnings === 2 && match.status !== 'completed' && (
            <div className="bg-[#fff7e6] text-[#d97706] text-center py-2 text-sm font-bold border-b border-[#fef3c7]">
              {getTeamShort(match.score?.innings2?.team || match.team2)} need {runsNeeded} runs in {ballsRemaining} balls
            </div>
          )}
          
          {/* Current Over Banner */}
          <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar">
              <span className="text-xs font-bold text-slate-800 whitespace-nowrap">Over {Math.floor(overs) + 1}</span>
              <div className="flex gap-1.5 items-center">
                {currentOverBalls.map((b, i) => {
                  let bLabel = b.runs.toString();
                  let bClass = "bg-white border border-slate-300 text-slate-700"; 
                  
                  if (b.type === 'wicket') { bLabel = 'W'; bClass = "bg-[#ff4757] text-white border-[#ff4757]"; }
                  else if (b.runs === 4 || b.runs === 6) { bClass = "bg-[#2ed573] text-white border-[#2ed573]"; }
                  else if (b.type === 'wd' || b.type === 'nb') {
                    bLabel = b.type === 'wd' ? (b.runs > 1 ? `${b.runs}wd` : 'wd') : (b.runs > 1 ? `${b.runs}nb` : 'nb');
                    bClass = "bg-white border border-slate-300 text-slate-700 text-[10px] px-1";
                  }
                  else if (b.type === 'b' || b.type === 'lb') {
                    bLabel = `${b.runs}${b.type}`;
                    bClass = "bg-white border border-slate-300 text-slate-700 text-[10px] px-1";
                  }

                  return (
                    <div key={b.id || i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shadow-sm ${bClass}`}>
                      {bLabel}
                    </div>
                  );
                })}
              </div>
              <span className="text-xs font-bold text-slate-800 ml-2 whitespace-nowrap">= {currentOverTotal}</span>
            </div>
            <div className="text-xs text-slate-400 font-medium whitespace-nowrap flex items-center">
              Overs &gt;
            </div>
          </div>

          {/* Win % Predictor */}
          {match.currentInnings === 2 && match.status !== 'completed' && (
            <div className="bg-white px-4 py-4 border-b border-slate-200">
              <div className="flex justify-between items-center text-[10px] font-medium text-slate-500 mb-1.5">
                <span>{getTeamShort(match.score?.innings2?.team || match.team2)}</span>
                <span className="flex items-center gap-1"><Activity size={10} /> Realtime Win %</span>
                <span>{getTeamShort(match.score?.innings1?.team || match.team1)}</span>
              </div>
              <div className="flex justify-between items-center mb-1 text-sm font-bold">
                <span className="text-slate-800">{Math.round(winPercentBatting)}%</span>
                <span className="text-slate-800">{100 - Math.round(winPercentBatting)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-orange-400 transition-all duration-1000" style={{ width: `${winPercentBatting}%` }}></div>
                <div className="h-full bg-[#ff4757] transition-all duration-1000" style={{ width: `${100 - winPercentBatting}%` }}></div>
              </div>
            </div>
          )}

          {/* Players Stats Table */}
          <div className="bg-white mt-2 border-y border-slate-200 shadow-sm">
            {/* Batter Section */}
            <div className="px-4 py-2 border-b border-slate-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 font-medium">
                    <th className="text-left pb-2 font-normal w-[45%]">Batter</th>
                    <th className="text-center pb-2 font-normal w-[15%]">R (B)</th>
                    <th className="text-center pb-2 font-normal w-[12%]">4s</th>
                    <th className="text-center pb-2 font-normal w-[12%]">6s</th>
                    <th className="text-right pb-2 font-normal w-[16%]">SR</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2.5 font-bold text-slate-800 flex items-center gap-1.5">
                      {strikerName} <span className="text-[#d97706] text-[10px]">🏏</span>
                    </td>
                    <td className="text-center py-2.5 font-bold text-slate-800 whitespace-nowrap">{strikerRuns} <span className="text-slate-400 font-normal">({strikerBalls})</span></td>
                    <td className="text-center py-2.5 text-slate-500">0</td>
                    <td className="text-center py-2.5 text-slate-500">0</td>
                    <td className="text-right py-2.5 text-slate-500 flex items-center justify-end gap-1">{strikerSR} <span className="text-slate-300">v</span></td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-slate-800">
                      {nonStrikerName}
                    </td>
                    <td className="text-center py-2.5 font-bold text-slate-800 whitespace-nowrap">{nonStrikerRuns} <span className="text-slate-400 font-normal">({nonStrikerBalls})</span></td>
                    <td className="text-center py-2.5 text-slate-500">0</td>
                    <td className="text-center py-2.5 text-slate-500">0</td>
                    <td className="text-right py-2.5 text-slate-500 flex items-center justify-end gap-1">{nonStrikerSR} <span className="text-slate-300">v</span></td>
                  </tr>
                </tbody>
              </table>
              <div className="flex justify-between items-center pt-2 pb-1 border-t border-slate-50 border-dashed text-[10px] text-slate-400">
                <span>P'ship: {strikerRuns + nonStrikerRuns} ({strikerBalls + nonStrikerBalls}) <span className="text-slate-300">&gt;</span></span>
                <span>Last wkt: -</span>
              </div>
            </div>

            {/* Bowler Section */}
            <div className="px-4 py-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 font-medium">
                    <th className="text-left pb-2 font-normal w-[48%]">Bowler</th>
                    <th className="text-center pb-2 font-normal w-[13%]">W-R</th>
                    <th className="text-center pb-2 font-normal w-[13%]">Overs</th>
                    <th className="text-right pb-2 font-normal w-[26%]">Econ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2.5 font-bold text-slate-800">
                      {bowlerName}
                    </td>
                    <td className="text-center py-2.5 font-bold text-slate-800">{bowlerWickets}-{bowlerRuns}</td>
                    <td className="text-center py-2.5 text-slate-500">{Number(bowlerOvers || 0).toFixed(1)}</td>
                    <td className="text-right py-2.5 text-slate-500 flex items-center justify-end gap-1">{bowlerEcon} <span className="text-slate-300">v</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Impact Players / Top Performers */}
            <div className="bg-gradient-to-br from-indigo-600 via-blue-700 to-sky-500 rounded-xl mx-4 mb-4 mt-2 p-3.5 shadow-xl shadow-blue-500/20 relative overflow-hidden border border-blue-400/30">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
               <div className="absolute bottom-0 left-0 w-24 h-24 bg-sky-300 opacity-10 rounded-full blur-xl transform -translate-x-10 translate-y-10"></div>
               
               <div className="flex justify-between items-center relative z-10">
                  <div className="flex flex-col flex-1">
                     <span className="text-[9px] uppercase tracking-widest text-sky-200 font-bold mb-0.5 flex items-center gap-1">
                       <Trophy size={10} className="text-yellow-400" /> Top Batter
                     </span>
                     <span className="text-sm font-black text-white truncate">
                       {scorecardData.batters.length > 0 ? [...scorecardData.batters].sort((a,b) => b.runs - a.runs)[0].name : 'Waiting...'}
                     </span>
                     {scorecardData.batters.length > 0 && (
                       <span className="text-[11px] text-sky-100 font-medium">
                         {[...scorecardData.batters].sort((a,b) => b.runs - a.runs)[0].runs} runs ({[...scorecardData.batters].sort((a,b) => b.runs - a.runs)[0].balls}b)
                       </span>
                     )}
                  </div>
                  
                  <div className="h-10 w-px bg-white/20 mx-3"></div>
                  
                  <div className="flex flex-col flex-1 text-right items-end">
                     <span className="text-[9px] uppercase tracking-widest text-sky-200 font-bold mb-0.5 flex items-center gap-1">
                       <Activity size={10} className="text-red-400" /> Best Bowler
                     </span>
                     <span className="text-sm font-black text-white truncate">
                       {scorecardData.bowlers.length > 0 ? [...scorecardData.bowlers].sort((a,b) => (b.wickets - a.wickets) || (a.runs - b.runs))[0].name : 'Waiting...'}
                     </span>
                     {scorecardData.bowlers.length > 0 && (
                       <span className="text-[11px] text-sky-100 font-medium">
                         {[...scorecardData.bowlers].sort((a,b) => (b.wickets - a.wickets) || (a.runs - b.runs))[0].wickets} Wkts / {[...scorecardData.bowlers].sort((a,b) => (b.wickets - a.wickets) || (a.runs - b.runs))[0].runs} Runs
                       </span>
                     )}
                  </div>
               </div>
            </div>
          </div>

          {/* Match Insights & Recent Form */}
          <div className="bg-white mt-2 border-y border-slate-200 shadow-sm p-4">
            
            {/* Insights Card */}
            <div className="bg-gradient-to-br from-[#0f172a] to-[#334155] rounded-xl p-4 text-white shadow-md mb-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10 transform translate-x-2 -translate-y-2">
                <Activity size={100} />
              </div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Match Insights</h3>
              
              {match.currentInnings === 1 ? (
                 <div>
                    <div className="text-sm font-medium text-slate-200">Projected Score</div>
                    <div className="flex items-end gap-3 mt-1">
                       <span className="text-3xl font-black">{Math.round(parseFloat(crr) * (match.overs || 20))}</span>
                       <span className="text-xs text-slate-300 mb-1">@ {crr} CRR</span>
                    </div>
                 </div>
              ) : (
                 <div>
                    <div className="text-sm font-medium text-slate-200">Equation</div>
                    <div className="flex items-end gap-3 mt-1">
                       <span className="text-2xl font-black">{runsNeeded}</span>
                       <span className="text-xs text-slate-300 mb-1">runs needed in</span>
                       <span className="text-2xl font-black">{ballsRemaining}</span>
                       <span className="text-xs text-slate-300 mb-1">balls</span>
                    </div>
                    {targetRuns && <div className="text-[11px] font-medium text-slate-400 mt-2">Required Run Rate: {(runsNeeded / (ballsRemaining / 6)).toFixed(2)}</div>}
                 </div>
              )}
            </div>

            {/* Recent Balls Strip */}
            <div>
               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Recent Form</h3>
               <div className="flex items-center overflow-x-auto hide-scrollbar pb-2">
                  <div className="text-[10px] font-bold text-slate-300 mr-2 shrink-0">Old</div>
                  <div className="flex items-center gap-1">
                  {recentBalls.map((b, i) => {
                     let bLabel = b.runs.toString();
                     let bClass = "bg-slate-100 text-slate-600 border border-slate-200"; 
                     
                     if (b.type === 'wicket') { bLabel = 'W'; bClass = "bg-[#ff4757] text-white border-[#ff4757]"; }
                     else if (b.runs === 4 || b.runs === 6) { bClass = "bg-[#2ed573] text-white border-[#2ed573]"; }
                     else if (b.runs === 0 && b.type === 'normal') { bLabel = '•'; bClass = "bg-white border border-slate-300 text-slate-400 text-lg leading-none"; }
                     else if (b.type === 'wd' || b.type === 'nb') {
                       bLabel = b.type === 'wd' ? (b.runs > 1 ? `${b.runs}wd` : 'wd') : (b.runs > 1 ? `${b.runs}nb` : 'nb');
                       bClass = "bg-white border border-slate-300 text-slate-700 text-[9px] px-1";
                     }
                     else if (b.type === 'b' || b.type === 'lb') {
                       bLabel = `${b.runs}${b.type}`;
                       bClass = "bg-white border border-slate-300 text-slate-700 text-[9px] px-1";
                     }
                     
                     // Show vertical pipe if over boundary
                     const isNewOver = i > 0 && Math.floor(recentBalls[i-1].over) !== Math.floor(b.over);

                     return (
                        <div key={b.id || i} className="flex items-center">
                           {isNewOver && <div className="w-px h-5 bg-slate-200 mx-1"></div>}
                           <div className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${bClass}`}>
                             {bLabel}
                           </div>
                        </div>
                     );
                  })}
                  </div>
                  <div className="text-[10px] font-bold text-slate-300 ml-2 shrink-0">New</div>
               </div>
            </div>

          </div>
        </>
      )}
      
      {activeTab === 'Scorecard' && (
        <div className="bg-white">
          {/* Innings Toggle Tabs */}
          <div className="flex px-4 py-3 gap-3 border-b border-slate-200">
            <div 
              onClick={() => setScorecardInnings(1)}
              className={`flex-1 py-2 text-center rounded-lg border font-bold text-sm cursor-pointer transition-all ${
                scorecardInnings === 1 ? 'bg-[#154360] text-white border-[#154360]' : 'bg-white text-slate-600 border-slate-300'
              }`}
            >
              {getTeamShort(match.score?.innings1?.team || match.team1)} {match.currentInnings === 1 ? '' : `${match.score?.innings1?.runs || 0}-${match.score?.innings1?.wickets || 0} (${(match.score?.innings1?.overs || 0).toFixed(1)})`}
            </div>
            {match.currentInnings === 2 && (
              <div 
                onClick={() => setScorecardInnings(2)}
                className={`flex-1 py-2 text-center rounded-lg border font-bold text-sm cursor-pointer transition-all ${
                  scorecardInnings === 2 ? 'bg-[#154360] text-white border-[#154360]' : 'bg-white text-slate-600 border-slate-300'
                }`}
              >
                {getTeamShort(match.score?.innings2?.team || match.team2)}
              </div>
            )}
          </div>

          {/* Batting Scorecard */}
          <div className="px-4 py-2 border-b border-slate-200">
            <div className="text-[10px] text-blue-500 uppercase tracking-wider font-semibold mb-2">Batter ↓</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 font-medium">
                  <th className="text-left pb-2 font-normal w-[45%]"></th>
                  <th className="text-center pb-2 font-normal w-[11%]">R</th>
                  <th className="text-center pb-2 font-normal w-[11%]">B</th>
                  <th className="text-center pb-2 font-normal w-[11%]">4s</th>
                  <th className="text-center pb-2 font-normal w-[11%]">6s</th>
                  <th className="text-right pb-2 font-normal w-[11%]">SR</th>
                </tr>
              </thead>
              <tbody>
                {scorecardData.batters.map((batter, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="py-3">
                      <div className="font-bold text-slate-800 text-[13px] flex items-center gap-1.5">
                        {batter.name} {batter.status === 'Batting' && scorecardInnings === match.currentInnings && <span className="text-[#d97706] text-[10px]">🏏</span>}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{batter.status}</div>
                    </td>
                    <td className="text-center font-bold text-slate-800 text-[13px]">{batter.runs}</td>
                    <td className="text-center text-slate-500">{batter.balls}</td>
                    <td className="text-center text-slate-500">{batter.fours}</td>
                    <td className="text-center text-slate-500">{batter.sixes}</td>
                    <td className="text-right text-slate-500 flex items-center justify-end gap-1 h-full mt-3">
                      {batter.balls > 0 ? ((batter.runs / batter.balls) * 100).toFixed(2) : '0.00'} <span className="text-slate-300 text-[10px]">v</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="flex justify-between items-center py-3 border-t border-slate-100 mt-2">
              <span className="font-bold text-slate-800 text-xs">Extras:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-sm">{scorecardData.extras.total}</span>
                <span className="text-[10px] text-slate-500">
                  (wd {scorecardData.extras.wd}, nb {scorecardData.extras.nb}, b {scorecardData.extras.b}, lb {scorecardData.extras.lb})
                </span>
              </div>
            </div>
          </div>

          {/* Bowling Scorecard */}
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Bowling</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 font-medium">
                  <th className="text-left pb-2 font-normal text-[11px] text-blue-500 w-[45%]">Bowler ↓</th>
                  <th className="text-center pb-2 font-normal w-[11%]">O</th>
                  <th className="text-center pb-2 font-normal w-[11%]">M</th>
                  <th className="text-center pb-2 font-normal w-[11%]">R</th>
                  <th className="text-center pb-2 font-normal w-[11%]">W</th>
                  <th className="text-right pb-2 font-normal w-[11%]">Eco</th>
                </tr>
              </thead>
              <tbody>
                {scorecardData.bowlers.map((bowler, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 font-bold text-slate-800 text-[13px]">{bowler.name}</td>
                    <td className="text-center text-slate-500">{Number(bowler.overs || 0).toFixed(1)}</td>
                    <td className="text-center text-slate-500">{bowler.maidens}</td>
                    <td className="text-center text-slate-500">{bowler.runs}</td>
                    <td className="text-center font-bold text-slate-800">{bowler.wickets}</td>
                    <td className="text-right text-slate-500 flex items-center justify-end gap-1 h-full mt-2.5">
                      {bowler.econ} <span className="text-slate-300 text-[10px]">v</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Fall of Wickets */}
          <div className="px-4 py-3 border-b border-slate-200">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Fall of Wickets</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 font-medium">
                  <th className="text-left pb-2 font-normal">Batter</th>
                  <th className="text-right pb-2 font-normal w-16">Score</th>
                  <th className="text-right pb-2 font-normal w-12">Over</th>
                </tr>
              </thead>
              <tbody>
                {scorecardData.fow.map((wicket, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 font-bold text-slate-800">{wicket.batter}</td>
                    <td className="text-right font-bold text-slate-800">{wicket.score}</td>
                    <td className="text-right text-slate-500 flex items-center justify-end gap-1 mt-2.5">
                      {wicket.over} <span className="text-slate-300 text-[10px]">v</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Partnerships */}
          <div className="px-4 py-3 bg-slate-50/50">
            <div className="flex justify-between items-center mb-3 text-[10px] text-slate-400">
              <span className="uppercase tracking-wider">Batter 1</span>
              <span className="uppercase tracking-wider">Batter 2</span>
            </div>
            <div className="space-y-6">
              {scorecardData.partnerships.map((p, i) => {
                const battersList = Object.entries(p.batters);
                if (battersList.length === 0) return null;
                const b1 = battersList[0];
                const b2 = battersList.length > 1 ? battersList[1] : null;
                
                const b1Percent = p.runs > 0 ? (b1[1] / p.runs) * 100 : 50;
                const b2Percent = p.runs > 0 ? 100 - b1Percent : 50;

                return (
                  <div key={i}>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-2">
                      {p.wicket}{p.wicket === 1 ? 'ST' : p.wicket === 2 ? 'ND' : p.wicket === 3 ? 'RD' : 'TH'} WICKET
                    </div>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="text-left">
                        <div className="font-bold text-slate-800 text-[13px]">{b1[0]}</div>
                        <div className="font-bold text-slate-800 text-[13px]">{b1[1]} <span className="text-[10px] text-slate-400 font-normal">runs</span></div>
                      </div>
                      <div className="text-center">
                        <div className="font-black text-[#d97706] text-[15px]">{p.runs} <span className="text-[11px] text-slate-500 font-medium">({p.balls})</span></div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-800 text-[13px]">{b2 ? b2[0] : '-'}</div>
                        <div className="font-bold text-slate-800 text-[13px]">{b2 ? b2[1] : '0'} <span className="text-[10px] text-slate-400 font-normal">runs</span></div>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-slate-200">
                       <div className="h-full bg-[#2ed573] transition-all" style={{ width: `${b1Percent}%` }}></div>
                       <div className="h-full bg-[#ff4757] transition-all" style={{ width: `${b2Percent}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Graphs' && (
        <div className="bg-white p-4">
          <div className="flex gap-3 border-b border-slate-200 pb-3 mb-4">
            <div 
              onClick={() => setScorecardInnings(1)}
              className={`flex-1 py-2 text-center rounded-lg border font-bold text-sm cursor-pointer transition-all ${
                scorecardInnings === 1 ? 'bg-[#154360] text-white border-[#154360]' : 'bg-white text-slate-600 border-slate-300'
              }`}
            >
              {getTeamShort(match.score?.innings1?.team || match.team1)}
            </div>
            {match.currentInnings === 2 && (
              <div 
                onClick={() => setScorecardInnings(2)}
                className={`flex-1 py-2 text-center rounded-lg border font-bold text-sm cursor-pointer transition-all ${
                  scorecardInnings === 2 ? 'bg-[#154360] text-white border-[#154360]' : 'bg-white text-slate-600 border-slate-300'
                }`}
              >
                {getTeamShort(match.score?.innings2?.team || match.team2)}
              </div>
            )}
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Activity size={16} className="text-[#10b981]"/> Manhattan (Runs per Over)
            </h3>
            <div className="w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graphsData.manhattan} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="over" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="runs" name="Runs" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="wickets" name="Wickets" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Activity size={16} className="text-[#8b5cf6]"/> Worm (Cumulative Score)
            </h3>
            <div className="w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graphsData.worm} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="over" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  <Line type="monotone" dataKey="innings1" name={getTeamShort(match.score?.innings1?.team || match.team1)} stroke="#3b82f6" strokeWidth={3} dot={false} />
                  {match.currentInnings === 2 && (
                    <Line type="monotone" dataKey="innings2" name={getTeamShort(match.score?.innings2?.team || match.team2)} stroke="#10b981" strokeWidth={3} dot={false} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Commentary' && (
        <div className="bg-white">
           {commentaryData.map((overGrp, i) => (
             <div key={i} className="mb-2">
                <div className="bg-slate-100 px-4 py-2 border-y border-slate-200 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                   <div className="font-bold text-slate-800 text-xs">End of Over {overGrp.over + 1}</div>
                   <div className="text-xs font-semibold text-slate-600">
                      {overGrp.runs} Runs {overGrp.wickets > 0 ? `• ${overGrp.wickets} Wkts` : ''}
                   </div>
                </div>
                <div className="px-4 py-2 divide-y divide-slate-50">
                   {overGrp.balls.map((b, j) => {
                      let tagClass = "bg-slate-100 text-slate-600 border border-slate-200";
                      if (b.type === 'wicket') tagClass = "bg-[#ff4757] text-white";
                      else if (b.runs === 4 || b.runs === 6) tagClass = "bg-[#2ed573] text-white";
                      
                      let bLabel = b.runs.toString();
                      if (b.type === 'wicket') bLabel = 'W';
                      else if (b.type === 'wd') bLabel = b.runs > 1 ? `${b.runs}wd` : 'wd';
                      else if (b.type === 'nb') bLabel = b.runs > 1 ? `${b.runs}nb` : 'nb';
                      else if (b.type === 'b') bLabel = `${b.runs}b`;
                      else if (b.type === 'lb') bLabel = `${b.runs}lb`;
                      
                      return (
                         <div key={j} className="flex gap-4 items-start py-3">
                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${tagClass}`}>
                               {bLabel}
                            </div>
                            <div>
                               <div className="text-sm text-slate-700 leading-snug">
                                  <span className="font-bold text-slate-900">{Number(b.over || 0).toFixed(1)}</span> — {b.commentary}
                               </div>
                            </div>
                         </div>
                      );
                   })}
                </div>
             </div>
           ))}
           {commentaryData.length === 0 && (
             <div className="text-center text-slate-400 py-10 text-sm">No commentary available yet.</div>
           )}
        </div>
      )}

      {activeTab === 'Discussions' && (
        <div className="bg-white flex flex-col h-[calc(100vh-250px)]">
           <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 ? (
                 <div className="text-center text-slate-400 py-10 text-sm">Be the first to say something!</div>
              ) : (
                 chatMessages.map((msg) => {
                    const isMe = msg.author === guestName;
                    return (
                       <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <span className="text-[10px] text-slate-400 mb-1 ml-1">{msg.author}</span>
                          <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm ${isMe ? 'bg-[#3b82f6] text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`}>
                             {msg.text}
                          </div>
                       </div>
                    );
                 })
              )}
              <div ref={chatEndRef} />
           </div>
           
           <div className="border-t border-slate-200 p-3 bg-white mt-auto sticky bottom-0 w-full z-20">
              <form onSubmit={sendChatMessage} className="flex items-center gap-2 relative">
                 <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Chat as..."
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                 />
                 <button 
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="w-11 h-11 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-full flex items-center justify-center transition-colors shrink-0 shadow-sm"
                 >
                    <Send size={18} className="ml-1" />
                 </button>
              </form>
           </div>
        </div>
      )}
      </div>
    </div>
  );
}
