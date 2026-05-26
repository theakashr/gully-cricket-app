"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Users, Shield, Plus, Activity, Settings, Calendar, User, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { role } = useAuth();
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
             arr = Object.entries(val).map(([id, val2]) => ({ id, ...val2 }));
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
    const timer = setTimeout(() => setLoading(false), 550);

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
    { name: 'Active Tournaments', value: activeTournaments, icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-100' },
    { name: 'Live Matches', value: liveMatches, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { name: 'Total Teams', value: totalTeams, icon: Shield, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Registered Players', value: totalPlayers, icon: Users, color: 'text-violet-600', bg: 'bg-violet-100' },
  ];

  if (loading) {
     return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-10 h-10 border-4 border-[var(--color-cricket-accent)]/30 border-t-[var(--color-cricket-accent)] rounded-full animate-spin"></div>
        </div>
     );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-20">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-550 mt-1 text-sm font-semibold">
            {role === 'viewer' ? 'Read-Only Viewer Account access' : 'Manage tournaments, teams, and live scoring'}
          </p>
        </div>
        <button className="glass p-3 rounded-xl hover:bg-slate-100/80 transition-colors shadow-sm">
          <Settings size={20} className="text-slate-500" />
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
            className="glass-card p-6 rounded-2xl border border-white shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className={`${stat.bg} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
                <stat.icon size={24} className={stat.color} />
              </div>
              <h3 className="text-4xl font-black text-slate-900 mb-1 tracking-tight">{stat.value}</h3>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">{stat.name}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Quick Actions / Navigator */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-3xl p-6 border border-slate-200/80 shadow-sm"
        >
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Activity className="text-[var(--color-cricket-accent)]" /> {role === 'viewer' ? 'Dashboard Sections' : 'Quick Actions'}
          </h2>
          <div className="space-y-4">
            <Link href="/dashboard/matches" className="block w-full glass hover:bg-slate-100/50 border border-slate-200/80 p-4 rounded-xl flex items-center gap-4 transition-all hover:shadow-sm group">
              <div className="bg-[var(--color-cricket-accent)]/20 p-3 rounded-lg group-hover:scale-110 transition-transform">
                {role === 'viewer' ? <ChevronRight size={20} className="text-[var(--color-cricket-accent)]" /> : <Plus size={20} className="text-[var(--color-cricket-accent)]" />}
              </div>
              <div className="text-left">
                <h4 className="text-slate-800 font-bold text-lg leading-tight">
                  {role === 'viewer' ? 'Explore Matches' : 'Start New Match'}
                </h4>
                <p className="text-xs text-slate-500 font-semibold">
                  {role === 'viewer' ? 'Monitor scores, stages, and over details' : 'Initialize a live scoring session'}
                </p>
              </div>
            </Link>
            <Link href="/dashboard/tournaments" className="block w-full glass hover:bg-slate-100/50 border border-slate-200/80 p-4 rounded-xl flex items-center gap-4 transition-all hover:shadow-sm group">
              <div className="bg-blue-500/20 p-3 rounded-lg group-hover:scale-110 transition-transform">
                {role === 'viewer' ? <ChevronRight size={20} className="text-blue-500" /> : <Trophy size={20} className="text-blue-500" />}
              </div>
              <div className="text-left">
                <h4 className="text-slate-800 font-bold text-lg leading-tight">
                  {role === 'viewer' ? 'Explore Tournaments' : 'Create Tournament'}
                </h4>
                <p className="text-xs text-slate-500 font-semibold">
                  {role === 'viewer' ? 'Browse active leagues, fixtures, and standings' : 'Set up a new league or cup'}
                </p>
              </div>
            </Link>
            <Link href="/dashboard/teams" className="block w-full glass hover:bg-slate-100/50 border border-slate-200/80 p-4 rounded-xl flex items-center gap-4 transition-all hover:shadow-sm group">
              <div className="bg-purple-500/20 p-3 rounded-lg group-hover:scale-110 transition-transform">
                {role === 'viewer' ? <ChevronRight size={20} className="text-purple-500" /> : <Shield size={20} className="text-purple-500" />}
              </div>
              <div className="text-left">
                <h4 className="text-slate-800 font-bold text-lg leading-tight">
                  {role === 'viewer' ? 'Explore Teams' : 'Manage Teams'}
                </h4>
                <p className="text-xs text-slate-500 font-semibold">
                  {role === 'viewer' ? 'Inspect team franchises and squads' : 'Add franchises and squads'}
                </p>
              </div>
            </Link>
            <Link href="/dashboard/players" className="block w-full glass hover:bg-slate-100/50 border border-slate-200/80 p-4 rounded-xl flex items-center gap-4 transition-all hover:shadow-sm group">
              <div className="bg-yellow-500/20 p-3 rounded-lg group-hover:scale-110 transition-transform">
                {role === 'viewer' ? <ChevronRight size={20} className="text-yellow-500" /> : <User size={20} className="text-yellow-500" />}
              </div>
              <div className="text-left">
                <h4 className="text-slate-800 font-bold text-lg leading-tight">
                  {role === 'viewer' ? 'Explore Players' : 'Manage Players'}
                </h4>
                <p className="text-xs text-slate-500 font-semibold">
                  {role === 'viewer' ? 'Browse global players, batting and bowling styles' : 'Register players to global database'}
                </p>
              </div>
            </Link>
          </div>
        </motion.div>

        {/* Live / Recent Matches */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-3xl p-6 border border-white shadow-sm"
        >
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center justify-between">
            <span>Recent Activity</span>
            <Link href="/dashboard/matches" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 tracking-wider uppercase hover:underline">View All</Link>
          </h2>
          
          <div className="space-y-4">
             {recentMatches.length === 0 ? (
               <div className="text-center p-8 bg-slate-50/50 rounded-2xl border border-slate-200/80">
                 <Calendar size={32} className="mx-auto text-slate-400 mb-2" />
                 <p className="text-slate-400 font-semibold text-sm">No matches found</p>
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
                   <Link href={m.status === 'completed' ? `/match/${m.id}` : (role === 'viewer' ? `/match/${m.id}` : `/scorer/${m.id}`)} key={m.id} className="block">
                     <div className={`border rounded-2xl p-4 transition-all relative overflow-hidden group ${
                       m.status === 'live' 
                         ? 'bg-emerald-50/30 border-emerald-500/20 hover:bg-emerald-50/50' 
                         : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:shadow-sm'
                     }`}>
                       {m.status === 'live' && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 group-hover:w-1.5 transition-all"></div>
                       )}
                       
                       <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest pl-2 truncate pr-2 max-w-[200px]">{tourney.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase flex items-center gap-1 ${
                             m.status === 'live' ? 'bg-red-100 text-red-600' :
                             m.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                             'bg-slate-100 text-slate-500'
                          }`}>
                            {m.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>}
                            {m.status}
                          </span>
                       </div>
                       
                       <div className="flex justify-between items-center pl-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {tA.logoUrl ? <img src={tA.logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <span className="text-[10px] font-black text-blue-600">{tA.shortName}</span>}
                            </div>
                            <span className="font-bold text-slate-800 text-lg">{tA.shortName}</span>
                          </div>
                          
                          <div className="flex flex-col items-center">
                             <span className="text-slate-400 font-black italic text-xs">VS</span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-800 text-lg">{tB.shortName}</span>
                            <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {tB.logoUrl ? <img src={tB.logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <span className="text-[10px] font-black text-violet-600">{tB.shortName}</span>}
                            </div>
                          </div>
                       </div>
                       
                       {displayScore && (
                          <div className="mt-3 pt-2 border-t border-slate-100 text-center">
                             {m.status === 'live' ? (
                                <p className="text-sm font-bold text-slate-700">{currentTeamName} is <span className="text-emerald-600 font-extrabold text-lg">{displayScore}</span></p>
                             ) : (
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">{displayScore}</p>
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
