"use client";
import { motion } from 'framer-motion';
import { Trophy, Users, Shield, Plus, Activity, Settings } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const stats = [
    { name: 'Active Tournaments', value: '3', icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { name: 'Live Matches', value: '1', icon: Activity, color: 'text-[var(--color-cricket-accent)]', bg: 'bg-[var(--color-cricket-accent)]/10' },
    { name: 'Total Teams', value: '24', icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Registered Players', value: '356', icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
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
          transition={{ delay: 0.3 }}
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
                <p className="text-sm text-gray-400">Add players and squads</p>
              </div>
            </Link>
          </div>
        </motion.div>

        {/* Live / Recent Matches */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-3xl p-6"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center justify-between">
            <span>Recent Activity</span>
            <Link href="/tournaments" className="text-sm font-medium text-[var(--color-cricket-blue)] hover:underline">View All</Link>
          </h2>
          
          <div className="space-y-4">
            <Link href="/scorer/demo" className="block">
              <div className="bg-black/40 border border-[var(--color-cricket-accent)]/30 rounded-2xl p-4 hover:bg-black/60 transition-colors relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-cricket-accent)] group-hover:w-2 transition-all"></div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Gully Premier League</span>
                  <span className="bg-red-500/20 text-red-500 px-2 py-1 rounded text-[10px] font-black tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> LIVE
                  </span>
                </div>
                <div className="flex justify-between items-center pl-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-xs font-bold text-white shadow-lg">MI</div>
                    <span className="font-bold text-white text-lg">184/4 <span className="text-xs text-gray-500">(18.2)</span></span>
                  </div>
                  <span className="text-gray-500 font-black italic">VS</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-500 text-lg">Yet to bat</span>
                    <div className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center text-xs font-bold text-white shadow-lg">CSK</div>
                  </div>
                </div>
              </div>
            </Link>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 opacity-70 hover:opacity-100 transition-opacity">
               <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Weekend Cup</span>
                  <span className="bg-gray-800 text-gray-400 px-2 py-1 rounded text-[10px] font-black tracking-wider">COMPLETED</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-300 text-lg">RCB <span className="text-gray-500 text-sm ml-1">210/3</span></span>
                  <span className="text-xs font-bold text-[var(--color-cricket-accent)]">RCB won by 45 runs</span>
                  <span className="font-bold text-gray-500 text-lg">KKR <span className="text-gray-600 text-sm ml-1">165/8</span></span>
                </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
