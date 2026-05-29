"use client";
import { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Calendar, List, ArrowLeft, Shield, BarChart3, Medal, Star, Play, Award, ChevronRight, TrendingUp, Zap, ChevronUp, ChevronDown } from 'lucide-react';\nimport { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { ref, onValue, get } from 'firebase/database';

export default function TournamentPage({ params: paramsPromise }) {
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
  const [predictorWinPercent, setPredictorWinPercent] = useState(64); // Live probability

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-emerald-500/25 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-slate-50">
        <Trophy size={64} className="text-slate-300 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800">Tournament Not Found</h1>
        <Link href="/" className="text-emerald-600 mt-4 hover:underline font-bold">Go Home</Link>
      </div>
    );
  }

  const orangeLeader = playerStats.orangeCap[0];
  const purpleLeader = playerStats.purpleCap[0];
  const liveMatch = matches.find(m => m.status === 'live');
  const recentMatch = matches.find(m => m.status === 'completed');

  // Selected Match for Live Analytics
  const [selectedMatchId, setSelectedMatchId] = useState(null);

  useEffect(() => {
    if (matches.length > 0) {
      const live = matches.find(m => m.status === 'live');
      if (live) {
        setSelectedMatchId(live.id);
      } else {
        const completed = matches.find(m => m.status === 'completed' && m.score);
        if (completed) {
          setSelectedMatchId(completed.id);
        } else {
          setSelectedMatchId(matches[0].id);
        }
      }
    } else {
      setSelectedMatchId(null);
    }
  }, [matches]);

  const selectedMatch = matches.find(m => m.id === selectedMatchId);

  const parseMatchAnalytics = (m) => {
    if (!m || !m.score || !m.score.innings1) return null;
    
    const maxOvers = m.overs || 20;
    
    // Sort balls chronologically (oldest first)
    let rawBalls = [];
    if (m.balls) {
      rawBalls = Object.entries(m.balls)
        .map(([id, val]) => ({ id, ...val }))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
    
    const parseInnings = (innNum, teamId) => {
      const innBalls = rawBalls.filter(b => b.innings === innNum);
      const runsPerOver = Array.from({ length: maxOvers }, () => 0);
      const wicketsPerOver = [];
      
      let runningRuns = 0;
      let wktCount = 0;
      const cumRuns = [];
      const overLabels = [];
      
      innBalls.forEach(ball => {
        const overIndex = Math.floor(ball.over);
        if (overIndex >= 0 && overIndex < maxOvers) {
          let r = ball.runs || 0;
          if (ball.type === 'wd' || ball.type === 'nb') {
            r += 1;
          }
          runsPerOver[overIndex] += r;
        }
        
        let ballR = ball.runs || 0;
        if (ball.type === 'wd' || ball.type === 'nb') ballR += 1;
        runningRuns += ballR;

        if (ball.type === 'wicket') {
          wktCount += 1;
          wicketsPerOver.push({ over: ball.over, runsAtWicket: runningRuns });
        }
      });
      
      let currentSum = 0;
      for (let o = 0; o < maxOvers; o++) {
        currentSum += runsPerOver[o];
        cumRuns.push(currentSum);
        overLabels.push(o + 1);
      }
      
      return {
        teamId,
        teamName: getTeamDetails(teamId).shortName,
        runsPerOver,
        cumRuns,
        wicketsPerOver,
        totalRuns: m.score[`innings${innNum}`]?.runs ?? currentSum,
        totalWickets: m.score[`innings${innNum}`]?.wickets ?? wktCount,
        oversPlayed: m.score[`innings${innNum}`]?.overs ?? 0,
      };
    };
    
    const inn1TeamId = m.score.innings1.team || m.teamA;
    const inn2TeamId = m.score.innings2?.team || m.teamB;
    
    const inn1 = parseInnings(1, inn1TeamId);
    const inn2 = parseInnings(2, inn2TeamId);
    
    return { inn1, inn2 };
  };

  const analyticsData = parseMatchAnalytics(selectedMatch);

  const calculateWinProbability = (m, data) => {
    if (!m || !data) return { teamA: 50, teamB: 50 };
    
    const { inn1, inn2 } = data;
    
    if (m.status === 'completed') {
      if (m.result?.winner === m.teamA) return { teamA: 100, teamB: 0 };
      if (m.result?.winner === m.teamB) return { teamA: 0, teamB: 100 };
      return { teamA: 50, teamB: 50 };
    }
    
    if (m.currentInnings === 1) {
      const runs = inn1.totalRuns;
      const wickets = inn1.totalWickets;
      const overs = inn1.oversPlayed;
      
      if (overs === 0) return { teamA: 50, teamB: 50 };
      
      const crr = runs / overs;
      const projected = crr * m.overs;
      
      let p = 50 + (projected - 140) * 0.25;
      p = Math.max(15, Math.min(85, p));
      p -= wickets * 3.5;
      p = Math.max(10, Math.min(90, p));
      
      const teamAPercent = Math.round(p);
      return { teamA: teamAPercent, teamB: 100 - teamAPercent };
    } else {
      const target = inn1.totalRuns + 1;
      const runs = inn2.totalRuns;
      const wickets = inn2.totalWickets;
      const overs = inn2.oversPlayed;
      
      const maxBalls = m.overs * 6;
      const ballsBowled = Math.floor(overs) * 6 + Math.round((overs % 1) * 10);
      const ballsRemaining = Math.max(0, maxBalls - ballsBowled);
      const runsNeeded = Math.max(0, target - runs);
      
      if (runsNeeded === 0) return { teamA: 0, teamB: 100 };
      if (ballsRemaining === 0) return { teamA: 100, teamB: 0 };
      
      const rrr = runsNeeded / (ballsRemaining / 6);
      const crr = runs / (overs > 0 ? overs : 1);
      
      let p = 50;
      p += (crr - rrr) * 8;
      p -= wickets * 8;
      p = Math.max(5, Math.min(95, p));
      
      const teamBPercent = Math.round(p);
      return { teamA: 100 - teamBPercent, teamB: teamBPercent };
    }
  };

  const prob = calculateWinProbability(selectedMatch, analyticsData);

  // ═══════════════════════════════════════════════════════
  // TRANSFORM REAL DATA FOR NEW UI
  // ═══════════════════════════════════════════════════════

  // Transform points table
  const mappedPointsTable = pointsTable.map((row, index) => {
    const team = getTeamDetails(row.id);
    // Assign mock colors if team colors don't exist
    const colors = ['#E4002B', '#FCCA06', '#004BA0', '#1C1C2B', '#3A225D', '#F26522', '#2ecc71', '#9b59b6'];
    const color = colors[index % colors.length];
    return {
      rank: index + 1,
      code: team.shortName,
      name: team.name,
      p: row.played,
      w: row.won,
      l: row.lost,
      t: row.tied,
      nrr: (row.nrr > 0 ? '+' : '') + row.nrr.toFixed(3),
      pts: row.points,
      color: color,
      logoUrl: team.logoUrl
    };
  });

  // Transform WORM_DATA if analyticsData is available
  let WORM_DATA = [];
  if (analyticsData) {
     const maxOvers = selectedMatch?.overs || 20;
     for(let o=1; o<=maxOvers; o++) {
        let entry = { over: o };
        if (o <= Math.ceil(analyticsData.inn1.oversPlayed)) {
           entry[analyticsData.inn1.teamName] = analyticsData.inn1.cumRuns[o-1] || 0;
        }
        if (selectedMatch?.currentInnings === 2 && o <= Math.ceil(analyticsData.inn2.oversPlayed)) {
           entry[analyticsData.inn2.teamName] = analyticsData.inn2.cumRuns[o-1] || 0;
        }
        WORM_DATA.push(entry);
     }
  }

  // Transform Fixtures
  const mappedFixtures = matches.map(m => {
     const tA = getTeamDetails(m.teamA);
     const tB = getTeamDetails(m.teamB);
     return {
        id: m.id,
        teamA: tA.shortName,
        teamB: tB.shortName,
        teamALogo: tA.logoUrl,
        teamBLogo: tB.logoUrl,
        date: new Date(m.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        time: new Date(m.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        venue: m.matchName || m.stage || 'Group Stage',
        status: m.status,
        result: m.result?.margin
     };
  });

  // Calculate Win Prob
  const teamAProb = selectedMatch ? (selectedMatch.currentInnings === 1 || selectedMatch.status === 'completed' ? prob.teamA : prob.teamA) : 50;
  const teamBProb = 100 - teamAProb;

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800/95 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 shadow-xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Over {label}</p>
          {payload.map((entry, i) => (
            <p key={i} className="text-xs font-bold" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const circumference = 2 * Math.PI * 40;
  const strokeA = (teamAProb / 100) * circumference;

  const [chartOpen, setChartOpen] = useState(false);

  const tabs = [
    { id: 'standings', label: 'Points Table' },
    { id: 'fixtures', label: 'Fixtures' },
    { id: 'stats', label: 'Cap Leaders' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white relative overflow-hidden font-sans">
      {/* Background Glow Effects */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-[100px] pointer-events-none"></div>

      {/* ──────────────────── HEADER ──────────────────── */}
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto max-w-6xl px-4 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-black text-xs">SL</span>
            </div>
            <span className="text-lg font-black tracking-tight">
              Stumpflow <span className="text-blue-400">Live</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors">Home</Link>
            <Link href="/matches" className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors">Matches</Link>
            <Link href="/tournaments" className="text-xs font-bold uppercase tracking-wider text-blue-400 transition-colors">Tournaments</Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto max-w-6xl px-4 py-6 md:py-8 space-y-6 md:space-y-8 relative z-10">

        <Link href="/tournaments" className="inline-flex items-center gap-2 text-slate-400 hover:text-white font-bold text-sm transition-all">
          <ArrowLeft size={16} /> Back to Tournaments
        </Link>

        {/* ──────────────────── TOURNAMENT BANNER ──────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Trophy size={22} className="text-amber-400" />
          </div>
          <div>
            <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-1 ${tournament.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-slate-400'}`}>
              {tournament.status}
            </span>
            <h1 className="text-2xl font-black tracking-tight">{tournament.name}</h1>
          </div>
        </motion.div>

        {/* ──────────────────── LIVE MATCH CARD ──────────────────── */}
        {selectedMatch ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden"
        >
          {/* Match Header */}
          <div className="flex justify-between items-center px-5 pt-4 pb-2 border-b border-white/5 mb-2">
            <div className="flex items-center gap-2">
              <span className={`relative flex h-2.5 w-2.5 ${selectedMatch.status === 'live' ? '' : 'hidden'}`}>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className={`text-[10px] font-black uppercase tracking-widest ${selectedMatch.status === 'live' ? 'text-emerald-400' : 'text-slate-400'}`}>
                {selectedMatch.status === 'live' ? 'Live Analytics' : 'Match Result'}
              </span>
            </div>
            
            {matches.length > 1 && (
              <select
                value={selectedMatchId || ''}
                onChange={(e) => setSelectedMatchId(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-300 focus:outline-none focus:border-white/20"
              >
                {matches.map(m => (
                  <option key={m.id} value={m.id} className="bg-slate-800 text-white">
                    {m.status === 'live' ? '🔴 LIVE: ' : m.status === 'completed' ? '🏁 ' : '🗓 '}{getTeamDetails(m.teamA).shortName} vs {getTeamDetails(m.teamB).shortName}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Score Section */}
          <div className="px-5 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Teams & Score */}
            <div className="flex items-center gap-6 md:gap-10 flex-1">
              
              {/* Team A */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center overflow-hidden">
                  {getTeamDetails(selectedMatch.teamA).logoUrl ? (
                    <img src={getTeamDetails(selectedMatch.teamA).logoUrl} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-black text-blue-400">{getTeamDetails(selectedMatch.teamA).shortName}</span>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold mb-0.5">{getTeamDetails(selectedMatch.teamA).shortName}</p>
                  {(analyticsData?.inn1?.teamId === selectedMatch.teamA || analyticsData?.inn2?.teamId === selectedMatch.teamA) ? (
                    (() => {
                      const inn = analyticsData.inn1.teamId === selectedMatch.teamA ? analyticsData.inn1 : analyticsData.inn2;
                      return (
                        <>
                          <h2 className="text-3xl font-black tabular-nums leading-none">{inn.totalRuns}<span className="text-xl text-slate-500">/{inn.totalWickets}</span></h2>
                          <p className="text-[10px] text-slate-400 font-bold mt-1">{(inn.oversPlayed || 0).toFixed(1)} Overs</p>
                        </>
                      )
                    })()
                  ) : (
                    <h2 className="text-xl font-bold text-slate-500">Yet to bat</h2>
                  )}
                </div>
              </div>

              {/* VS */}
              <div className="px-3">
                <span className="text-xs font-black text-slate-600 italic uppercase">VS</span>
              </div>

              {/* Team B */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center overflow-hidden">
                  {getTeamDetails(selectedMatch.teamB).logoUrl ? (
                    <img src={getTeamDetails(selectedMatch.teamB).logoUrl} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-black text-emerald-400">{getTeamDetails(selectedMatch.teamB).shortName}</span>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold mb-0.5">{getTeamDetails(selectedMatch.teamB).shortName}</p>
                  {(analyticsData?.inn1?.teamId === selectedMatch.teamB || analyticsData?.inn2?.teamId === selectedMatch.teamB) ? (
                    (() => {
                      const inn = analyticsData.inn1.teamId === selectedMatch.teamB ? analyticsData.inn1 : analyticsData.inn2;
                      return (
                        <>
                          <h2 className="text-3xl font-black tabular-nums leading-none">{inn.totalRuns}<span className="text-xl text-slate-500">/{inn.totalWickets}</span></h2>
                          <p className="text-[10px] text-slate-400 font-bold mt-1">{(inn.oversPlayed || 0).toFixed(1)} Overs</p>
                        </>
                      )
                    })()
                  ) : (
                    <h2 className="text-xl font-bold text-slate-500">Yet to bat</h2>
                  )}
                </div>
              </div>
            </div>

            {/* Win Predictor */}
            {analyticsData && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Win Predictor</p>
                <div className="relative w-24 h-24">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(239,68,68,0.3)" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke="#3b82f6"
                      strokeWidth="8"
                      strokeDasharray={`${strokeA} ${circumference}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-black text-white tabular-nums">{teamAProb}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> {getTeamDetails(selectedMatch.teamA).shortName}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/60"></span> {getTeamDetails(selectedMatch.teamB).shortName}</span>
                </div>
              </div>
            )}
          </div>

          {/* Status Strip */}
          <div className="px-5 pb-3 pt-2 border-t border-white/5 bg-white/5 flex flex-col md:flex-row items-center gap-6 text-[10px] font-bold uppercase tracking-wider text-slate-400">
             <span className="text-blue-400">
               {selectedMatch.status === 'completed' ? `Result: ${selectedMatch.result?.margin || 'Match Completed'}` : 
                selectedMatch.currentInnings === 2 ? `Target: ${analyticsData?.inn1?.totalRuns + 1} • Need ${Math.max(0, analyticsData?.inn1?.totalRuns + 1 - analyticsData?.inn2?.totalRuns)} runs from ${Math.max(0, selectedMatch.overs * 6 - (Math.floor(analyticsData?.inn2?.oversPlayed)*6 + Math.round((analyticsData?.inn2?.oversPlayed%1)*10)))} balls` :
                `First Innings • Projected: ${Math.round((analyticsData?.inn1?.totalRuns / (analyticsData?.inn1?.oversPlayed > 0 ? analyticsData?.inn1?.oversPlayed : 1)) * selectedMatch.overs)} runs`}
             </span>
          </div>

          {/* Worm Chart Accordion */}
          {analyticsData && (
          <div className="border-t border-white/5">
            <button
              onClick={() => setChartOpen(!chartOpen)}
              className="w-full flex items-center justify-between px-5 py-3 text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2">
                <TrendingUp size={14} /> Cumulative Runs Comparison (Worm Chart)
              </span>
              {chartOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            <AnimatePresence>
              {chartOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden bg-black/20"
                >
                  <div className="px-5 pb-5 pt-3">
                    <div className="h-56 md:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={WORM_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gradRCB" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradCSK" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="over" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
                          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend
                            verticalAlign="top"
                            height={30}
                            formatter={(value) => <span className="text-xs font-bold text-slate-300">{value}</span>}
                          />
                          <Area type="monotone" dataKey={analyticsData.inn1.teamName} stroke="#3b82f6" fillOpacity={1} fill="url(#gradRCB)" strokeWidth={2.5} dot={false} />
                          {selectedMatch.currentInnings === 2 && (
                             <Area type="monotone" dataKey={analyticsData.inn2.teamName} stroke="#10b981" fillOpacity={1} fill="url(#gradCSK)" strokeWidth={2.5} dot={false} />
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          )}
        </motion.div>
        ) : (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-8 text-center">
            <p className="text-slate-400 font-bold">No matches scheduled yet.</p>
          </div>
        )}

        {/* ──────────────────── TOURNAMENT HUB TABS ──────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Tab Switcher */}
          <div className="flex gap-0 border-b border-white/10 mb-5 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-5 py-3 text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="dashTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >

              {/* ═══ POINTS TABLE ═══ */}
              {activeTab === 'standings' && (
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-x-auto">
                  <div className="min-w-[600px]">
                    {/* Table Header */}
                    <div className="grid grid-cols-[minmax(160px,2fr)_repeat(6,1fr)] gap-0 px-4 py-3 bg-white/5 border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <span>Team</span>
                      <span className="text-center">P</span>
                      <span className="text-center">W</span>
                      <span className="text-center">L</span>
                      <span className="text-center">T</span>
                      <span className="text-center">NRR</span>
                      <span className="text-center">PTS</span>
                    </div>

                    {/* Table Rows */}
                    {mappedPointsTable.length === 0 ? (
                       <div className="p-8 text-center text-slate-400 font-bold">No matches played yet.</div>
                    ) : (
                      mappedPointsTable.map((team, i) => (
                        <div
                          key={team.code}
                          className={`grid grid-cols-[minmax(160px,2fr)_repeat(6,1fr)] gap-0 px-4 py-3 border-b border-white/5 items-center transition-colors hover:bg-white/5 ${
                            i < 4 ? 'border-l-2 border-l-emerald-500/60 bg-emerald-500/5' : 'border-l-2 border-l-transparent'
                          }`}
                        >
                          {/* Team */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border overflow-hidden bg-white/5"
                              style={{ borderColor: team.color + '40' }}
                            >
                              {team.logoUrl ? (
                                <img src={team.logoUrl} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[9px] font-black" style={{ color: team.color }}>
                                  {team.code.substring(0, 2)}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="text-sm font-black text-white block md:inline">{team.code}</span>
                              <span className="text-[10px] text-slate-500 font-medium md:ml-1.5 block md:inline truncate">{team.name}</span>
                            </div>
                          </div>
                          <span className="text-center text-xs font-bold text-slate-300 tabular-nums">{team.p}</span>
                          <span className="text-center text-xs font-bold text-emerald-400 tabular-nums">{team.w}</span>
                          <span className="text-center text-xs font-bold text-red-400 tabular-nums">{team.l}</span>
                          <span className="text-center text-xs font-bold text-slate-500 tabular-nums">{team.t}</span>
                          <span className={`text-center text-xs font-bold tabular-nums ${parseFloat(team.nrr) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {team.nrr}
                          </span>
                          <span className="text-center text-sm font-black text-white tabular-nums">{team.pts}</span>
                        </div>
                      ))
                    )}
                  </div>
                  {/* Qualification Legend */}
                  {mappedPointsTable.length > 0 && (
                    <div className="px-4 py-2.5 flex items-center gap-2 text-[10px] text-slate-500 font-medium bg-black/20">
                      <div className="w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500/40"></div>
                      Playoff Qualification Zone
                    </div>
                  )}
                </div>
              )}

              {/* ═══ FIXTURES ═══ */}
              {activeTab === 'fixtures' && (
                <div className="space-y-3">
                  {mappedFixtures.length === 0 ? (
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-8 text-center text-slate-400 font-bold">No fixtures found.</div>
                  ) : (
                    mappedFixtures.map(fix => (
                      <Link href={`/match/${fix.id}`} key={fix.id} className="block">
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-colors">
                          <div className="flex items-center gap-4 md:gap-6">
                            {/* Team A */}
                            <div className="flex items-center gap-2 md:gap-3">
                              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden">
                                {fix.teamALogo ? <img src={fix.teamALogo} className="w-full h-full object-cover" /> : <span className="text-[9px] font-black text-slate-300">{fix.teamA}</span>}
                              </div>
                              <span className="text-sm md:text-base font-black">{fix.teamA}</span>
                            </div>
                            {/* VS */}
                            <span className="text-[10px] font-bold text-slate-600 uppercase bg-black/30 px-2 py-0.5 rounded">vs</span>
                            {/* Team B */}
                            <div className="flex items-center gap-2 md:gap-3">
                              <span className="text-sm md:text-base font-black">{fix.teamB}</span>
                              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden">
                                {fix.teamBLogo ? <img src={fix.teamBLogo} className="w-full h-full object-cover" /> : <span className="text-[9px] font-black text-slate-300">{fix.teamB}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            {fix.status === 'completed' ? (
                              <>
                                <p className="text-xs md:text-sm font-black text-emerald-400">Completed</p>
                                <p className="text-[9px] md:text-[10px] text-slate-400 font-bold">{fix.result}</p>
                              </>
                            ) : fix.status === 'live' ? (
                              <>
                                <p className="text-xs md:text-sm font-black text-red-400 animate-pulse">LIVE</p>
                                <p className="text-[9px] md:text-[10px] text-slate-400 font-bold">{fix.venue}</p>
                              </>
                            ) : (
                              <>
                                <p className="text-xs md:text-sm font-black text-blue-400 tabular-nums">{fix.time}</p>
                                <p className="text-[10px] text-slate-500 font-bold">{fix.date}</p>
                              </>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              )}

              {/* ═══ CAP LEADERS ═══ */}
              {activeTab === 'stats' && (
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Orange Cap */}
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                        <Star size={20} className="text-orange-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-orange-400">Orange Cap</h3>
                        <p className="text-[10px] text-slate-500 font-medium">Most Runs</p>
                      </div>
                    </div>
                    {orangeLeader ? (
                      <div className="flex items-center gap-4 mt-2">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500/30 to-amber-500/20 border border-orange-500/30 flex items-center justify-center">
                          <span className="text-xl font-black text-orange-400">{orangeLeader.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-lg font-black">{orangeLeader.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{getTeamDetails(orangeLeader.teamId).shortName}</p>
                          <div className="mt-1.5">
                            <span className="text-xl font-black text-orange-400 tabular-nums">{orangeLeader.runs}</span>
                            <span className="text-[10px] text-slate-500 font-bold ml-1 uppercase">Runs</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 font-bold">No stats available</p>
                    )}
                  </div>

                  {/* Purple Cap */}
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <Award size={20} className="text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-purple-400">Purple Cap</h3>
                        <p className="text-[10px] text-slate-500 font-medium">Most Wickets</p>
                      </div>
                    </div>
                    {purpleLeader ? (
                      <div className="flex items-center gap-4 mt-2">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center">
                          <span className="text-xl font-black text-purple-400">{purpleLeader.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-lg font-black">{purpleLeader.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{getTeamDetails(purpleLeader.teamId).shortName}</p>
                          <div className="mt-1.5">
                            <span className="text-xl font-black text-purple-400 tabular-nums">{purpleLeader.wickets}</span>
                            <span className="text-[10px] text-slate-500 font-bold ml-1 uppercase">Wickets</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 font-bold">No stats available</p>
                    )}
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
