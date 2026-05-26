"use client";
import { useState, useEffect, use } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Calendar, List, ArrowLeft, Shield, BarChart3, Medal, Star } from 'lucide-react';
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

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch Tournament details
      const tourneySnap = await get(ref(db, `tournaments/${tournamentId}`));
      if (tourneySnap.exists()) {
        setTournament({ id: tournamentId, ...tourneySnap.val() });
      }

      // 2. Fetch all Teams to resolve names/logos
      const teamsSnap = await get(ref(db, 'teams'));
      const teamsData = teamsSnap.exists() ? teamsSnap.val() : {};
      setTeams(teamsData);

      // 3. Listen to all matches to filter by tournament
      const matchesRef = ref(db, 'matches');
      const unsubscribe = onValue(matchesRef, (snapshot) => {
        if (snapshot.exists()) {
          const allMatches = Object.entries(snapshot.val()).map(([id, val]) => ({ id, ...val }));
          const tMatches = allMatches.filter(m => m.tournamentId === tournamentId);
          
          // Sort matches: newest first for fixtures
          tMatches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setMatches(tMatches);
          
          // Calculate Points Table
          calculatePointsTable(tMatches, teamsData);
          // Calculate Player Stats
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

  const calculatePointsTable = (tMatches, allTeams) => {
    const table = {};

    // Only include League matches for points table if stages exist
    const leagueMatches = tMatches.filter(m => !m.stage || m.stage === 'League');

    // Initialize all teams that have played at least one match in this tournament
    tMatches.forEach(m => {
      if (m.teamA && !table[m.teamA]) table[m.teamA] = { id: m.teamA, played: 0, won: 0, lost: 0, tied: 0, points: 0 };
      if (m.teamB && !table[m.teamB]) table[m.teamB] = { id: m.teamB, played: 0, won: 0, lost: 0, tied: 0, points: 0 };
    });

    // Process completed league matches
    leagueMatches.forEach(m => {
      if (m.status === 'completed' && m.result) {
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
      }
    });

    // Convert to array and sort by Points (descending)
    const sortedTable = Object.values(table).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.won - a.won;
    });

    setPointsTable(sortedTable);
  };

  const calculatePlayerStats = (tMatches) => {
    const players = {}; // id -> { name, teamId, runs, wickets, points }

    tMatches.forEach(m => {
      // Process both innings
      [1, 2].forEach(inningsNum => {
        const innings = m.score?.[`innings${inningsNum}`];
        if (!innings) return;

        // Batting stats
        if (innings.batting) {
          Object.entries(innings.batting).forEach(([playerId, stats]) => {
            if (!players[playerId]) players[playerId] = { id: playerId, name: stats.name, teamId: innings.team, runs: 0, wickets: 0, mvpPoints: 0 };
            players[playerId].runs += (stats.runs || 0);
            players[playerId].mvpPoints += (stats.runs || 0) * 1; // 1 point per run
          });
        }

        // Bowling stats
        if (innings.bowling) {
          const bowlingTeam = inningsNum === 1 ? m.teamB : m.teamA;
          Object.entries(innings.bowling).forEach(([playerId, stats]) => {
            if (!players[playerId]) players[playerId] = { id: playerId, name: stats.name, teamId: bowlingTeam, runs: 0, wickets: 0, mvpPoints: 0 };
            players[playerId].wickets += (stats.wickets || 0);
            players[playerId].mvpPoints += (stats.wickets || 0) * 20; // 20 points per wicket
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

  const getTeamDetails = (id) => {
    return teams[id] || { name: 'Unknown Team', shortName: 'UNK' };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4 text-center">
        <Trophy size={64} className="text-gray-600 mb-4" />
        <h1 className="text-2xl font-bold text-white">Tournament Not Found</h1>
        <Link href="/" className="text-blue-500 mt-4 hover:underline font-bold">Go Home</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 md:px-4 py-6 md:py-8 max-w-4xl pb-24 md:pb-8">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white font-bold text-sm mb-6 transition-colors px-2">
        <ArrowLeft size={16} /> Back to Matches
      </Link>

      {/* Tournament Header */}
      <div className="glass-card rounded-3xl p-6 md:p-8 relative overflow-hidden mb-6 md:mb-8 mx-2 md:mx-0">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-blue-400"></div>
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 relative z-10 text-center md:text-left">
          <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.15)] flex-shrink-0">
            <Trophy size={40} className="text-blue-400" />
          </div>
          <div>
            <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-2 ${tournament.status === 'active' ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}>
              {tournament.status}
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight">
              {tournament.name}
            </h1>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
           <Trophy size={200} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white/5 p-1 rounded-2xl mb-6 mx-2 md:mx-0 overflow-x-auto scrollbar-hide">
        <button 
          onClick={() => setActiveTab('standings')}
          className={`flex-1 min-w-[100px] py-3 px-2 md:px-4 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-1 md:gap-2 ${activeTab === 'standings' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
        >
          <List size={16} className="hidden md:block" /> Points
        </button>
        <button 
          onClick={() => setActiveTab('fixtures')}
          className={`flex-1 min-w-[100px] py-3 px-2 md:px-4 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-1 md:gap-2 ${activeTab === 'fixtures' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
        >
          <Calendar size={16} className="hidden md:block" /> Fixtures
        </button>
        <button 
          onClick={() => setActiveTab('stats')}
          className={`flex-1 min-w-[100px] py-3 px-2 md:px-4 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-1 md:gap-2 ${activeTab === 'stats' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
        >
          <BarChart3 size={16} className="hidden md:block" /> Stats
        </button>
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mx-2 md:mx-0"
      >
        {activeTab === 'standings' && (
          <div className="glass rounded-3xl overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse min-w-[500px]">
                 <thead>
                   <tr className="border-b border-white/5 bg-white/5">
                     <th className="p-3 md:p-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Team</th>
                     <th className="p-3 md:p-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">P</th>
                     <th className="p-3 md:p-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">W</th>
                     <th className="p-3 md:p-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">L</th>
                     <th className="p-3 md:p-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">T</th>
                     <th className="p-3 md:p-4 text-sm font-black text-blue-400 uppercase tracking-widest text-center bg-blue-500/5">PTS</th>
                   </tr>
                 </thead>
                 <tbody>
                   {pointsTable.length === 0 ? (
                     <tr>
                       <td colSpan="6" className="p-8 text-center text-gray-500">No matches played yet.</td>
                     </tr>
                   ) : (
                     pointsTable.map((row, index) => {
                       const team = getTeamDetails(row.id);
                       return (
                         <tr key={row.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                           <td className="p-3 md:p-4 flex items-center gap-2 md:gap-3">
                              <div className="w-5 md:w-6 text-gray-500 font-bold text-xs md:text-sm">{index + 1}</div>
                              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {team.logoUrl ? (
                                   <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                                ) : (
                                   <Shield size={12} className="text-blue-400" />
                                )}
                              </div>
                              <span className="font-bold text-white whitespace-nowrap text-sm md:text-base">{team.shortName} <span className="hidden md:inline text-gray-500 ml-1 font-normal">({team.name})</span></span>
                           </td>
                           <td className="p-3 md:p-4 text-center font-medium text-gray-300 text-sm md:text-base">{row.played}</td>
                           <td className="p-3 md:p-4 text-center font-medium text-green-400 text-sm md:text-base">{row.won}</td>
                           <td className="p-3 md:p-4 text-center font-medium text-red-400 text-sm md:text-base">{row.lost}</td>
                           <td className="p-3 md:p-4 text-center font-medium text-gray-400 text-sm md:text-base">{row.tied}</td>
                           <td className="p-3 md:p-4 text-center font-black text-blue-400 text-base md:text-lg bg-blue-500/5">{row.points}</td>
                         </tr>
                       );
                     })
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {activeTab === 'fixtures' && (
          <div className="space-y-4">
             {matches.length === 0 ? (
               <div className="glass p-8 md:p-12 rounded-2xl text-center">
                 <Calendar size={40} className="mx-auto text-gray-600 mb-4" />
                 <h3 className="text-lg md:text-xl font-bold text-gray-400">No Fixtures</h3>
               </div>
             ) : (
               matches.map(m => {
                 const tA = getTeamDetails(m.teamA);
                 const tB = getTeamDetails(m.teamB);
                 const stageColor = m.stage === 'Final' ? 'text-yellow-500' : m.stage?.includes('Final') ? 'text-purple-400' : 'text-blue-400';
                 
                 return (
                   <Link href={`/match/${m.id}`} key={m.id} className="block">
                     <div className="glass rounded-2xl p-4 md:p-6 hover:bg-white/5 transition-colors relative overflow-hidden group">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                              m.status === 'live' ? 'bg-red-500/20 text-red-500' :
                              m.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {m.status === 'live' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-1.5 align-middle"></span>}
                              {m.status}
                            </span>
                            {m.stage && m.stage !== 'League' && (
                               <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${stageColor}`}>
                                 {m.stage}
                               </span>
                            )}
                          </div>
                          <span className="text-[10px] md:text-xs text-gray-500 font-bold">{new Date(m.createdAt).toLocaleDateString()}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                           <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 w-1/3 md:w-auto">
                             <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/5 flex flex-shrink-0 items-center justify-center overflow-hidden border border-white/10">
                               {tA.logoUrl ? <img src={tA.logoUrl} alt={tA.name} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-gray-400">{tA.shortName}</span>}
                             </div>
                             <span className="font-bold text-white text-sm md:text-lg text-center">{tA.shortName}</span>
                           </div>
                           
                           <div className="text-center px-2 md:px-4 w-1/3 md:w-auto">
                             <div className="text-[10px] md:text-xs font-black text-gray-500 italic uppercase">VS</div>
                           </div>
                           
                           <div className="flex flex-col-reverse md:flex-row items-center gap-2 md:gap-3 w-1/3 md:w-auto">
                             <span className="font-bold text-white text-sm md:text-lg text-center">{tB.shortName}</span>
                             <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/5 flex flex-shrink-0 items-center justify-center overflow-hidden border border-white/10">
                               {tB.logoUrl ? <img src={tB.logoUrl} alt={tB.name} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-gray-400">{tB.shortName}</span>}
                             </div>
                           </div>
                        </div>

                        {m.status === 'completed' && m.result && (
                          <div className="mt-4 pt-3 border-t border-white/5 text-center">
                             <p className="text-[10px] md:text-xs font-bold text-[var(--color-cricket-accent)] uppercase tracking-wider">{m.result.margin}</p>
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
             <div className="flex bg-black/40 p-1 rounded-xl mb-4 text-sm">
                <button 
                  onClick={() => setStatsTab('orange')}
                  className={`flex-1 py-2 font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${statsTab === 'orange' ? 'bg-orange-500 text-white' : 'text-gray-400'}`}
                >
                  <Medal size={16} className={statsTab === 'orange' ? 'text-yellow-200' : ''} /> <span className="hidden md:inline">Orange Cap</span><span className="md:hidden">Runs</span>
                </button>
                <button 
                  onClick={() => setStatsTab('purple')}
                  className={`flex-1 py-2 font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${statsTab === 'purple' ? 'bg-purple-500 text-white' : 'text-gray-400'}`}
                >
                  <Medal size={16} className={statsTab === 'purple' ? 'text-purple-200' : ''} /> <span className="hidden md:inline">Purple Cap</span><span className="md:hidden">Wickets</span>
                </button>
                <button 
                  onClick={() => setStatsTab('mvp')}
                  className={`flex-1 py-2 font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${statsTab === 'mvp' ? 'bg-yellow-500 text-black' : 'text-gray-400'}`}
                >
                  <Star size={16} /> MVP
                </button>
             </div>

             {/* Stat List */}
             <div className="glass rounded-2xl overflow-hidden">
                {statsTab === 'orange' && (
                  playerStats.orangeCap.length === 0 ? <p className="p-8 text-center text-gray-500">No data available.</p> :
                  <ul className="divide-y divide-white/5">
                    {playerStats.orangeCap.map((p, i) => (
                      <li key={p.id} className="p-4 flex items-center justify-between hover:bg-white/5">
                        <div className="flex items-center gap-4">
                          <span className={`font-black text-lg w-6 text-center ${i === 0 ? 'text-orange-500' : 'text-gray-600'}`}>{i + 1}</span>
                          <div>
                            <p className="font-bold text-white">{p.name}</p>
                            <p className="text-xs text-gray-500">{getTeamDetails(p.teamId).shortName}</p>
                          </div>
                        </div>
                        <div className="text-xl font-black text-orange-400 bg-orange-500/10 px-3 py-1 rounded-lg">{p.runs}</div>
                      </li>
                    ))}
                  </ul>
                )}
                {statsTab === 'purple' && (
                  playerStats.purpleCap.length === 0 ? <p className="p-8 text-center text-gray-500">No data available.</p> :
                  <ul className="divide-y divide-white/5">
                    {playerStats.purpleCap.map((p, i) => (
                      <li key={p.id} className="p-4 flex items-center justify-between hover:bg-white/5">
                        <div className="flex items-center gap-4">
                          <span className={`font-black text-lg w-6 text-center ${i === 0 ? 'text-purple-500' : 'text-gray-600'}`}>{i + 1}</span>
                          <div>
                            <p className="font-bold text-white">{p.name}</p>
                            <p className="text-xs text-gray-500">{getTeamDetails(p.teamId).shortName}</p>
                          </div>
                        </div>
                        <div className="text-xl font-black text-purple-400 bg-purple-500/10 px-3 py-1 rounded-lg">{p.wickets}</div>
                      </li>
                    ))}
                  </ul>
                )}
                {statsTab === 'mvp' && (
                  playerStats.mvp.length === 0 ? <p className="p-8 text-center text-gray-500">No data available.</p> :
                  <ul className="divide-y divide-white/5">
                    {playerStats.mvp.map((p, i) => (
                      <li key={p.id} className="p-4 flex items-center justify-between hover:bg-white/5">
                        <div className="flex items-center gap-4">
                          <span className={`font-black text-lg w-6 text-center ${i === 0 ? 'text-yellow-500' : 'text-gray-600'}`}>{i + 1}</span>
                          <div>
                            <p className="font-bold text-white">{p.name}</p>
                            <p className="text-xs text-gray-500">{getTeamDetails(p.teamId).shortName}</p>
                          </div>
                        </div>
                        <div className="text-xl font-black text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-lg">{p.mvpPoints} <span className="text-xs text-yellow-500/50">pts</span></div>
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
