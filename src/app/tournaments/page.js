"use client";
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, Activity, ArrowUpRight } from 'lucide-react';

const wormData = [
  { over: 0, IND: 0, AUS: 0 },
  { over: 5, IND: 45, AUS: 38 },
  { over: 10, IND: 82, AUS: 76 },
  { over: 15, IND: 134, AUS: 120 },
  { over: 20, IND: 184, AUS: null },
];

export default function MatchCenter() {
  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black text-white flex items-center gap-3 tracking-tight">
              <Activity className="text-[var(--color-cricket-accent)]" size={36} /> Match Center
            </h1>
            <p className="text-gray-400 mt-2">Advanced Analytics & Live Worm Graphs</p>
          </div>
          <div className="bg-red-500/10 text-red-500 border border-red-500/30 px-4 py-2 rounded-full font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> IND vs AUS (Live)
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Score & Win Probability */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card p-6 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Trophy size={150} />
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-6">Win Probability</h3>
              
              <div className="flex justify-between text-xl font-black mb-2">
                <span className="text-blue-500">IND 78%</span>
                <span className="text-yellow-500">22% AUS</span>
              </div>
              
              <div className="h-4 w-full bg-gray-900 rounded-full overflow-hidden flex shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "78%" }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-blue-700 to-blue-400"
                ></motion.div>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "22%" }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400"
                ></motion.div>
              </div>
              
              <div className="mt-8">
                <h4 className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2">Projected Score</h4>
                <div className="flex items-center gap-3">
                  <span className="text-5xl font-black text-white tabular-nums drop-shadow-lg">195</span>
                  <span className="text-[var(--color-cricket-accent)] flex items-center text-sm font-bold bg-[var(--color-cricket-accent)]/10 border border-[var(--color-cricket-accent)]/30 px-2 py-1 rounded-lg">
                    <ArrowUpRight size={16} /> +12
                  </span>
                </div>
              </div>
            </div>
            
            <div className="glass p-6 rounded-3xl">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Key Performers</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                  <div>
                    <p className="text-white font-bold">V. Kohli</p>
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mt-1">Striker</p>
                  </div>
                  <p className="text-3xl font-black text-[var(--color-cricket-accent)]">72<span className="text-sm text-gray-500"> (45)</span></p>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                  <div>
                    <p className="text-white font-bold">P. Cummins</p>
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mt-1">Bowler</p>
                  </div>
                  <p className="text-3xl font-black text-blue-400">2/28<span className="text-sm text-gray-500"> (3.2)</span></p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Worm Graph */}
          <div className="lg:col-span-2 glass-card p-6 rounded-3xl">
             <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-6">Innings Worm</h3>
             <div className="h-[400px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={wormData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#1f2d47" vertical={false} />
                   <XAxis dataKey="over" stroke="#6b7280" tick={{fill: '#6b7280', fontWeight: 'bold'}} tickLine={false} axisLine={false} />
                   <YAxis stroke="#6b7280" tick={{fill: '#6b7280', fontWeight: 'bold'}} tickLine={false} axisLine={false} />
                   <Tooltip 
                     contentStyle={{ backgroundColor: 'rgba(10, 14, 23, 0.95)', borderColor: '#1f2d47', borderRadius: '16px', color: '#fff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                     itemStyle={{ fontWeight: 'bold' }}
                     cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                   />
                   <Line type="monotone" dataKey="IND" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6, fill: '#0a0e17', stroke: '#3b82f6', strokeWidth: 3 }} activeDot={{ r: 8, fill: '#3b82f6' }} animationDuration={2000} />
                   <Line type="monotone" dataKey="AUS" stroke="#eab308" strokeWidth={4} dot={{ r: 6, fill: '#0a0e17', stroke: '#eab308', strokeWidth: 3 }} activeDot={{ r: 8, fill: '#eab308' }} animationDuration={2000} />
                 </LineChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
