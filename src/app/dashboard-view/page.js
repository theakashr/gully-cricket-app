"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Trophy, Activity, ChevronDown, ChevronUp, Circle,
  Flame, Zap, Calendar, Award, TrendingUp, Star
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ═══════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════

const WORM_DATA = [
  { over: 1, RCB: 8, CSK: 0 }, { over: 2, RCB: 18, CSK: 0 },
  { over: 3, RCB: 24, CSK: 0 }, { over: 4, RCB: 35, CSK: 0 },
  { over: 5, RCB: 48, CSK: 0 }, { over: 6, RCB: 56, CSK: 0 },
  { over: 7, RCB: 72, CSK: 0 }, { over: 8, RCB: 88, CSK: 0 },
  { over: 8.5, RCB: 96, CSK: 0 },
];

const POINTS_TABLE = [
  { rank: 1, code: 'RCB', name: 'Royal Challengers Bangalore', p: 14, w: 10, l: 4, t: 0, nrr: '+1.242', pts: 20, color: '#E4002B' },
  { rank: 2, code: 'CSK', name: 'Chennai Super Kings', p: 14, w: 9, l: 5, t: 0, nrr: '+0.891', pts: 18, color: '#FCCA06' },
  { rank: 3, code: 'MI', name: 'Mumbai Indians', p: 14, w: 8, l: 6, t: 0, nrr: '+0.456', pts: 16, color: '#004BA0' },
  { rank: 4, code: 'GT', name: 'Gujarat Titans', p: 14, w: 8, l: 6, t: 0, nrr: '+0.112', pts: 16, color: '#1C1C2B' },
  { rank: 5, code: 'KKR', name: 'Kolkata Knight Riders', p: 14, w: 6, l: 8, t: 0, nrr: '-0.321', pts: 12, color: '#3A225D' },
  { rank: 6, code: 'SRH', name: 'Sunrisers Hyderabad', p: 14, w: 5, l: 9, t: 0, nrr: '-0.878', pts: 10, color: '#F26522' },
];

const FIXTURES = [
  { id: 1, teamA: 'MI', teamB: 'KKR', date: 'Tomorrow', time: '07:30 PM', venue: 'Wankhede Stadium' },
  { id: 2, teamA: 'CSK', teamB: 'SRH', date: 'Jun 01', time: '03:30 PM', venue: 'MA Chidambaram Stadium' },
  { id: 3, teamA: 'GT', teamB: 'RCB', date: 'Jun 02', time: '07:30 PM', venue: 'Narendra Modi Stadium' },
];

// ═══════════════════════════════════════════════════════
// CUSTOM CHART TOOLTIP
// ═══════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════
// WIN PREDICTOR DONUT
// ═══════════════════════════════════════════════════════

function WinPredictor({ teamA, teamB, probA, probB }) {
  const circumference = 2 * Math.PI * 40;
  const strokeA = (probA / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Win Predictor</p>
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {/* Background ring */}
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(239,68,68,0.3)" strokeWidth="8" />
          {/* Team A arc */}
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
          <span className="text-lg font-black text-white tabular-nums">{probA}%</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-[10px] font-bold">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> {teamA}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/60"></span> {teamB}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('points');
  const [chartOpen, setChartOpen] = useState(false);

  const tabs = [
    { id: 'points', label: 'Points Table' },
    { id: 'fixtures', label: 'Fixtures' },
    { id: 'leaders', label: 'Cap Leaders' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white relative overflow-hidden">
      {/* Background Glow Effects */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-[100px] pointer-events-none"></div>

      {/* ──────────────────── HEADER ──────────────────── */}
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto max-w-6xl px-4 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-lg font-black tracking-tight">
              Stumpflow <span className="text-blue-400">Live</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {['Home', 'Matches', 'Tournaments', 'Dashboard'].map(item => (
              <Link
                key={item}
                href={item === 'Home' ? '/' : item === 'Dashboard' ? '/dashboard-view' : `/${item.toLowerCase()}`}
                className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                  item === 'Dashboard' ? 'text-blue-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                {item}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <div className="container mx-auto max-w-6xl px-4 py-6 space-y-6">

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
            <h1 className="text-xl font-black tracking-tight">SKCC Cricket</h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Season 2026 • T20 Format • 6 Teams</p>
          </div>
        </motion.div>

        {/* ──────────────────── LIVE MATCH CARD ──────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden"
        >
          {/* Match Header */}
          <div className="flex justify-between items-center px-5 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Live</span>
            </div>
            <span className="text-[10px] font-medium text-slate-500">Match 15 • Qualifier 1</span>
          </div>

          {/* Score Section */}
          <div className="px-5 pb-4 flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Teams & Score */}
            <div className="flex items-center gap-6 md:gap-10 flex-1">
              {/* RCB */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                  <span className="text-sm font-black text-red-400">RCB</span>
                </div>
                <div>
                  <h2 className="text-3xl font-black tabular-nums leading-none">96<span className="text-xl text-slate-500">/0</span></h2>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">8.5 Overs</p>
                </div>
              </div>

              {/* VS */}
              <div className="px-3">
                <Zap size={18} className="text-slate-600" />
              </div>

              {/* CSK */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                  <span className="text-sm font-black text-yellow-400">CSK</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500">Yet to bat</p>
                </div>
              </div>
            </div>

            {/* Win Predictor */}
            <WinPredictor teamA="RCB" teamB="CSK" probA={85} probB={15} />
          </div>

          {/* Live Stats Strip */}
          <div className="px-5 pb-3 flex gap-6 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>CRR: <span className="text-blue-400">11.29</span></span>
            <span>Last 5: <span className="text-white">48 runs</span></span>
          </div>

          {/* Worm Chart Accordion */}
          <div className="border-t border-white/5">
            <button
              onClick={() => setChartOpen(!chartOpen)}
              className="w-full flex items-center justify-between px-5 py-3 text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2">
                <TrendingUp size={14} /> Cumulative Runs Comparison
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
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pt-1">
                    <div className="h-56 md:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={WORM_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gradRCB" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradCSK" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
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
                          <Area type="monotone" dataKey="RCB" stroke="#3b82f6" fillOpacity={1} fill="url(#gradRCB)" strokeWidth={2.5} dot={false} />
                          <Area type="monotone" dataKey="CSK" stroke="#eab308" fillOpacity={1} fill="url(#gradCSK)" strokeWidth={2.5} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ──────────────────── TOURNAMENT HUB TABS ──────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Tab Switcher */}
          <div className="flex gap-0 border-b border-white/10 mb-5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-5 py-3 text-xs font-black uppercase tracking-widest transition-colors ${
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
              {activeTab === 'points' && (
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
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
                  {POINTS_TABLE.map((team, i) => (
                    <div
                      key={team.code}
                      className={`grid grid-cols-[minmax(160px,2fr)_repeat(6,1fr)] gap-0 px-4 py-3 border-b border-white/5 items-center transition-colors hover:bg-white/5 ${
                        i < 4 ? 'border-l-2 border-l-emerald-500/60 bg-emerald-500/5' : 'border-l-2 border-l-transparent'
                      }`}
                    >
                      {/* Team */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border"
                          style={{ backgroundColor: team.color + '20', borderColor: team.color + '40' }}
                        >
                          <span className="text-[8px] font-black" style={{ color: team.color === '#1C1C2B' ? '#94a3b8' : team.color }}>
                            {team.code.substring(0, 2)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-black text-white">{team.code}</span>
                          <span className="text-[10px] text-slate-500 font-medium ml-1.5 hidden sm:inline">({team.name})</span>
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
                  ))}

                  {/* Qualification Legend */}
                  <div className="px-4 py-2.5 flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                    <div className="w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500/40"></div>
                    Playoff Qualification Zone
                  </div>
                </div>
              )}

              {/* ═══ FIXTURES ═══ */}
              {activeTab === 'fixtures' && (
                <div className="space-y-3">
                  {FIXTURES.map(fix => (
                    <div key={fix.id} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center justify-between hover:bg-white/8 transition-colors">
                      <div className="flex items-center gap-6">
                        {/* Team A */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                            <span className="text-[9px] font-black text-slate-300">{fix.teamA}</span>
                          </div>
                          <span className="text-sm font-black">{fix.teamA}</span>
                        </div>
                        {/* VS */}
                        <span className="text-[10px] font-bold text-slate-600 uppercase">vs</span>
                        {/* Team B */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                            <span className="text-[9px] font-black text-slate-300">{fix.teamB}</span>
                          </div>
                          <span className="text-sm font-black">{fix.teamB}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-black text-blue-400 tabular-nums">{fix.time}</p>
                        <p className="text-[10px] text-slate-500 font-bold">{fix.date}</p>
                        <p className="text-[9px] text-slate-600 font-medium hidden sm:block">{fix.venue}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ═══ CAP LEADERS ═══ */}
              {activeTab === 'leaders' && (
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Orange Cap */}
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                        <Flame size={20} className="text-orange-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-orange-400">Orange Cap</h3>
                        <p className="text-[10px] text-slate-500 font-medium">Most Runs</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500/30 to-amber-500/20 border border-orange-500/30 flex items-center justify-center">
                        <Star size={20} className="text-orange-400" />
                      </div>
                      <div>
                        <p className="text-lg font-black">Virat Kohli</p>
                        <p className="text-[10px] text-slate-500 font-bold">RCB • 14 Innings</p>
                        <div className="flex gap-4 mt-1.5 text-[10px] font-bold">
                          <span className="text-orange-400">741 Runs</span>
                          <span className="text-slate-500">SR: 158.2</span>
                          <span className="text-slate-500">Avg: 52.9</span>
                        </div>
                      </div>
                    </div>
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
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center">
                        <Star size={20} className="text-purple-400" />
                      </div>
                      <div>
                        <p className="text-lg font-black">Jasprit Bumrah</p>
                        <p className="text-[10px] text-slate-500 font-bold">MI • 14 Innings</p>
                        <div className="flex gap-4 mt-1.5 text-[10px] font-bold">
                          <span className="text-purple-400">24 Wickets</span>
                          <span className="text-slate-500">Econ: 6.78</span>
                          <span className="text-slate-500">Avg: 15.4</span>
                        </div>
                      </div>
                    </div>
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
