"use client";
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bell, Trophy, Zap } from 'lucide-react';

export default function MatchCard({ match, teams, variant = 'auto' }) {
  const getTeamCode = (teamId) => teams[teamId]?.shortName || 'TBD';
  const getTeamName = (teamId) => teams[teamId]?.name || teams[teamId]?.shortName || 'TBD';
  const getTeamLogo = (teamId) => teams[teamId]?.logoUrl || null;

  const isLive = match.status === 'live';
  const isFinished = match.status === 'completed';
  const isUpcoming = match.status === 'upcoming' || match.status === 'ready';

  const innings1 = match.score?.innings1;
  const innings2 = match.score?.innings2;

  const winnerId = match.result?.winner;

  // Format scheduled time
  const getScheduledTime = () => {
    if (!match.scheduledTime) return { time: 'TBD', label: 'Scheduled' };
    const d = new Date(match.scheduledTime);
    const now = new Date();
    const diffMs = d - now;

    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (diffMs < 0) return { time, label: d.toLocaleDateString([], { dateStyle: 'medium' }) };
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return { time, label: 'Tomorrow' };
    if (d.toDateString() === now.toDateString()) {
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      if (diffHrs > 0) return { time, label: `In ${diffHrs}h ${diffMins}m` };
      return { time, label: `In ${diffMins}m` };
    }
    return { time, label: d.toLocaleDateString([], { month: 'short', day: 'numeric' }) };
  };

  // Team Logo/Avatar component
  const TeamAvatar = ({ teamId, size = 'md' }) => {
    const sizeClasses = size === 'lg' ? 'w-10 h-10' : 'w-7 h-7';
    const textSize = size === 'lg' ? 'text-[10px]' : 'text-[9px]';
    return (
      <div className={`${sizeClasses} rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 flex-shrink-0`}>
        {getTeamLogo(teamId) ? (
          <img src={getTeamLogo(teamId)} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className={`${textSize} font-black text-slate-500`}>{getTeamCode(teamId).substring(0, 2)}</span>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════
  // LAYOUT A: UPCOMING — 3-column split
  // ═══════════════════════════════════════════
  if (isUpcoming) {
    const scheduled = getScheduledTime();
    return (
      <Link href={`/match/${match.id}`} className="block w-full group">
        <motion.div 
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.995 }}
          className="w-full glass-card rounded-2xl overflow-hidden border border-slate-200/60 hover:border-emerald-300/50 hover:shadow-lg transition-all"
        >
          {/* Context Header */}
          <div className="flex justify-between items-center px-4 pt-3 pb-1.5">
            <span className="text-[10px] font-medium text-slate-400 truncate pr-4">
              {match.matchName || match.stage || 'Match'} • {match.overs} overs
            </span>
            <Bell size={13} className="text-slate-300 hover:text-slate-500 transition-colors cursor-pointer flex-shrink-0" />
          </div>

          {/* 3-Column: Team A | Time | Team B */}
          <div className="px-4 pb-4 pt-2 flex items-center justify-between">
            {/* Left: Team A */}
            <div className="flex flex-col items-center gap-1.5 w-[30%]">
              <TeamAvatar teamId={match.teamA} size="lg" />
              <span className="text-xs font-bold text-slate-800 text-center leading-tight">{getTeamName(match.teamA)}</span>
            </div>

            {/* Center: Time */}
            <div className="flex flex-col items-center gap-0.5 w-[40%]">
              <span className="text-lg font-black text-slate-900 tabular-nums">{scheduled.time}</span>
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">{scheduled.label}</span>
            </div>

            {/* Right: Team B */}
            <div className="flex flex-col items-center gap-1.5 w-[30%]">
              <TeamAvatar teamId={match.teamB} size="lg" />
              <span className="text-xs font-bold text-slate-800 text-center leading-tight">{getTeamName(match.teamB)}</span>
            </div>
          </div>
        </motion.div>
      </Link>
    );
  }

  // ═══════════════════════════════════════════
  // LAYOUT B: LIVE / FINISHED — score-focused horizontal split
  // ═══════════════════════════════════════════
  const teamAIsWinner = winnerId === match.teamA;
  const teamBIsWinner = winnerId === match.teamB;

  return (
    <Link href={`/match/${match.id}`} className="block w-full group">
      <motion.div 
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.995 }}
        className="w-full glass-card rounded-2xl overflow-hidden border border-slate-200/60 hover:border-emerald-300/50 hover:shadow-lg transition-all"
      >
        {/* Context Header */}
        <div className="flex justify-between items-center px-4 pt-3 pb-1.5">
          <span className="text-[10px] font-medium text-slate-400 truncate pr-4">
            {match.matchName || match.stage || 'Match'} • {match.overs} overs
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isLive && (
              <span className="flex items-center gap-1.5 text-[9px] font-black text-red-500 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                Live
              </span>
            )}
            <Bell size={13} className="text-slate-300 hover:text-slate-500 transition-colors cursor-pointer" />
          </div>
        </div>

        {/* Score Split: Team A | vs | Team B */}
        <div className="px-4 pb-3 pt-2 flex items-center justify-between">
          {/* Left: Team A */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <TeamAvatar teamId={match.teamA} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-slate-900">{getTeamCode(match.teamA)}</span>
                {teamAIsWinner && <Trophy size={11} className="text-amber-500 flex-shrink-0" />}
              </div>
              {innings1 && (
                <span className="text-xs font-bold text-slate-600 tabular-nums">
                  {innings1.runs}-{innings1.wickets} <span className="text-[10px] text-slate-400">{innings1.overs}</span>
                </span>
              )}
            </div>
          </div>

          {/* Center Separator */}
          <div className="px-3 flex-shrink-0">
            <Zap size={14} className="text-slate-300" />
          </div>

          {/* Right: Team B */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
            <div className="min-w-0 text-right">
              <div className="flex items-center gap-1.5 justify-end">
                {teamBIsWinner && <Trophy size={11} className="text-amber-500 flex-shrink-0" />}
                <span className="text-sm font-black text-slate-900">{getTeamCode(match.teamB)}</span>
              </div>
              {(innings2 && (innings2.runs > 0 || innings2.overs > 0 || match.currentInnings === 2)) ? (
                <span className="text-xs font-bold text-slate-600 tabular-nums">
                  {innings2.runs}-{innings2.wickets} <span className="text-[10px] text-slate-400">{innings2.overs}</span>
                </span>
              ) : isLive && match.currentInnings === 1 ? (
                <span className="text-[10px] text-slate-400 font-medium">Yet to bat</span>
              ) : null}
            </div>
            <TeamAvatar teamId={match.teamB} />
          </div>
        </div>

        {/* Status Footer */}
        <div className="px-4 pb-3 pt-1.5 border-t border-slate-100">
          {isLive && (
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-emerald-600">
                CRR: {(() => {
                  const inKey = match.currentInnings === 1 ? 'innings1' : 'innings2';
                  const o = match.score[inKey]?.overs || 0;
                  const r = match.score[inKey]?.runs || 0;
                  return o > 0 ? (r / (Math.floor(o) + ((o % 1) * 10 / 6))).toFixed(2) : '0.00';
                })()}
              </span>
              {match.currentInnings === 2 && innings1 && (
                <span className="text-[10px] font-bold text-slate-500">
                  Need {(innings1.runs + 1) - (innings2?.runs || 0)} runs
                </span>
              )}
            </div>
          )}
          {isFinished && (
            <p className="text-[10px] font-bold text-emerald-600 text-center">
              {teams[winnerId]?.shortName || 'Unknown'} Won
            </p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
