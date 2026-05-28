"use client";
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';

export default function MatchCard({ match, teams, tournamentName }) {
  const getTeamCode = (teamId) => teams[teamId]?.shortName || 'TBD';
  const getTeamLogo = (teamId) => teams[teamId]?.logoUrl || null;

  const isLive = match.status === 'live';
  const isFinished = match.status === 'completed';
  const isUpcoming = match.status === 'upcoming' || match.status === 'ready';

  const innings1 = match.score?.innings1;
  const innings2 = match.score?.innings2;

  // Format scheduled time
  const getScheduledDisplay = () => {
    if (!match.scheduledTime) return null;
    const d = new Date(match.scheduledTime);
    const now = new Date();
    const diffMs = d - now;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffMs < 0) return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    
    // Check if tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (d.toDateString() === now.toDateString()) {
      if (diffHrs > 0) return `Starts in ${diffHrs}h ${diffMins}m`;
      return `Starts in ${diffMins}m`;
    }
    return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  };

  // Build result text
  const getResultText = () => {
    if (!isFinished || !match.result) return null;
    const winnerName = teams[match.result.winner]?.shortName || 'Unknown';
    return `${winnerName} Won`;
  };

  return (
    <Link href={`/match/${match.id}`} className="block w-full group">
      <motion.div 
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.995 }}
        className="w-full glass-card rounded-2xl overflow-hidden border border-slate-200/60 hover:border-emerald-300/50 hover:shadow-lg transition-all"
      >
        {/* Top Context Row */}
        <div className="flex justify-between items-center px-4 pt-3 pb-2">
          <span className="text-[11px] font-medium text-slate-400 truncate pr-4">
            {match.matchName || match.stage || 'Match Center'} • {match.overs} overs
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isLive && (
              <span className="flex items-center gap-1.5 text-[10px] font-black text-red-500 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                Live
              </span>
            )}
            <Bell size={14} className="text-slate-300 hover:text-slate-500 transition-colors cursor-pointer" />
          </div>
        </div>

        {/* Match Body */}
        <div className="px-4 pb-4 space-y-2.5">
          {/* Team A Row */}
          <div className={`flex items-center justify-between py-1.5 pl-2.5 border-l-[3px] rounded-sm ${
            isLive && match.currentInnings === 1 ? 'border-l-emerald-500' : 'border-l-transparent'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 flex-shrink-0">
                {getTeamLogo(match.teamA) ? (
                  <img src={getTeamLogo(match.teamA)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[9px] font-black text-slate-500">{getTeamCode(match.teamA).substring(0, 2)}</span>
                )}
              </div>
              <span className="text-sm font-bold text-slate-800">{getTeamCode(match.teamA)}</span>
            </div>
            <div className="text-right">
              {(isLive || isFinished) && innings1 ? (
                <span className="text-sm font-black text-slate-900 tabular-nums">
                  {innings1.runs}/{innings1.wickets} <span className="text-[10px] font-medium text-slate-400">({innings1.overs})</span>
                </span>
              ) : null}
            </div>
          </div>

          {/* Team B Row */}
          <div className={`flex items-center justify-between py-1.5 pl-2.5 border-l-[3px] rounded-sm ${
            isLive && match.currentInnings === 2 ? 'border-l-emerald-500' : 'border-l-transparent'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 flex-shrink-0">
                {getTeamLogo(match.teamB) ? (
                  <img src={getTeamLogo(match.teamB)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[9px] font-black text-slate-500">{getTeamCode(match.teamB).substring(0, 2)}</span>
                )}
              </div>
              <span className="text-sm font-bold text-slate-800">{getTeamCode(match.teamB)}</span>
            </div>
            <div className="text-right">
              {(isLive || isFinished) && innings2 && (innings2.runs > 0 || innings2.overs > 0 || match.currentInnings === 2) ? (
                <span className="text-sm font-black text-slate-900 tabular-nums">
                  {innings2.runs}/{innings2.wickets} <span className="text-[10px] font-medium text-slate-400">({innings2.overs})</span>
                </span>
              ) : (isLive && match.currentInnings === 1) ? (
                <span className="text-[10px] text-slate-400 font-medium">Yet to bat</span>
              ) : null}
            </div>
          </div>

          {/* Status Footer */}
          <div className="pt-2 border-t border-slate-100">
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
              <p className="text-[11px] font-bold text-emerald-600">{getResultText()}</p>
            )}

            {isUpcoming && (
              <p className="text-[11px] font-bold text-amber-500">
                {getScheduledDisplay() || 'Scheduled'}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
