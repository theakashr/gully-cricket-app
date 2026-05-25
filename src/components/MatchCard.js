"use client";
import Link from 'next/link';

export default function MatchCard({ match, teams }) {
  const getTeamCode = (teamId) => teams[teamId]?.shortName || 'TBD';

  const isLive = match.status === 'live';
  const isFinished = match.status === 'completed';
  const isUpcoming = match.status === 'upcoming';

  const inningsKey = match.currentInnings === 1 ? 'innings1' : 'innings2';
  const runs = match.score?.[inningsKey]?.runs || 0;
  const wickets = match.score?.[inningsKey]?.wickets || 0;
  const overs = match.score?.[inningsKey]?.overs || 0;

  return (
    <Link href={`/match/${match.id}`} className="block relative z-10 group">
      <div className="glass-card rounded-3xl p-6 sm:p-8 overflow-hidden group-hover:bg-white/5 transition-colors relative">
        <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${
          isLive ? 'from-[var(--color-cricket-blue)] to-[var(--color-cricket-accent)]' :
          isFinished ? 'from-green-500 to-emerald-400' :
          'from-gray-600 to-gray-400'
        }`}></div>
        
        <div className="flex justify-between items-center mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Match Center</span>
          <span className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-2 uppercase tracking-wider ${
            isLive ? 'bg-red-500/20 text-red-500' : 
            isFinished ? 'bg-green-500/20 text-green-500' :
            'bg-gray-800 text-gray-400'
          }`}>
            {isLive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
            {match.status}
          </span>
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <div className="text-center w-[40%]">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-lg mx-auto border ${
              isLive ? 'bg-gray-800 border-[var(--color-cricket-accent)]/30' : 'bg-gray-800 border-gray-700'
            }`}>
              <span className={`text-xl font-black ${isLive ? 'text-white' : 'text-gray-400'}`}>{getTeamCode(match.teamA)}</span>
            </div>
            {(isLive || isFinished) && (
               <>
                 <h3 className="text-3xl font-black text-white">{runs}<span className="text-gray-400 text-xl">/{wickets}</span></h3>
                 <p className="text-gray-400 font-medium text-sm mt-1">Overs: {overs}</p>
               </>
            )}
            {isUpcoming && <h3 className="text-xl font-bold text-gray-500 mt-2">Team A</h3>}
          </div>
          
          <div className="text-center w-[20%] px-2">
            <span className={`text-3xl font-black italic ${isLive ? 'text-[var(--color-cricket-accent)]' : 'text-gray-600'}`}>VS</span>
          </div>
          
          <div className="text-center w-[40%]">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-lg border mx-auto ${
               (isLive && match.currentInnings === 2) ? 'bg-gray-800 border-[var(--color-cricket-accent)]/30' : 'bg-gray-800 border-gray-700'
            }`}>
              <span className={`text-xl font-black ${isLive && match.currentInnings === 2 ? 'text-white' : 'text-gray-500'}`}>{getTeamCode(match.teamB)}</span>
            </div>
            
            {isUpcoming && <h3 className="text-xl font-bold text-gray-500 mt-2">Team B</h3>}
            {isLive && match.currentInnings === 1 && <h3 className="text-sm font-bold text-gray-500 mt-4">Yet to bat</h3>}
            {isFinished && match.result && (
               <p className="text-xs font-bold text-green-500 uppercase tracking-widest mt-4">Winner: {teams[match.result.winner]?.shortName}</p>
            )}
          </div>
        </div>
        
        {/* Call to action */}
        <div className="mt-6 flex justify-center">
           <span className="bg-[var(--color-cricket-accent)]/10 text-[var(--color-cricket-accent)] border border-[var(--color-cricket-accent)]/20 text-xs font-bold px-4 py-2 rounded-full group-hover:bg-[var(--color-cricket-accent)] group-hover:text-black transition-all">
             {isLive ? 'View Live Scorecard' : isFinished ? 'View Match Results' : 'View Match Details'}
           </span>
        </div>
      </div>
    </Link>
  );
}
