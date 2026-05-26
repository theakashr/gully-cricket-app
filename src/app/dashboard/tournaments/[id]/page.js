"use client";
import { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Calendar, List, ArrowLeft, Shield, BarChart3, Medal, Star, Play, Award, ChevronRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { ref, onValue, get } from 'firebase/database';

export default function DashboardTournamentDetailsPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const tournamentId = params.id;
  
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState({});
  const [pointsTable, setPointsTable] = useState([]);
  const [playerStats, setPlayerStats] = useState({ orangeCap: [], purpleCap: [], mvp: [] });
  const [activeTab, setActiveTab] = useState('standings'); // standings, fixtures, stats
  const [statsTab, setStatsTab] = useState('orange'); // orange, purple, mvp
  const [loading, setLoading] = useState(true);

  // IND vs AUS Mock Live Broadcaster Dashboard State
  const [analyticsTab, setAnalyticsTab] = useState('worm'); // worm, manhattan, projection
  const [predictorWinPercent, setPredictorWinPercent] = useState(78); // Live probability

  useEffect(() => {
    const fetchData = async () => {
      const tourneySnap = await get(ref(db, `tournaments/${tournamentId}`));
      if (tourneySnap.exists()) {
        setTournament({ id: tournamentId, ...tourneySnap.val() });
      }

      const teamsSnap = await get(ref(db, 'teams'));
      const teamsData = teamsSnap.exists() ? teamsSnap.val() : {};
      setTeams(teamsData);

      const matchesRef = ref(db, 'matches');
      const unsubscribe = onValue(matchesRef, (snapshot) => {
        if (snapshot.exists()) {
          const allMatches = Object.entries(snapshot.val()).map(([id, val]) => ({ id, ...val }));
          const tMatches = allMatches.filter(m => m.tournamentId === tournamentId);
          
          tMatches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setMatches(tMatches);
          
          calculatePointsTable(tMatches, teamsData);
          calculatePlayerStats(tMatches);
        } else {
          setMatches([]);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    };

    fetchData();
  }, [tournamentId]);

  const parseOvers = (oversStr) => {
    if (!oversStr) return 0;
    const num = parseFloat(oversStr);
    if (isNaN(num)) return 0;
    const whole = Math.floor(num);
    const balls = Math.round((num - whole) * 10);
    return whole + (balls / 6);
  };

  const calculatePointsTable = (tMatches, allTeams) => {
    const table = {};
    const knockoutKeywords = ['final', 'quarter', 'semi', 'eliminator', 'qualifier'];
    const leagueMatches = tMatches.filter(m => {
      if (!m.stage) return true;
      const stageLower = m.stage.toLowerCase();
      return !knockoutKeywords.some(keyword => stageLower.includes(keyword));
    });

    tMatches.forEach(m => {
      if (m.teamA && !table[m.teamA]) table[m.teamA] = { id: m.teamA, played: 0, won: 0, lost: 0, tied: 0, points: 0, runsFor: 0, oversFor: 0, runsAgainst: 0, oversAgainst: 0, nrr: 0 };
      if (m.teamB && !table[m.teamB]) table[m.teamB] = { id: m.teamB, played: 0, won: 0, lost: 0, tied: 0, points: 0, runsFor: 0, oversFor: 0, runsAgainst: 0, oversAgainst: 0, nrr: 0 };
    });

    leagueMatches.forEach(m => {
      if (m.status === 'completed' && m.result && m.score?.innings1 && m.score?.innings2) {
        if (m.teamA) table[m.teamA].played += 1;
        if (m.teamB) table[m.teamB].played += 1;

        if (m.result.winner === 'Draw' || m.result.winner === 'Tie') {
          if (m.teamA) { table[m.teamA].tied += 1; table[m.teamA].points += 1; }
          if (m.teamB) { table[m.teamB].tied += 1; table[m.teamB].points += 1; }
        } else {
          const winner = m.result.winner;
          const loser = winner === m.teamA ? m.teamB : m.teamA;
          if (table[winner]) { table[winner].won += 1; table[winner].points += 2; }
          if (table[loser]) { table[loser].lost += 1; }
        }

        const i1 = m.score.innings1;
        const i2 = m.score.innings2;
        const maxOvers = m.overs || 20;

        const processTeamStats = (teamId, teamInnings, oppInnings) => {
           if (!table[teamId]) return;
           table[teamId].runsFor += (teamInnings.runs || 0);
           table[teamId].oversFor += teamInnings.wickets === 10 ? maxOvers : parseOvers(teamInnings.overs);
           table[teamId].runsAgainst += (oppInnings.runs || 0);
           table[teamId].oversAgainst += oppInnings.wickets === 10 ? maxOvers : parseOvers(oppInnings.overs);
        };

        if (i1.team === m.teamA) {
           processTeamStats(m.teamA, i1, i2);
           processTeamStats(m.teamB, i2, i1);
        } else {
           processTeamStats(m.teamA, i2, i1);
           processTeamStats(m.teamB, i1, i2);
        }
      }
    });

    Object.values(table).forEach(t => {
       const runRateFor = t.oversFor > 0 ? (t.runsFor / t.oversFor) : 0;
       const runRateAgainst = t.oversAgainst > 0 ? (t.runsAgainst / t.oversAgainst) : 0;
       t.nrr = runRateFor - runRateAgainst;
    });

    const sortedTable = Object.values(table).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.nrr - a.nrr;
    });

    setPointsTable(sortedTable);
  };

  const calculatePlayerStats = (tMatches) => {
    const players = {}; 
    tMatches.forEach(m => {
      [1, 2].forEach(inningsNum => {
        const innings = m.score?.[`innings${inningsNum}`];
        if (!innings) return;

        if (innings.batting) {
          Object.entries(innings.batting).forEach(([playerId, stats]) => {
            if (!players[playerId]) players[playerId] = { id: playerId, name: stats.name, teamId: innings.team, runs: 0, wickets: 0, mvpPoints: 0 };
            players[playerId].runs += (stats.runs || 0);
            players[playerId].mvpPoints += (stats.runs || 0) * 1; 
          });
        }

        if (innings.bowling) {
          const bowlingTeam = inningsNum === 1 ? m.teamB : m.teamA;
          Object.entries(innings.bowling).forEach(([playerId, stats]) => {
            if (!players[playerId]) players[playerId] = { id: playerId, name: stats.name, teamId: bowlingTeam, runs: 0, wickets: 0, mvpPoints: 0 };
            players[playerId].wickets += (stats.wickets || 0);
            players[playerId].mvpPoints += (stats.wickets || 0) * 20; 
          });
        }
      });
    });

    const playersList = Object.values(players);
    setPlayerStats({
      orangeCap: [...playersList].sort((a, b) => b.runs - a.runs).filter(p => p.runs > 0).slice(0, 10),
      purpleCap: [...playersList].sort((a, b) => b.wickets - a.wickets).filter(p => p.wickets > 0).slice(0, 10),
      mvp: [...playersList].sort((a, b) => b.mvpPoints - a.mvpPoints).filter(p => p.mvpPoints > 0).slice(0, 10)
    });
  };

  const getMatchMVP = (match) => {
    if (match.status !== 'completed') return null;
    const players = {};
    [1, 2].forEach(inn => {
       const innings = match.score?.[`innings${inn}`];
       if (!innings) return;
       if (innings.batting) {
          Object.entries(innings.batting).forEach(([pid, stats]) => {
             if (!players[pid]) players[pid] = { id: pid, name: stats.name, pts: 0 };
             players[pid].pts += (stats.runs || 0);
          });
       }
       if (innings.bowling) {
          Object.entries(innings.bowling).forEach(([pid, stats]) => {
             if (!players[pid]) players[pid] = { id: pid, name: stats.name, pts: 0 };
             players[pid].pts += (stats.wickets || 0) * 20;
          });
       }
    });
    const sorted = Object.values(players).sort((a,b) => b.pts - a.pts);
    return sorted.length > 0 ? sorted[0] : null;
  };

  const getTeamDetails = (id) => {
    return teams[id] || { name: 'Unknown Team', shortName: 'UNK' };
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center min-h-[50vh] items-center">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="p-8 text-center max-w-md mx-auto min-h-[50vh] flex flex-col justify-center items-center">
        <Trophy size={64} className="text-slate-400 mb-4" />
        <h2 className="text-2xl font-black text-slate-800">Tournament Not Found</h2>
        <Link href="/dashboard/tournaments" className="text-blue-650 mt-4 hover:underline font-bold">Back to Tournaments</Link>
      </div>
    );
  }

  const orangeLeader = playerStats.orangeCap[0];
  const purpleLeader = playerStats.purpleCap[0];
  const liveMatch = matches.find(m => m.status === 'live');
  const recentMatch = matches.find(m => m.status === 'completed');

  // IND vs AUS Broadcaster Graph Data points
  const ausRunsPerOver = [6, 8, 4, 12, 15, 8, 5, 9, 7, 14, 6, 8, 11, 5, 18, 9, 7, 12, 14, 18];
  const ausWickets = [3, 8, 14, 17, 20]; 
  const ausCumRuns = [6, 14, 18, 30, 45, 53, 58, 67, 74, 88, 94, 102, 113, 118, 136, 145, 152, 164, 178, 196];

  const indRunsPerOver = [8, 10, 5, 14, 9, 12, 6, 8, 11, 15, 7, 9, 12, 8, 16, 11, 12, 15]; 
  const indWickets = [2, 6, 11, 15, 17];
  const indCumRuns = [8, 18, 23, 37, 46, 58, 64, 72, 83, 98, 105, 114, 126, 134, 150, 161, 173, 188];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-12">
      <Link href="/dashboard/tournaments" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm mb-6 transition-all px-1">
        <ArrowLeft size={16} /> Back to Tournaments
      </Link>

      {/* Tournament Header */}
      <div className="glass-card rounded-3xl p-6 md:p-8 relative overflow-hidden mb-8 border border-white shadow-sm">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-emerald-500"></div>
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 relative z-10 text-center md:text-left">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm flex-shrink-0">
            <Trophy size={32} className="text-blue-600 animate-bounce-slow" />
          </div>
          <div>
            <span className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-2 shadow-sm bg-emerald-50 text-emerald-700 border border-emerald-250">
              {tournament.status}
            </span>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">
              {tournament.name}
            </h1>
            <p className="text-slate-500 text-sm font-semibold mt-2">IPL Tournament Dashboard & Live Analytics Suite</p>
          </div>
        </div>
      </div>

      {/* ========================================================
          🏆 IPL STATE-OF-THE-ART BROADCAST ANALYTICS: IND vs AUS
          ======================================================== */}
      <div className="glass-card rounded-3xl p-6 relative overflow-hidden border border-slate-200/80 shadow-md mb-8 bg-white">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-blue-600"></div>
        
        {/* Widget Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-5 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-200/50 flex items-center justify-center">
              <TrendingUp className="text-orange-500" size={20} />
            </div>
            <div>
              <span className="bg-red-50 border border-red-200 text-red-650 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Broadcaster Feed
              </span>
              <h2 className="text-lg font-black text-slate-900 mt-1 leading-tight tracking-tight">IPL Featured Analytics: IND vs AUS</h2>
            </div>
          </div>
          <div className="text-xs font-bold text-slate-550 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/40">
             Ruleset: standard ipl rules
          </div>
        </div>

        {/* Live Broadcaster Scoreboard Grid */}
        <div className="grid md:grid-cols-5 gap-6 items-center mb-6">
          <div className="md:col-span-3 space-y-4">
             {/* Australia Score */}
             <div className="flex justify-between items-center bg-slate-50 border border-slate-150 p-3.5 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center font-black text-amber-705 text-xs shadow-inner">AUS</div>
                  <span className="font-extrabold text-slate-800 text-base">Australia</span>
                </div>
                <div className="text-right">
                  <span className="font-black text-lg text-slate-900">196/7</span>
                  <span className="text-[10px] text-slate-400 block font-bold">20.0 Overs</span>
                </div>
             </div>

             {/* India Live Chase Score */}
             <div className="flex justify-between items-center bg-blue-50/50 border border-blue-200/60 p-3.5 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-black text-blue-700 text-xs shadow-inner">IND</div>
                  <span className="font-extrabold text-slate-800 text-base flex items-center gap-1.5">
                    India 
                    <span className="bg-red-500 w-1.5 h-1.5 rounded-full animate-ping"></span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-black text-xl text-slate-900">184/5</span>
                  <span className="text-[10px] text-emerald-700 block font-black">18.2 Overs</span>
                </div>
             </div>

             {/* Live Match Situation Text */}
             <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-3 text-center">
                <p className="text-xs font-black text-emerald-750 uppercase tracking-wide">
                  🏏 Target: 197 • India needs 13 runs from 10 balls to win
                </p>
             </div>
          </div>

          {/* Win Predictor Gauge Widget */}
          <div className="md:col-span-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-center flex flex-col justify-center items-center h-full relative overflow-hidden shadow-inner">
             <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-3">Live IPL Win Predictor</span>
             
             {/* Circle Indicator */}
             <div className="relative w-28 h-28 flex items-center justify-center mb-3">
                <svg className="w-full h-full transform -rotate-90">
                   <circle cx="56" cy="56" r="46" className="stroke-slate-250 fill-none" strokeWidth="8"/>
                   <circle cx="56" cy="56" r="46" className="stroke-blue-500 fill-none transition-all duration-1000" strokeWidth="8"
                           strokeDasharray={2 * Math.PI * 46}
                           strokeDashoffset={2 * Math.PI * 46 * (1 - predictorWinPercent/100)}/>
                </svg>
                <div className="absolute inset-0 flex flex-col justify-center items-center">
                   <span className="text-2xl font-black text-slate-900">{predictorWinPercent}%</span>
                   <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">IND WIN</span>
                </div>
             </div>

             <div className="flex justify-between w-full text-[10px] font-extrabold text-slate-500 px-2 mt-1">
                <span className="text-blue-600">IND: 78%</span>
                <span className="text-amber-600">AUS: 22%</span>
             </div>
          </div>
        </div>

        {/* Analytics Tabs Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4 border border-slate-200/50 max-w-md mx-auto shadow-inner text-xs">
          <button 
            onClick={() => setAnalyticsTab('worm')}
            className={`flex-1 py-2 font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${analyticsTab === 'worm' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-850'}`}
          >
            📈 Worm Chart
          </button>
          <button 
            onClick={() => setAnalyticsTab('manhattan')}
            className={`flex-1 py-2 font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${analyticsTab === 'manhattan' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-850'}`}
          >
            📊 Manhattan
          </button>
          <button 
            onClick={() => setAnalyticsTab('projection')}
            className={`flex-1 py-2 font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${analyticsTab === 'projection' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-850'}`}
          >
            🎯 Projections
          </button>
        </div>

        {/* Dynamic Interactive SVG Charts Box */}
        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 min-h-[220px] flex items-center justify-center relative shadow-inner overflow-hidden">
           
           {/* 1. WORM CHART */}
           {analyticsTab === 'worm' && (
              <div className="w-full flex flex-col items-center">
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 self-start pl-2">Cumulative Runs Comparison</span>
                 <svg className="w-full max-w-[480px] h-[160px]" viewBox="0 0 500 180">
                    {/* Grid Lines */}
                    <line x1="30" y1="20" x2="470" y2="20" className="stroke-slate-200" strokeWidth="1" strokeDasharray="3 3"/>
                    <line x1="30" y1="60" x2="470" y2="60" className="stroke-slate-200" strokeWidth="1" strokeDasharray="3 3"/>
                    <line x1="30" y1="100" x2="470" y2="100" className="stroke-slate-200" strokeWidth="1" strokeDasharray="3 3"/>
                    <line x1="30" y1="140" x2="470" y2="140" className="stroke-slate-200" strokeWidth="1" strokeDasharray="3 3"/>
                    <line x1="30" y1="160" x2="470" y2="160" className="stroke-slate-300" strokeWidth="1.5"/>
                    <line x1="30" y1="20" x2="30" y2="160" className="stroke-slate-300" strokeWidth="1.5"/>

                    {/* Y-Axis Labels */}
                    <text x="5" y="25" className="fill-slate-400 font-mono text-[9px] font-black">200</text>
                    <text x="5" y="65" className="fill-slate-400 font-mono text-[9px] font-black">150</text>
                    <text x="5" y="105" className="fill-slate-400 font-mono text-[9px] font-black">100</text>
                    <text x="10" y="145" className="fill-slate-400 font-mono text-[9px] font-black">50</text>
                    <text x="15" y="165" className="fill-slate-400 font-mono text-[9px] font-black">0</text>

                    {/* X-Axis Labels */}
                    <text x="30" y="175" className="fill-slate-400 font-mono text-[9px] font-black">0</text>
                    <text x="135" y="175" className="fill-slate-400 font-mono text-[9px] font-black">5</text>
                    <text x="245" y="175" className="fill-slate-400 font-mono text-[9px] font-black">10</text>
                    <text x="355" y="175" className="fill-slate-400 font-mono text-[9px] font-black">15</text>
                    <text x="460" y="175" className="fill-slate-400 font-mono text-[9px] font-black">20</text>

                    {/* AUS Worm Path (Yellow/Gold) */}
                    <path d={`M 30,160 
                             ${ausCumRuns.map((r, i) => `L ${30 + (i+1)*22},${160 - (r/200)*140}`).join(' ')}`}
                          className="stroke-amber-500 fill-none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    
                    {/* IND Worm Path (Blue) */}
                    <path d={`M 30,160 
                             ${indCumRuns.map((r, i) => `L ${30 + (i+1)*22},${160 - (r/200)*140}`).join(' ')}`}
                          className="stroke-blue-500 fill-none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>

                    {/* Wickets Dots (AUS) */}
                    {ausWickets.map(o => (
                       <circle key={`w-aus-${o}`} cx={30 + o*22} cy={160 - (ausCumRuns[o-1]/200)*140} r="3" className="fill-red-600 stroke-white" strokeWidth="1"/>
                    ))}

                    {/* Wickets Dots (IND) */}
                    {indWickets.map(o => (
                       <circle key={`w-ind-${o}`} cx={30 + o*22} cy={160 - (indCumRuns[o-1]/200)*140} r="3" className="fill-red-600 stroke-white" strokeWidth="1"/>
                    ))}

                    {/* Live Dot for India */}
                    <circle cx={30 + 18*22 + 4} cy={160 - (184/200)*140} r="4" className="fill-blue-500 stroke-white animate-ping" strokeWidth="1.5"/>
                    <circle cx={30 + 18*22 + 4} cy={160 - (184/200)*140} r="3.5" className="fill-blue-500 stroke-white" strokeWidth="1.5"/>
                 </svg>

                 {/* Legend */}
                 <div className="flex gap-4 mt-3 justify-center text-[10px] font-black uppercase tracking-wider text-slate-600">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-blue-500 rounded"></span> IND: 184/5 (18.2)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-amber-500 rounded"></span> AUS: 196/7 (20)</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-600 rounded-full border border-white"></span> Wicket</span>
                 </div>
              </div>
           )}

           {/* 2. MANHATTAN CHART */}
           {analyticsTab === 'manhattan' && (
              <div className="w-full flex flex-col items-center">
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 self-start pl-2">Runs Scored Per Over</span>
                 <svg className="w-full max-w-[480px] h-[160px]" viewBox="0 0 500 180">
                    {/* Grid lines */}
                    <line x1="35" y1="20" x2="475" y2="20" className="stroke-slate-200" strokeWidth="1" strokeDasharray="3 3"/>
                    <line x1="35" y1="65" x2="475" y2="65" className="stroke-slate-200" strokeWidth="1" strokeDasharray="3 3"/>
                    <line x1="35" y1="110" x2="475" y2="110" className="stroke-slate-200" strokeWidth="1" strokeDasharray="3 3"/>
                    <line x1="35" y1="150" x2="475" y2="150" className="stroke-slate-300" strokeWidth="1.5"/>
                    <line x1="35" y1="20" x2="35" y2="150" className="stroke-slate-300" strokeWidth="1.5"/>

                    {/* Y-Axis Labels */}
                    <text x="5" y="25" className="fill-slate-400 font-mono text-[9px] font-black">20 runs</text>
                    <text x="5" y="70" className="fill-slate-400 font-mono text-[9px] font-black">12 runs</text>
                    <text x="10" y="115" className="fill-slate-400 font-mono text-[9px] font-black">6 runs</text>
                    <text x="15" y="155" className="fill-slate-400 font-mono text-[9px] font-black">0</text>

                    {/* X-Axis Labels */}
                    <text x="35" y="165" className="fill-slate-400 font-mono text-[9px] font-black">Over 1</text>
                    <text x="140" y="165" className="fill-slate-400 font-mono text-[9px] font-black">Over 5</text>
                    <text x="250" y="165" className="fill-slate-400 font-mono text-[9px] font-black">Over 10</text>
                    <text x="360" y="165" className="fill-slate-400 font-mono text-[9px] font-black">Over 15</text>
                    <text x="450" y="165" className="fill-slate-400 font-mono text-[9px] font-black">Over 20</text>

                    {/* Bars for both teams up to over 18 */}
                    {Array.from({ length: 18 }).map((_, index) => {
                       const over = index + 1;
                       const ausVal = ausRunsPerOver[index];
                       const indVal = indRunsPerOver[index];
                       const posX = 35 + index * 24;

                       const ausHeight = (ausVal / 20) * 130;
                       const indHeight = (indVal / 20) * 130;

                       return (
                          <g key={`bars-${over}`}>
                             {/* AUS */}
                             <rect x={posX + 2} y={150 - ausHeight} width="8" height={ausHeight} className="fill-amber-500/80 hover:fill-amber-600 rounded-t" rx="1.5"/>
                             {/* IND */}
                             <rect x={posX + 11} y={150 - indHeight} width="8" height={indHeight} className="fill-blue-500/85 hover:fill-blue-600 rounded-t" rx="1.5"/>

                             {/* Wickets fell in this over */}
                             {ausWickets.includes(over) && (
                                <circle cx={posX + 6} cy={140 - ausHeight} r="2.5" className="fill-red-600 stroke-white" strokeWidth="0.5"/>
                             )}
                             {indWickets.includes(over) && (
                                <circle cx={posX + 15} cy={140 - indHeight} r="2.5" className="fill-red-600 stroke-white" strokeWidth="0.5"/>
                             )}
                          </g>
                       );
                    })}
                 </svg>
              </div>
           )}

           {/* 3. IPL PROJECTION TABLE */}
           {analyticsTab === 'projection' && (
              <div className="w-full text-center">
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3 block">IPL Projection Calculator</span>
                 <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                    <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
                       <p className="text-[9px] font-black uppercase text-slate-400">Current Run Rate (CRR)</p>
                       <p className="text-xl font-black text-slate-800 mt-1">10.04</p>
                       <p className="text-[10px] font-bold text-slate-500 mt-0.5">Projected Score: 200</p>
                    </div>
                    <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
                       <p className="text-[9px] font-black uppercase text-slate-400">Required Run Rate (RRR)</p>
                       <p className="text-xl font-black text-red-600 mt-1">7.80</p>
                       <p className="text-[10px] font-bold text-slate-500 mt-0.5">Need 13 runs in 10 balls</p>
                    </div>
                 </div>

                 {/* IPL Rate Projections Matrix */}
                 <div className="mt-4 overflow-hidden rounded-xl border border-slate-150 max-w-xs mx-auto shadow-sm">
                    <table className="w-full text-xs text-left bg-white">
                       <thead>
                          <tr className="bg-slate-50 border-b border-slate-150">
                             <th className="p-2 font-bold text-slate-500">Projection Mode</th>
                             <th className="p-2 font-black text-slate-550 text-right">Target Match Score</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          <tr>
                             <td className="p-2 text-slate-500">At Current Rate (10.04)</td>
                             <td className="p-2 text-right font-bold text-slate-800">188 (Win in 18.5 overs)</td>
                          </tr>
                          <tr>
                             <td className="p-2 text-slate-500">At IPL Standard (6.00 RPO)</td>
                             <td className="p-2 text-right font-bold text-slate-800">194 (Need 3 runs in last over)</td>
                          </tr>
                          <tr>
                             <td className="p-2 text-slate-500">At Power Hitting (12.00 RPO)</td>
                             <td className="p-2 text-right font-bold text-emerald-600">208 (Win with 6 balls to spare)</td>
                          </tr>
                       </tbody>
                    </table>
                 </div>
              </div>
           )}
        </div>
      </div>

      {/* ========================================================
          Tabs & Content Section
          ======================================================== */}
      <div className="flex bg-slate-150 p-1.5 rounded-2xl mb-6 overflow-x-auto scrollbar-hide shadow-inner border border-slate-200">
        <button 
          onClick={() => setActiveTab('standings')}
          className={`flex-1 min-w-[90px] py-3 px-4 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'standings' ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <List size={16} /> Standings / Points
        </button>
        <button 
          onClick={() => setActiveTab('fixtures')}
          className={`flex-1 min-w-[90px] py-3 px-4 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'fixtures' ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Calendar size={16} /> Fixtures
        </button>
        <button 
          onClick={() => setActiveTab('stats')}
          className={`flex-1 min-w-[90px] py-3 px-4 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'stats' ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <BarChart3 size={16} /> Tournament Stats
        </button>
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        {activeTab === 'standings' && (
          <div className="space-y-6">
             {/* Live & Recent Match Dashboard Widgets */}
             {(liveMatch || recentMatch) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                   {liveMatch && (
                      <Link href={`/match/${liveMatch.id}`} className="block relative group overflow-hidden rounded-3xl p-6 border border-red-200 bg-white hover:shadow-lg hover:-translate-y-1 transition-all shadow-sm">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-400"></div>
                        <div className="flex justify-between items-center mb-4">
                           <span className="bg-red-50 text-red-650 border border-red-200 px-3 py-1 rounded-full text-[10px] font-black tracking-widest flex items-center gap-2 uppercase shadow-sm">
                             <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> LIVE
                           </span>
                           {liveMatch.stage && <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-150">{liveMatch.stage}</span>}
                        </div>
                        
                        <div className="flex justify-between items-center mb-4">
                           <div className="flex items-center gap-3 w-5/12">
                             <div className="w-12 h-12 rounded-full bg-slate-50 shadow-sm flex flex-shrink-0 items-center justify-center overflow-hidden border border-slate-150">
                               {getTeamDetails(liveMatch.teamA).logoUrl ? <img src={getTeamDetails(liveMatch.teamA).logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-slate-400">{getTeamDetails(liveMatch.teamA).shortName}</span>}
                             </div>
                             <span className="font-black text-slate-800 text-lg truncate">{getTeamDetails(liveMatch.teamA).shortName}</span>
                           </div>
                           <div className="w-2/12 text-center text-xs font-black text-slate-400 italic bg-slate-50 rounded-full py-1">VS</div>
                           <div className="flex flex-row-reverse items-center gap-3 w-5/12">
                             <div className="w-12 h-12 rounded-full bg-slate-50 shadow-sm flex flex-shrink-0 items-center justify-center overflow-hidden border border-slate-150">
                               {getTeamDetails(liveMatch.teamB).logoUrl ? <img src={getTeamDetails(liveMatch.teamB).logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-slate-400">{getTeamDetails(liveMatch.teamB).shortName}</span>}
                             </div>
                             <span className="font-black text-slate-800 text-lg truncate">{getTeamDetails(liveMatch.teamB).shortName}</span>
                           </div>
                        </div>

                        {/* Live Score Block */}
                        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex justify-between items-center relative overflow-hidden">
                           <div>
                              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-1">{getTeamDetails(liveMatch.score[`innings${liveMatch.currentInnings}`]?.team).name} Batting</p>
                              <div className="flex items-end gap-2">
                                <h3 className="text-4xl font-black text-slate-900 leading-none tracking-tighter">
                                  {liveMatch.score[`innings${liveMatch.currentInnings}`]?.runs}<span className="text-2xl text-slate-400 font-bold">/{liveMatch.score[`innings${liveMatch.currentInnings}`]?.wickets}</span>
                                </h3>
                                <p className="text-sm font-bold text-slate-500 mb-1">({(liveMatch.score[`innings${liveMatch.currentInnings}`]?.overs || 0).toFixed(1)})</p>
                              </div>
                           </div>
                           <div className="text-right flex flex-col justify-end">
                              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">CRR</p>
                              <p className="text-xl font-black text-blue-700">
                                {liveMatch.score[`innings${liveMatch.currentInnings}`]?.runs > 0 ? (liveMatch.score[`innings${liveMatch.currentInnings}`]?.runs / (Math.floor(liveMatch.score[`innings${liveMatch.currentInnings}`]?.overs || 0) + (((liveMatch.score[`innings${liveMatch.currentInnings}`]?.overs || 0) % 1) * 10 / 6))).toFixed(2) : '0.00'}
                              </p>
                           </div>
                        </div>
                      </Link>
                   )}

                   {recentMatch && (
                      <Link href={`/match/${recentMatch.id}`} className="block relative group overflow-hidden rounded-3xl p-6 border border-slate-205 bg-white hover:shadow-lg hover:-translate-y-1 transition-all shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full border border-slate-200/50">Recent Match</span>
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(recentMatch.createdAt).toLocaleDateString()}</span>
                        </div>
                        
                        <div className="space-y-4">
                           <div className="flex justify-between items-center bg-slate-50 border border-slate-150 rounded-xl p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center overflow-hidden border border-slate-200">
                                  {getTeamDetails(recentMatch.teamA).logoUrl ? <img src={getTeamDetails(recentMatch.teamA).logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <Shield size={14} className="text-slate-400"/>}
                                </div>
                                <span className="font-bold text-slate-800">{getTeamDetails(recentMatch.teamA).shortName}</span>
                              </div>
                              <div className="font-black text-lg text-slate-900">
                                {recentMatch.score?.innings1?.team === recentMatch.teamA ? `${recentMatch.score?.innings1?.runs}/${recentMatch.score?.innings1?.wickets}` : `${recentMatch.score?.innings2?.runs}/${recentMatch.score?.innings2?.wickets}`}
                              </div>
                           </div>
                           
                           <div className="flex justify-between items-center bg-slate-50 border border-slate-150 rounded-xl p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center overflow-hidden border border-slate-200">
                                  {getTeamDetails(recentMatch.teamB).logoUrl ? <img src={getTeamDetails(recentMatch.teamB).logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <Shield size={14} className="text-slate-400"/>}
                                </div>
                                <span className="font-bold text-slate-800">{getTeamDetails(recentMatch.teamB).shortName}</span>
                              </div>
                              <div className="font-black text-lg text-slate-900">
                                {recentMatch.score?.innings1?.team === recentMatch.teamB ? `${recentMatch.score?.innings1?.runs}/${recentMatch.score?.innings1?.wickets}` : `${recentMatch.score?.innings2?.runs}/${recentMatch.score?.innings2?.wickets}`}
                              </div>
                           </div>
                        </div>

                        <div className="mt-4 text-center">
                           <p className="text-[11px] font-black text-green-750 bg-green-50 inline-block px-3 py-1 rounded-full border border-green-150 uppercase tracking-wider">{recentMatch.result?.margin}</p>
                           {getMatchMVP(recentMatch) && (
                              <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest">MVP: <span className="text-amber-600 font-bold">{getMatchMVP(recentMatch).name}</span></p>
                           )}
                        </div>
                      </Link>
                   )}
                </div>
             )}

             {/* Tournament Leaders Widgets (IPL Style) */}
             <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="glass-card bg-white rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden border border-orange-200 shadow-sm hover:-translate-y-1 transition-all">
                   <div className="absolute top-0 right-0 p-2 opacity-[0.08] text-orange-500">
                     <Medal size={64} />
                   </div>
                   <div className="relative z-10">
                     <p className="text-[9px] md:text-xs font-black text-orange-650 bg-orange-50 inline-block px-2.5 py-0.5 rounded uppercase tracking-widest mb-1 border border-orange-100">Orange Cap</p>
                     <p className="text-sm md:text-xl font-bold text-slate-800 truncate mt-1">{orangeLeader ? orangeLeader.name : 'N/A'}</p>
                     <p className="text-[10px] md:text-xs text-slate-400 font-semibold">{orangeLeader ? getTeamDetails(orangeLeader.teamId).shortName : '-'}</p>
                   </div>
                   <div className="relative z-10 mt-3 flex items-end justify-between border-t border-slate-50 pt-2">
                     <span className="text-[10px] text-slate-400 font-black uppercase">Runs</span>
                     <span className="text-xl md:text-3xl font-black text-slate-900">{orangeLeader ? orangeLeader.runs : 0}</span>
                   </div>
                </div>
                <div className="glass-card bg-white rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden border border-purple-200 shadow-sm hover:-translate-y-1 transition-all">
                   <div className="absolute top-0 right-0 p-2 opacity-[0.08] text-purple-650">
                     <Medal size={64} />
                   </div>
                   <div className="relative z-10">
                     <p className="text-[9px] md:text-xs font-black text-purple-600 bg-purple-50 inline-block px-2.5 py-0.5 rounded uppercase tracking-widest mb-1 border border-purple-100">Purple Cap</p>
                     <p className="text-sm md:text-xl font-bold text-slate-800 truncate mt-1">{purpleLeader ? purpleLeader.name : 'N/A'}</p>
                     <p className="text-[10px] md:text-xs text-slate-400 font-semibold">{purpleLeader ? getTeamDetails(purpleLeader.teamId).shortName : '-'}</p>
                   </div>
                   <div className="relative z-10 mt-3 flex items-end justify-between border-t border-slate-50 pt-2">
                     <span className="text-[10px] text-slate-400 font-black uppercase">Wickets</span>
                     <span className="text-xl md:text-3xl font-black text-slate-900">{purpleLeader ? purpleLeader.wickets : 0}</span>
                   </div>
                </div>
             </div>

              <div className="glass bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200/80">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80">
                        <th className="p-3 md:p-4 text-[9px] md:text-xs font-black text-slate-450 uppercase tracking-widest">Team</th>
                        <th className="p-2 md:p-4 text-[9px] md:text-xs font-black text-slate-450 uppercase tracking-widest text-center">P</th>
                        <th className="p-2 md:p-4 text-[9px] md:text-xs font-black text-slate-450 uppercase tracking-widest text-center">W</th>
                        <th className="p-2 md:p-4 text-[9px] md:text-xs font-black text-slate-450 uppercase tracking-widest text-center">L</th>
                        <th className="p-2 md:p-4 text-[9px] md:text-xs font-black text-slate-450 uppercase tracking-widest text-center hidden sm:table-cell">T</th>
                        <th className="p-2 md:p-4 text-[9px] md:text-xs font-black text-slate-450 uppercase tracking-widest text-center">NRR</th>
                        <th className="p-3 md:p-4 text-[10px] md:text-xs font-black text-blue-700 uppercase tracking-widest text-center bg-blue-50/50">PTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pointsTable.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="p-8 text-center text-slate-400 font-bold">No matches played yet in this league.</td>
                        </tr>
                      ) : (
                        pointsTable.map((row, index) => {
                          const team = getTeamDetails(row.id);
                          return (
                            <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                              <td className="p-3 md:p-4 flex items-center gap-2 md:gap-3">
                                 <div className="w-3 md:w-6 text-slate-400 font-black text-[10px] md:text-sm text-center">{index + 1}</div>
                                 <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-slate-100 shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                   {team.logoUrl ? (
                                      <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                                   ) : (
                                      <Shield size={10} className="text-slate-400" />
                                   )}
                                 </div>
                                 <span className="font-bold text-slate-800 whitespace-nowrap text-xs md:text-base">{team.shortName} <span className="hidden lg:inline text-slate-400 ml-1 font-semibold text-xs">({team.name})</span></span>
                              </td>
                              <td className="p-2 md:p-4 text-center font-bold text-slate-650 text-xs md:text-base">{row.played}</td>
                              <td className="p-2 md:p-4 text-center font-bold text-green-600 text-xs md:text-base">{row.won}</td>
                              <td className="p-2 md:p-4 text-center font-bold text-red-500 text-xs md:text-base">{row.lost}</td>
                              <td className="p-2 md:p-4 text-center font-bold text-slate-400 text-xs md:text-base hidden sm:table-cell">{row.tied}</td>
                              <td className="p-2 md:p-4 text-center font-bold text-slate-650 text-[10px] md:text-sm whitespace-nowrap">
                                {row.nrr > 0 ? '+' : ''}{row.nrr.toFixed(3)}
                              </td>
                              <td className="p-3 md:p-4 text-center font-black text-blue-700 text-sm md:text-lg bg-blue-50/50">{row.points}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
          </div>
        )}

        {activeTab === 'fixtures' && (
          <div className="space-y-4">
             {matches.length === 0 ? (
                <div className="glass bg-white p-8 md:p-12 rounded-2xl text-center border border-slate-200/80 shadow-sm">
                  <Calendar size={40} className="mx-auto text-slate-400 mb-4" />
                  <h3 className="text-lg md:text-xl font-bold text-slate-400">No Fixtures Scheduled</h3>
                </div>
             ) : (
                matches.map(m => {
                  const tA = getTeamDetails(m.teamA);
                  const tB = getTeamDetails(m.teamB);
                  const stageColor = m.stage === 'Final' ? 'text-yellow-600 bg-yellow-50 border-yellow-250' : m.stage?.includes('Final') ? 'text-purple-650 bg-purple-50 border-purple-250' : 'text-blue-750 bg-blue-50 border-blue-200';
                  const mvp = getMatchMVP(m);
                  
                  return (
                    <Link href={`/match/${m.id}`} key={m.id} className="block">
                      <div className="glass-card bg-white rounded-2xl p-4 md:p-6 hover:shadow hover:-translate-y-1 transition-all relative overflow-hidden group border border-slate-200/80">
                         <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                                m.status === 'live' ? 'bg-red-50 text-red-650 border-red-150 shadow-sm' :
                                m.status === 'completed' ? 'bg-green-50 text-green-600 border-green-200' :
                                'bg-slate-100 text-slate-500 border-slate-205'
                              }`}>
                                {m.status === 'live' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-1.5 align-middle"></span>}
                                {m.status}
                              </span>
                              {m.stage && (
                                 <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${stageColor}`}>
                                   {m.stage}
                                 </span>
                              )}
                            </div>
                            <span className="text-[10px] md:text-xs text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded-lg border border-slate-150">{new Date(m.createdAt).toLocaleDateString()}</span>
                         </div>
                         
                         <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-150">
                            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 w-1/3 md:w-auto">
                              <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-white shadow-sm flex flex-shrink-0 items-center justify-center overflow-hidden border border-slate-200">
                                {tA.logoUrl ? <img src={tA.logoUrl} alt={tA.name} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-slate-400">{tA.shortName}</span>}
                              </div>
                              <span className="font-black text-slate-800 text-sm md:text-xl text-center">{tA.shortName}</span>
                            </div>
                            
                            <div className="text-center px-2 md:px-4 w-1/3 md:w-auto">
                              <div className="text-[10px] md:text-xs font-black text-slate-400 italic uppercase bg-white px-2.5 py-1 rounded-full shadow-sm border border-slate-150">VS</div>
                            </div>
                            
                            <div className="flex flex-col-reverse md:flex-row items-center gap-2 md:gap-3 w-1/3 md:w-auto">
                              <span className="font-black text-slate-800 text-sm md:text-xl text-center">{tB.shortName}</span>
                              <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-white shadow-sm flex flex-shrink-0 items-center justify-center overflow-hidden border border-slate-200">
                                {tB.logoUrl ? <img src={tB.logoUrl} alt={tB.name} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-slate-400">{tB.shortName}</span>}
                              </div>
                            </div>
                         </div>

                         {m.status === 'completed' && m.result && (
                            <div className="mt-4 pt-3 border-t border-slate-100 text-center flex flex-col items-center gap-2">
                               <p className="text-[10px] md:text-xs font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-150 uppercase tracking-wider">{m.result.margin}</p>
                               {mvp && (
                                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-50 border border-yellow-200 rounded-full shadow-sm">
                                     <Star size={12} className="text-yellow-500 fill-yellow-500 animate-spin-slow" />
                                     <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest">MVP:</span>
                                     <span className="text-[10px] font-black text-slate-800">{mvp.name}</span>
                                  </div>
                               )}
                            </div>
                         )}
                      </div>
                    </Link>
                  );
                })
             )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-4">
             {/* Sub-tabs for stats */}
             <div className="flex bg-slate-100 border border-slate-200/60 p-1.5 rounded-xl mb-4 text-sm shadow-inner max-w-md mx-auto">
                <button 
                  onClick={() => setStatsTab('orange')}
                  className={`flex-1 py-2 font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${statsTab === 'orange' ? 'bg-orange-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Medal size={16} /> <span>Orange Cap</span>
                </button>
                <button 
                  onClick={() => setStatsTab('purple')}
                  className={`flex-1 py-2 font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${statsTab === 'purple' ? 'bg-purple-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Medal size={16} /> <span>Purple Cap</span>
                </button>
                <button 
                  onClick={() => setStatsTab('mvp')}
                  className={`flex-1 py-2 font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${statsTab === 'mvp' ? 'bg-yellow-500 text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Star size={16} /> <span>MVP</span>
                </button>
             </div>

             {/* Stat List */}
             <div className="glass-card bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
                {statsTab === 'orange' && (
                  playerStats.orangeCap.length === 0 ? <p className="p-8 text-center text-slate-400 font-bold">No Cap statistics calculated yet.</p> :
                  <ul className="divide-y divide-slate-100">
                    {playerStats.orangeCap.map((p, i) => (
                      <li key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <span className={`font-black text-lg w-6 text-center ${i === 0 ? 'text-orange-500 text-2xl' : 'text-slate-400'}`}>{i + 1}</span>
                          <div>
                            <p className="font-bold text-slate-800 text-sm md:text-base">{p.name}</p>
                            <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">{getTeamDetails(p.teamId).shortName}</p>
                          </div>
                        </div>
                        <div className="text-base md:text-lg font-black text-orange-650 bg-orange-50 border border-orange-100 px-3 py-1 rounded-lg shadow-sm">{p.runs} runs</div>
                      </li>
                    ))}
                  </ul>
                )}
                {statsTab === 'purple' && (
                  playerStats.purpleCap.length === 0 ? <p className="p-8 text-center text-slate-400 font-bold">No Cap statistics calculated yet.</p> :
                  <ul className="divide-y divide-slate-100">
                    {playerStats.purpleCap.map((p, i) => (
                      <li key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <span className={`font-black text-lg w-6 text-center ${i === 0 ? 'text-purple-500 text-2xl' : 'text-slate-400'}`}>{i + 1}</span>
                          <div>
                            <p className="font-bold text-slate-800 text-sm md:text-base">{p.name}</p>
                            <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">{getTeamDetails(p.teamId).shortName}</p>
                          </div>
                        </div>
                        <div className="text-base md:text-lg font-black text-purple-650 bg-purple-50 border border-purple-100 px-3 py-1 rounded-lg shadow-sm">{p.wickets} wkts</div>
                      </li>
                    ))}
                  </ul>
                )}
                {statsTab === 'mvp' && (
                  playerStats.mvp.length === 0 ? <p className="p-8 text-center text-slate-400 font-bold">No Cap statistics calculated yet.</p> :
                  <ul className="divide-y divide-slate-100">
                    {playerStats.mvp.map((p, i) => (
                      <li key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <span className={`font-black text-lg w-6 text-center ${i === 0 ? 'text-yellow-600 text-2xl' : 'text-slate-400'}`}>{i + 1}</span>
                          <div>
                            <p className="font-bold text-slate-800 text-sm md:text-base">{p.name}</p>
                            <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">{getTeamDetails(p.teamId).shortName}</p>
                          </div>
                        </div>
                        <div className="text-base md:text-lg font-black text-yellow-650 bg-yellow-50 border border-yellow-100 px-3 py-1 rounded-lg shadow-sm">{p.mvpPoints} <span className="text-[9px] text-yellow-600 uppercase tracking-widest font-black">pts</span></div>
                      </li>
                    ))}
                  </ul>
                )}
             </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
