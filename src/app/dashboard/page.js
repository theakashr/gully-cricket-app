"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Users, Shield, Plus, Activity, Settings, Calendar, User } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';

export default function DashboardPage() {
  const [data, setData] = useState({
    tournaments: [],
    matches: [],
    teams: {},
    players: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We attach listeners to multiple nodes to keep dashboard real-time
    const unsubscribes = [];

    const setupListener = (path, key, isObject = false) => {
      const dbRef = ref(db, path);
      const unsub = onValue(dbRef, (snapshot) => {
        const val = snapshot.val();
        if (isObject) {
           setData(prev => ({ ...prev, [key]: val || {} }));
        } else {
           let arr = [];
           if (val) {
             arr = Object.entries(val).map(([id, data]) => ({ id, ...data }));
           }
           setData(prev => ({ ...prev, [key]: arr }));
        }
      });
      unsubscribes.push(unsub);
    };

    setupListener('tournaments', 'tournaments');
    setupListener('matches', 'matches');
    setupListener('teams', 'teams', true); // Keep as object for easy lookup
    setupListener('players', 'players');

    // Simulate small loading delay for smooth UI
    const timer = setTimeout(() => setLoading(false), 500);

    return () => {
      unsubscribes.forEach(u => u());
      clearTimeout(timer);
    };
  }, []);

  const activeTournaments = data.tournaments.filter(t => t.status === 'active').length;
  const liveMatches = data.matches.filter(m => m.status === 'live').length;
  const totalTeams = Object.keys(data.teams).length;
  const totalPlayers = data.players.length;

  // Sort matches by newest first
  const recentMatches = [...data.matches]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

  const getTeamDetails = (id) => {
    return data.teams[id] || { name: 'Unknown', shortName: 'UNK' };
  };

  const getTournamentDetails = (id) => {
    return data.tournaments.find(t => t.id === id) || { name: 'Exhibition' };
  };

  const stats = [
    { name: 'Active Tournaments', value: activeTournaments, icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { name: 'Live Matches', value: liveMatches, icon: Activity, color: 'text-[var(--color-cricket-accent)]', bg: 'bg-[var(--color-cricket-accent)]/10' },
    { name: 'Total Teams', value: totalTeams, icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Registered Players', value: totalPlayers, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  if (loading) {
     return (
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="w-10 h-10 border-4 border-[var(--color-cricket-accent)]/30 border-t-[var(--color-cricket-accent)] rounded-full animate-spin"></div>
        </div>
     );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-20">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-white">Dashboard Overview</h1>
          <p className="text-gray-400 mt-1">Manage tournaments, teams, and live scoring</p>
        </div>
        <button className="glass p-3 rounded-xl hover:bg-white/10 transition-colors">
          <Settings size={20} className="text-gray-400" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.name} 
            className="glass-card p-6 rounded-2xl"
          >
            <div className={`${stat.bg} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
              <stat.icon size={24} className={stat.color} />
            </div>
            <h3 className="text-4xl font-black text-white mb-1 tracking-tight">{stat.value}</h3>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{stat.name}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-3xl p-6"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="text-[var(--color-cricket-accent)]" /> Quick Actions
          </h2>
          <div className="space-y-4">
            <Link href="/dashboard/matches" className="block w-full glass hover:bg-white/5 border border-white/10 p-4 rounded-xl flex items-center gap-4 transition-colors group">
              <div className="bg-[var(--color-cricket-accent)]/20 p-3 rounded-lg group-hover:scale-110 transition-transform">
                <Plus size={20} className="text-[var(--color-cricket-accent)]" />
              </div>
              <div className="text-left">
                <h4 className="text-white font-bold text-lg">Start New Match</h4>
                <p className="text-sm text-gray-400">Initialize a live scoring session</p>
              </div>
            </Link>
            <Link href="/dashboard/tournaments" className="block w-full glass hover:bg-white/5 border border-white/10 p-4 rounded-xl flex items-center gap-4 transition-colors group">
              <div className="bg-blue-500/20 p-3 rounded-lg group-hover:scale-110 transition-transform">
                <Trophy size={20} className="text-blue-500" />
              </div>
              <div className="text-left">
                <h4 className="text-white font-bold text-lg">Create Tournament</h4>
                <p className="text-sm text-gray-400">Set up a new league or cup</p>
              </div>
            </Link>
            <Link href="/dashboard/teams" className="block w-full glass hover:bg-white/5 border border-white/10 p-4 rounded-xl flex items-center gap-4 transition-colors group">
              <div className="bg-purple-500/20 p-3 rounded-lg group-hover:scale-110 transition-transform">
                <Shield size={20} className="text-purple-500" />
              </div>
              <div className="text-left">
                <h4 className="text-white font-bold text-lg">Manage Teams</h4>
                <p className="text-sm text-gray-400">Add franchises and squads</p>
              </div>
            </Link>
            <Link href="/dashboard/players" className="block w-full glass hover:bg-white/5 border border-white/10 p-4 rounded-xl flex items-center gap-4 transition-colors group">
              <div className="bg-yellow-500/20 p-3 rounded-lg group-hover:scale-110 transition-transform">
                <User size={20} className="text-yellow-500" />
              </div>
              <div className="text-left">
                <h4 className="text-white font-bold text-lg">Manage Players</h4>
                <p className="text-sm text-gray-400">Register players to global database</p>
              </div>
            </Link>
          </div>
        </motion.div>

        {/* Live / Recent Matches */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-3xl p-6"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center justify-between">
            <span>Recent Activity</span>
            <Link href="/dashboard/matches" className="text-sm font-medium text-blue-500 hover:underline">View All</Link>
          </h2>
          
          <div className="space-y-4">
             {recentMatches.length === 0 ? (
               <div className="text-center p-8 bg-white/5 rounded-2xl border border-white/10">
                 <Calendar size={32} className="mx-auto text-gray-600 mb-2" />
                 <p className="text-gray-400 font-medium">No matches found</p>
               </div>
             ) : (
               recentMatches.map(m => {
                 const tA = getTeamDetails(m.teamA);
                 const tB = getTeamDetails(m.teamB);
                 const tourney = getTournamentDetails(m.tournamentId);
                 
                 // Get score info based on current innings
                 let displayScore = "";
                 let currentTeamName = "";
                 
                 if (m.status === 'completed' && m.result) {
                    displayScore = m.result.margin || 'Completed';
                 } else if (m.score && m.currentInnings) {
                    const inningsKey = m.currentInnings === 1 ? 'innings1' : 'innings2';
                    const scoreObj = m.score[inningsKey] || { runs: 0, wickets: 0, overs: 0 };
                    displayScore = `${scoreObj.runs}/${scoreObj.wickets} (${scoreObj.overs})`;
                    currentTeamName = m.currentInnings === 1 ? tA.shortName : tB.shortName;
                 }

                 return (
                   <Link href={m.status === 'completed' ? `/match/${m.id}` : `/scorer/${m.id}`} key={m.id} className="block">
                     <div className={`border rounded-2xl p-4 transition-colors relative overflow-hidden group ${m.status === 'live' ? 'bg-black/40 border-[var(--color-cricket-accent)]/30 hover:bg-black/60' : 'bg-white/5 border-white/10 opacity-80 hover:opacity-100'}`}>
                       {m.status === 'live' && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-cricket-accent)] group-hover:w-2 transition-all"></div>
                       )}
                       
                       <div className="flex justify-between items-center mb-3">
                         <span className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2 truncate pr-2 max-w-[200px]">{tourney.name}</span>
                         <span className={`px-2 py-1 rounded text-[10px] font-black tracking-wider flex items-center gap-1 ${
                            m.status === 'live' ? 'bg-red-500/20 text-red-500' :
                            m.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                            'bg-gray-500/20 text-gray-400'
                         }`}>
                           {m.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>}
                           {m.status}
                         </span>
                       </div>
                       
                       <div className="flex justify-between items-center pl-2">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                             {tA.logoUrl ? <img src={tA.logoUrl} className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-white">{tA.shortName}</span>}
                           </div>
                           <span className="font-bold text-white text-lg">{tA.shortName}</span>
                         </div>
                         
                         <div className="flex flex-col items-center">
                            <span className="text-gray-500 font-black italic text-xs">VS</span>
                         </div>
                         
                         <div className="flex items-center gap-3">
                           <span className="font-bold text-white text-lg">{tB.shortName}</span>
                           <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                             {tB.logoUrl ? <img src={tB.logoUrl} className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-white">{tB.shortName}</span>}
                           </div>
                         </div>
                       </div>
                       
                       {displayScore && (
                         <div className="mt-3 pt-2 border-t border-white/5 text-center">
                            {m.status === 'live' ? (
                               <p className="text-sm font-bold text-white">{currentTeamName} is <span className="text-[var(--color-cricket-accent)] text-lg">{displayScore}</span></p>
                            ) : (
                               <p className="text-xs font-bold text-green-400 uppercase tracking-widest">{displayScore}</p>
                            )}
                         </div>
                       )}
                     </div>
                   </Link>
                 );
               })
             )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
