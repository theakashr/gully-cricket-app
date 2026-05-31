"use client";
import { useRouter } from 'next/navigation';

export default function MobileMatchCard({ match, teams, tournamentName = "Unknown Tournament" }) {
  const router = useRouter();
  
  const getTeamCode = (teamId) => teams[teamId]?.shortName || 'TBD';
  const getTeamName = (teamId) => teams[teamId]?.name || teams[teamId]?.shortName || 'TBD';

  const isLive = match.status === 'live';
  const isFinished = match.status === 'completed';
  const isUpcoming = match.status === 'upcoming' || match.status === 'ready';

  const innings1 = match.score?.innings1;
  const innings2 = match.score?.innings2;

  // Decide colors based on team code for avatars
  const getAvatarColor = (idx) => {
    const colors = [
      'bg-blue-100 text-blue-600',
      'bg-yellow-100 text-yellow-600',
      'bg-purple-100 text-purple-600',
      'bg-emerald-100 text-emerald-600',
      'bg-slate-100 text-slate-600'
    ];
    return colors[idx % colors.length];
  };

  const handlePress = () => {
    router.push(`/match/${match.id}`);
  };

  if (isLive) {
    // Current batting team logic
    const currentInning = match.score?.currentInning || 1;
    const battingTeamId = currentInning === 1 ? match.score?.tossWinner : (match.teamA === match.score?.tossWinner ? match.teamB : match.teamA);
    const isTeam1Batting = battingTeamId === match.teamA;

    return (
      <article 
        onClick={handlePress}
        className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden active:scale-[0.98] transition-transform cursor-pointer shadow-sm"
      >
        <div className="px-4 py-3 border-b border-[#E5E7EB] flex justify-between items-center bg-gray-50/50">
          <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase">{tournamentName}</span>
          <div className="flex items-center gap-1.5 bg-[#FFF0F0] px-2 py-1 rounded-md">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF4D4F] animate-live-dot"></div>
            <span className="text-[10px] font-black text-[#FF4D4F] tracking-widest uppercase">Live</span>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Team A */}
          <div className={`flex justify-between items-center ${isTeam1Batting ? 'animate-score-flash rounded-lg p-1 -mx-1' : ''}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full ${getAvatarColor(0)} flex items-center justify-center font-black text-[10px]`}>
                {getTeamCode(match.teamA).substring(0, 3)}
              </div>
              <span className="font-bold text-sm flex items-center gap-1.5">
                {getTeamName(match.teamA)} 
                {isTeam1Batting && <span className="text-[#00A854] text-[10px]">🏏</span>}
              </span>
            </div>
            <div className="text-right">
              <div className={`font-black text-lg ${isTeam1Batting ? 'text-[#00A854]' : ''}`}>
                {innings1?.runs || 0}/{innings1?.wickets || 0}
              </div>
              <div className="text-[10px] text-gray-400 font-bold tracking-wider">
                {innings1?.overs || 0}.{innings1?.balls || 0} OV
              </div>
            </div>
          </div>
          
          {/* Team B */}
          <div className={`flex justify-between items-center ${!isTeam1Batting ? 'animate-score-flash rounded-lg p-1 -mx-1' : ''}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full ${getAvatarColor(1)} flex items-center justify-center font-black text-[10px]`}>
                {getTeamCode(match.teamB).substring(0, 3)}
              </div>
              <span className="font-bold text-sm flex items-center gap-1.5">
                {getTeamName(match.teamB)}
                {!isTeam1Batting && <span className="text-[#00A854] text-[10px]">🏏</span>}
              </span>
            </div>
            <div className="text-right">
              {currentInning > 1 ? (
                <>
                  <div className={`font-black text-lg ${!isTeam1Batting ? 'text-[#00A854]' : ''}`}>
                    {innings2?.runs || 0}/{innings2?.wickets || 0}
                  </div>
                  <div className="text-[10px] text-gray-400 font-bold tracking-wider">
                    {innings2?.overs || 0}.{innings2?.balls || 0} OV
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-400 font-bold tracking-wider pt-2">Yet to bat</div>
              )}
            </div>
          </div>
        </div>
        
        {currentInning > 1 && match.score?.target && (
          <div className="px-4 py-3 bg-[#E6F6ED] text-[#00A854] text-[11px] font-bold border-t border-[#00A854]/10">
            {getTeamName(battingTeamId)} needs {match.score.target - (innings2?.runs || 0)} runs to win
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
        onClick={handlePress}
        className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden active:scale-[0.98] transition-transform cursor-pointer shadow-sm opacity-80"
      >
        <div className="px-4 py-3 border-b border-[#E5E7EB] flex justify-between items-center bg-gray-50/50">
          <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase">{tournamentName}</span>
          <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-md">
            <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">Result</span>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-600 text-[10px]`}>
                {getTeamCode(match.teamA).substring(0, 3)}
              </div>
              <span className={`font-bold text-sm ${match.result?.winner === match.teamA ? 'text-slate-900' : 'text-slate-500'}`}>
                {getTeamName(match.teamA)}
              </span>
            </div>
            <div className="text-right">
              <div className="font-black text-lg">{innings1?.runs || 0}/{innings1?.wickets || 0}</div>
              <div className="text-[10px] text-gray-400 font-bold tracking-wider">{innings1?.overs || 0}.{innings1?.balls || 0} OV</div>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-600 text-[10px]`}>
                {getTeamCode(match.teamB).substring(0, 3)}
              </div>
              <span className={`font-bold text-sm ${match.result?.winner === match.teamB ? 'text-slate-900' : 'text-slate-500'}`}>
                {getTeamName(match.teamB)}
              </span>
            </div>
            <div className="text-right">
              {match.score?.innings2 ? (
                <>
                  <div className="font-black text-lg">{innings2?.runs || 0}/{innings2?.wickets || 0}</div>
                  <div className="text-[10px] text-gray-400 font-bold tracking-wider">{innings2?.overs || 0}.{innings2?.balls || 0} OV</div>
                </>
              ) : (
                <div className="text-xs text-gray-400 font-bold tracking-wider pt-2">Yet to bat</div>
              )}
            </div>
          </div>
        </div>
        
        <div className="px-4 py-3 bg-gray-50 text-gray-600 text-[11px] font-bold border-t border-[#E5E7EB]">
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
      onClick={handlePress}
      className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden active:scale-[0.98] transition-transform cursor-pointer shadow-sm"
    >
      <div className="px-4 py-3 border-b border-[#E5E7EB] flex justify-between items-center bg-gray-50/50">
        <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase">{tournamentName}</span>
        <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-md">
          <span className="text-[10px] font-black text-blue-600 tracking-widest uppercase">Upcoming</span>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-600 text-[10px]">
              {getTeamCode(match.teamA).substring(0, 3)}
            </div>
            <span className="font-bold text-sm">{getTeamName(match.teamA)}</span>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-600 text-[10px]">
              {getTeamCode(match.teamB).substring(0, 3)}
            </div>
            <span className="font-bold text-sm">{getTeamName(match.teamB)}</span>
          </div>
        </div>
      </div>
      
      <div className="px-4 py-3 bg-gray-50 text-gray-600 text-[11px] font-bold border-t border-[#E5E7EB] flex justify-between items-center">
        <span>Match {match.overs} Overs</span>
        <span>{getScheduledText()}</span>
      </div>
    </article>
  );
}
