"use client";
import { useState, useEffect, use } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Calendar, List, ArrowLeft, Shield } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('standings'); // standings, fixtures
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

    // Initialize all teams that have played at least one match in this tournament
    tMatches.forEach(m => {
      if (m.teamA && !table[m.teamA]) table[m.teamA] = { id: m.teamA, played: 0, won: 0, lost: 0, tied: 0, points: 0 };
      if (m.teamB && !table[m.teamB]) table[m.teamB] = { id: m.teamB, played: 0, won: 0, lost: 0, tied: 0, points: 0 };
    });

    // Process completed matches
    tMatches.forEach(m => {
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
      // If points are equal, in the future we sort by NRR here. For now, sort by wins.
      return b.won - a.won;
    });

    setPointsTable(sortedTable);
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-black">
        <Trophy size={64} className="text-gray-600 mb-4" />
        <h1 className="text-2xl font-bold text-white">Tournament Not Found</h1>
        <Link href="/" className="text-blue-500 mt-4 hover:underline">Go Home</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl pb-20">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white font-bold text-sm mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Matches
      </Link>

      {/* Tournament Header */}
      <div className="glass-card rounded-3xl p-8 relative overflow-hidden mb-8">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-blue-400"></div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.15)] flex-shrink-0">
            <Trophy size={40} className="text-blue-400" />
          </div>
          <div>
            <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-2 ${tournament.status === 'active' ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}>
              {tournament.status}
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-tight">
              {tournament.name}
            </h1>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
           <Trophy size={200} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white/5 p-1 rounded-2xl mb-6">
        <button 
          onClick={() => setActiveTab('standings')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'standings' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
        >
          <List size={18} /> Points Table
        </button>
        <button 
          onClick={() => setActiveTab('fixtures')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'fixtures' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
        >
          <Calendar size={18} /> Fixtures
        </button>
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'standings' && (
          <div className="glass rounded-3xl overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="border-b border-white/5 bg-white/5">
                     <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Team</th>
                     <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">P</th>
                     <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">W</th>
                     <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">L</th>
                     <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">T</th>
                     <th className="p-4 text-sm font-black text-blue-400 uppercase tracking-widest text-center bg-blue-500/5">PTS</th>
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
                           <td className="p-4 flex items-center gap-3">
                              <div className="w-6 text-gray-500 font-bold text-sm">{index + 1}</div>
                              <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {team.logoUrl ? (
                                   <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                                ) : (
                                   <Shield size={14} className="text-blue-400" />
                                )}
                              </div>
                              <span className="font-bold text-white whitespace-nowrap">{team.name} <span className="text-gray-500 ml-1 md:hidden">({team.shortName})</span></span>
                           </td>
                           <td className="p-4 text-center font-medium text-gray-300">{row.played}</td>
                           <td className="p-4 text-center font-medium text-green-400">{row.won}</td>
                           <td className="p-4 text-center font-medium text-red-400">{row.lost}</td>
                           <td className="p-4 text-center font-medium text-gray-400">{row.tied}</td>
                           <td className="p-4 text-center font-black text-blue-400 text-lg bg-blue-500/5">{row.points}</td>
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
               <div className="glass p-12 rounded-2xl text-center">
                 <Calendar size={48} className="mx-auto text-gray-600 mb-4" />
                 <h3 className="text-xl font-bold text-gray-400">No Fixtures</h3>
               </div>
             ) : (
               matches.map(m => {
                 const tA = getTeamDetails(m.teamA);
                 const tB = getTeamDetails(m.teamB);
                 
                 return (
                   <Link href={`/match/${m.id}`} key={m.id} className="block">
                     <div className="glass rounded-2xl p-6 hover:bg-white/5 transition-colors relative overflow-hidden group">
                        <div className="flex justify-between items-center mb-4">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            m.status === 'live' ? 'bg-red-500/20 text-red-500' :
                            m.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {m.status === 'live' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-1.5 align-middle"></span>}
                            {m.status}
                          </span>
                          <span className="text-xs text-gray-500 font-bold">{new Date(m.createdAt).toLocaleDateString()}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-white/5 flex flex-shrink-0 items-center justify-center overflow-hidden border border-white/10">
                               {tA.logoUrl ? <img src={tA.logoUrl} alt={tA.name} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-gray-400">{tA.shortName}</span>}
                             </div>
                             <span className="font-bold text-white text-sm md:text-lg">{tA.shortName}</span>
                           </div>
                           
                           <div className="text-center px-4">
                             <div className="text-[10px] font-black text-gray-500 italic uppercase">VS</div>
                           </div>
                           
                           <div className="flex items-center gap-3">
                             <span className="font-bold text-white text-sm md:text-lg">{tB.shortName}</span>
                             <div className="w-10 h-10 rounded-full bg-white/5 flex flex-shrink-0 items-center justify-center overflow-hidden border border-white/10">
                               {tB.logoUrl ? <img src={tB.logoUrl} alt={tB.name} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-gray-400">{tB.shortName}</span>}
                             </div>
                           </div>
                        </div>

                        {m.status === 'completed' && m.result && (
                          <div className="mt-4 pt-3 border-t border-white/5 text-center">
                             <p className="text-xs font-bold text-[var(--color-cricket-accent)] uppercase tracking-wider">{m.result.margin}</p>
                          </div>
                        )}
                     </div>
                   </Link>
                 );
               })
             )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
