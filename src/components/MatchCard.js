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
    <Link href={`/match/${match.id}`} className="block relative z-10 group hover:-translate-y-2 transition-transform duration-300">
      <div className="glass-card rounded-3xl p-6 sm:p-8 overflow-hidden hover:shadow-2xl transition-all relative border border-gray-100 bg-white">
        <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${
          isLive ? 'from-red-500 to-orange-400' :
          isFinished ? 'from-green-400 to-emerald-300' :
          'from-gray-300 to-gray-200'
        }`}></div>
        
        <div className="flex justify-between items-center mb-8">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Match Center</span>
          <span className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-2 uppercase tracking-wider ${
            isLive ? 'bg-red-50 text-red-600 border border-red-200 shadow-sm' : 
            isFinished ? 'bg-green-50 text-green-600 border border-green-200' :
            'bg-gray-50 text-gray-500 border border-gray-200'
          }`}>
            {isLive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
            {match.status}
          </span>
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <div className="text-center w-[40%]">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-md mx-auto border bg-white ${
              isLive ? 'border-red-300 shadow-red-500/10' : 'border-gray-200'
            }`}>
              <span className={`text-xl font-black ${isLive ? 'text-gray-900' : 'text-gray-400'}`}>{getTeamCode(match.teamA)}</span>
            </div>
            {(isLive || isFinished) && (
               <>
                 <h3 className="text-3xl font-black text-gray-900">{runs}<span className="text-gray-400 text-xl font-bold">/{wickets}</span></h3>
                 <p className="text-gray-500 font-bold text-xs mt-1 bg-gray-50 inline-block px-2 py-0.5 rounded-md border border-gray-100">Ovs: {overs}</p>
               </>
            )}
            {isUpcoming && <h3 className="text-xl font-bold text-gray-500 mt-2">Team A</h3>}
          </div>
          
          <div className="text-center w-[20%] px-2">
            <span className={`text-2xl font-black italic bg-gray-100 px-3 py-1 rounded-full text-gray-400 shadow-inner`}>VS</span>
          </div>
          
          <div className="text-center w-[40%]">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-md mx-auto border bg-white ${
               (isLive && match.currentInnings === 2) ? 'border-red-300 shadow-red-500/10' : 'border-gray-200'
            }`}>
              <span className={`text-xl font-black ${isLive && match.currentInnings === 2 ? 'text-gray-900' : 'text-gray-400'}`}>{getTeamCode(match.teamB)}</span>
            </div>
            
            {isUpcoming && <h3 className="text-xl font-bold text-gray-400 mt-2">Team B</h3>}
            {isLive && match.currentInnings === 1 && <h3 className="text-xs font-bold text-gray-400 mt-4 bg-gray-50 inline-block px-2 py-1 rounded-md">Yet to bat</h3>}
            {isFinished && match.result && (
               <p className="text-[10px] font-black text-white bg-green-500 uppercase tracking-widest mt-4 inline-block px-2 py-1 rounded-md shadow-sm">Winner: {teams[match.result.winner]?.shortName}</p>
            )}
          </div>
        </div>
        
        {/* Call to action */}
        <div className="mt-8 flex justify-center">
           <span className="bg-white text-[var(--color-cricket-blue)] border border-[var(--color-cricket-blue)] shadow-sm text-xs font-black px-6 py-2.5 rounded-full group-hover:bg-[var(--color-cricket-blue)] group-hover:text-white transition-all uppercase tracking-widest">
             {isLive ? 'Live Scorecard' : isFinished ? 'Match Results' : 'Match Details'}
           </span>
        </div>
      </div>
    </Link>
  );
}
