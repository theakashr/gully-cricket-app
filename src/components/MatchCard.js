"use client";
import { useRouter } from 'next/navigation';

export default function MatchCard({ match, teams, tournamentName, index = 0 }) {
  const router = useRouter();

  // Create a staggered delay class (up to 6)
  const staggerClass = `stagger-${Math.min(index + 1, 6)}`;

  const isLive = match.status === 'live';
  const isFinished = match.status === 'completed';
  const isUpcoming = match.status === 'upcoming' || match.status === 'ready';

  const innings1 = match.score?.innings1;
  const innings2 = match.score?.innings2;

  const currentInning = match.score?.currentInning || 1;
  const battingTeamId = currentInning === 1 ? match.score?.tossWinner : (match.teamA === match.score?.tossWinner ? match.teamB : match.teamA);
  const isTeam1Batting = battingTeamId === match.teamA;

  const getTeamName = (teamId) => teams[teamId]?.name || teams[teamId]?.shortName || 'Unknown Team';

  const navigateToMatch = () => {
    router.push(`/match/${match.id}`);
  };

  if (isLive) {
    return (
      <article 
        onClick={navigateToMatch}
        className={`bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden active:scale-[0.98] transition-transform cursor-pointer shadow-sm animate-slide-up-fade ${staggerClass}`}
      >
        {/* Card Header */}
        <div className="px-4 py-2.5 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
          <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase">{tournamentName || 'Gully Match'}</span>
          <div className="flex items-center gap-1.5 bg-[#FFF0F0] px-2 py-1 rounded-md">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF4D4F] animate-[livePulse_2s_ease-in-out_infinite] neon-live-badge"></div>
            <span className="text-[10px] font-black text-[#FF4D4F] tracking-widest uppercase">Live</span>
          </div>
        </div>
        
        {/* Card Body */}
        <div className="p-4 space-y-4">
          {/* Team 1 */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm md:text-base capitalize text-[#111827]">
                {getTeamName(match.teamA)}
              </span>
              {isTeam1Batting && (
                <div className="flex items-center justify-center w-4 h-4 bg-[#E6F6ED] rounded-full">
                  <div className="w-1.5 h-1.5 bg-[#00A854] rounded-full neon-batting-dot"></div>
                </div>
              )}
            </div>
            <div className="text-right flex flex-col justify-end">
              <span className={`font-black text-lg md:text-xl leading-none ${isTeam1Batting ? 'text-[#00A854]' : 'text-gray-500'}`}>
                {innings1?.runs || 0}<span className={`text-sm font-bold ${isTeam1Batting ? 'text-[#00A854]/70' : 'text-gray-400'}`}>/{innings1?.wickets || 0}</span>
              </span>
              <span className="text-[10px] text-gray-400 font-bold tracking-wider mt-1">
                {innings1?.overs || 0}.{innings1?.balls || 0} OV
              </span>
            </div>
          </div>
          
          {/* Team 2 */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm md:text-base capitalize text-[#111827]">
                {getTeamName(match.teamB)}
              </span>
              {!isTeam1Batting && currentInning > 1 && (
                <div className="flex items-center justify-center w-4 h-4 bg-[#E6F6ED] rounded-full">
                  <div className="w-1.5 h-1.5 bg-[#00A854] rounded-full neon-batting-dot"></div>
                </div>
              )}
            </div>
            <div className="text-right flex flex-col justify-end">
              {currentInning > 1 ? (
                <>
                  <span className={`font-black text-lg md:text-xl leading-none ${!isTeam1Batting ? 'text-[#00A854]' : 'text-gray-500'}`}>
                    {innings2?.runs || 0}<span className={`text-sm font-bold ${!isTeam1Batting ? 'text-[#00A854]/70' : 'text-gray-400'}`}>/{innings2?.wickets || 0}</span>
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold tracking-wider mt-1">
                    {innings2?.overs || 0}.{innings2?.balls || 0} OV
                  </span>
                </>
              ) : (
                <span className="font-bold text-xs text-gray-400 uppercase tracking-wider mt-1">Yet to bat</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Card Footer */}
        {currentInning > 1 && match.score?.target ? (
          <div className="px-4 py-2.5 bg-[#E6F6ED] text-[#00A854] text-[11px] font-bold border-t border-[#00A854]/10">
            {getTeamName(battingTeamId)} needs {match.score.target - (innings2?.runs || 0)} runs from {((match.overs * 6) - ((innings2?.overs || 0) * 6 + (innings2?.balls || 0)))} balls
          </div>
        ) : (
          <div className="px-4 py-2.5 bg-gray-50 text-gray-500 text-[11px] font-bold border-t border-[#E5E7EB]">
            1st Innings
          </div>
        )}
      </article>
    );
  }

  if (isFinished) {
    const getResultText = () => {
      if (!match.result) return "Match Completed";
      if (match.result.winner === 'tie') return "Match Tied";
      const winnerName = getTeamName(match.result.winner);
      if (match.result.marginType === 'runs') {
        return `${winnerName} won by ${match.result.margin} runs`;
      }
      return `${winnerName} won by ${match.result.margin} wickets`;
    };

    return (
      <article 
        onClick={navigateToMatch}
        className={`bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden active:scale-[0.98] transition-transform cursor-pointer shadow-sm opacity-80 animate-slide-up-fade ${staggerClass}`}
      >
        <div className="px-4 py-2.5 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
          <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase">{tournamentName || 'Gully Match'}</span>
          <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-md">
            <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">Result</span>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-start">
            <span className="font-bold text-sm md:text-base capitalize text-[#111827]">
              {getTeamName(match.teamA)}
            </span>
            <div className="text-right flex flex-col justify-end">
              <span className={`font-black text-lg md:text-xl leading-none ${match.result?.winner === match.teamA ? 'text-[#00A854]' : 'text-gray-500'}`}>
                {innings1?.runs || 0}<span className="text-sm font-bold">/{innings1?.wickets || 0}</span>
              </span>
              <span className="text-[10px] text-gray-400 font-bold tracking-wider mt-1">{innings1?.overs || 0}.{innings1?.balls || 0} OV</span>
            </div>
          </div>
          
          <div className="flex justify-between items-start">
            <span className="font-bold text-sm md:text-base capitalize text-[#111827]">
              {getTeamName(match.teamB)}
            </span>
            <div className="text-right flex flex-col justify-end">
              {match.score?.innings2 ? (
                <>
                  <span className={`font-black text-lg md:text-xl leading-none ${match.result?.winner === match.teamB ? 'text-[#00A854]' : 'text-gray-500'}`}>
                    {innings2?.runs || 0}<span className="text-sm font-bold">/{innings2?.wickets || 0}</span>
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold tracking-wider mt-1">{innings2?.overs || 0}.{innings2?.balls || 0} OV</span>
                </>
              ) : (
                <span className="font-bold text-xs text-gray-400 uppercase tracking-wider mt-1">Yet to bat</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="px-4 py-2.5 bg-gray-50 text-gray-600 text-[11px] font-bold border-t border-[#E5E7EB]">
          {getResultText()}
        </div>
      </article>
    );
  }

  // Upcoming
  const getScheduledText = () => {
    if (!match.scheduledTime) return 'Scheduled';
    const d = new Date(match.scheduledTime);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <article 
      onClick={navigateToMatch}
      className={`bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden active:scale-[0.98] transition-transform cursor-pointer shadow-sm animate-slide-up-fade ${staggerClass}`}
    >
      <div className="px-4 py-2.5 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
        <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase">{tournamentName || 'Gully Match'}</span>
        <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-md">
          <span className="text-[10px] font-black text-blue-600 tracking-widest uppercase">Upcoming</span>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        <span className="font-bold text-sm md:text-base text-[#111827] capitalize block">{getTeamName(match.teamA)}</span>
        <span className="font-bold text-sm md:text-base text-[#111827] capitalize block">{getTeamName(match.teamB)}</span>
      </div>
      
      <div className="px-4 py-2.5 bg-gray-50 text-gray-600 text-[11px] font-bold border-t border-[#E5E7EB] flex justify-between items-center">
        <span>Match {match.overs} Overs</span>
        <span>{getScheduledText()}</span>
      </div>
    </article>
  );
}
