"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

export default function CompactMatchCard({ match, teams, tournamentName = "Unknown Tournament" }) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getTeamName = (teamId) => teams[teamId]?.name || teams[teamId]?.shortName || 'TBD';

  const isLive = match.status === 'live';
  const isFinished = match.status === 'completed';
  const isUpcoming = match.status === 'upcoming' || match.status === 'ready';

  const innings1 = match.score?.innings1;
  const innings2 = match.score?.innings2;

  const currentInning = match.score?.currentInning || 1;
  const battingTeamId = currentInning === 1 ? match.score?.tossWinner : (match.teamA === match.score?.tossWinner ? match.teamB : match.teamA);
  const isTeam1Batting = battingTeamId === match.teamA;

  const handlePress = () => {
    setIsExpanded(!isExpanded);
  };

  const navigateToMatch = (e) => {
    e.stopPropagation();
    router.push(`/match/${match.id}`);
  };

  const calculateCRR = (runs, overs, balls) => {
    const totalBalls = (overs * 6) + balls;
    if (totalBalls === 0) return '0.00';
    return ((runs / totalBalls) * 6).toFixed(2);
  };

  if (isLive) {
    return (
      <article className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden active:scale-[0.98] transition-transform shadow-sm">
        <div 
          onClick={handlePress} 
          className="p-4 cursor-pointer"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-1.5 bg-[#FFF0F0] px-2 py-1 rounded-md">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF4D4F] animate-[livePulse_2s_ease-in-out_infinite] neon-live-dot"></div>
              <span className="text-[10px] font-black text-[#FF4D4F] tracking-widest uppercase">Live</span>
            </div>
            <ChevronDown size={16} className={`text-gray-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className={`font-bold text-base flex items-center gap-1.5 ${isTeam1Batting ? 'text-[#1F2937]' : 'text-gray-500'}`}>
                {getTeamName(match.teamA)}
                {isTeam1Batting && <span className="text-[10px]">🏏</span>}
              </span>
              <span className={`font-black text-lg ${isTeam1Batting ? 'text-[#00A854]' : 'text-gray-500'}`}>
                {innings1?.runs || 0}/{innings1?.wickets || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`font-bold text-base flex items-center gap-1.5 ${!isTeam1Batting ? 'text-[#1F2937]' : 'text-gray-500'}`}>
                {getTeamName(match.teamB)}
                {!isTeam1Batting && <span className="text-[10px]">🏏</span>}
              </span>
              {currentInning > 1 ? (
                <span className={`font-black text-lg ${!isTeam1Batting ? 'text-[#00A854]' : 'text-gray-500'}`}>
                  {innings2?.runs || 0}/{innings2?.wickets || 0}
                </span>
              ) : (
                <span className="text-[11px] font-bold text-gray-400">Yet to bat</span>
              )}
            </div>
          </div>
        </div>

        <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>
          <div className="accordion-inner">
            <div className="px-4 pb-4 pt-1 border-t border-gray-50 mt-1">
              <div className="flex justify-between text-[11px] text-gray-500 font-medium mb-3">
                <div>{teams[match.teamA]?.shortName || 'T1'}: {innings1?.overs || 0}.{innings1?.balls || 0} Overs</div>
                {currentInning > 1 && (
                  <div>{teams[match.teamB]?.shortName || 'T2'}: {innings2?.overs || 0}.{innings2?.balls || 0} Overs</div>
                )}
              </div>
              <div className="flex gap-4">
                <div className="flex-1 bg-gray-50 rounded-lg p-2 text-center">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">CRR</div>
                  <div className="font-black text-sm text-[#1F2937]">
                    {isTeam1Batting 
                      ? calculateCRR(innings1?.runs || 0, innings1?.overs || 0, innings1?.balls || 0)
                      : calculateCRR(innings2?.runs || 0, innings2?.overs || 0, innings2?.balls || 0)
                    }
                  </div>
                </div>
                {currentInning > 1 && match.score?.target && (
                  <div className="flex-1 bg-[#E6F6ED] rounded-lg p-2 text-center border border-[#00A854]/10">
                    <div className="text-[10px] text-[#00A854] font-bold uppercase tracking-wider mb-0.5">REQ</div>
                    <div className="font-black text-sm text-[#00A854]">
                      {calculateCRR(
                        match.score.target - (innings2?.runs || 0), 
                        match.overs - (innings2?.overs || 0), 
                        innings2?.balls ? (6 - innings2.balls) : 0 // rough REQ calculation for display
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={navigateToMatch}
                className="w-full mt-3 py-2 bg-[#1F2937] text-white rounded-lg text-xs font-bold active:scale-95 transition-transform"
              >
                View Full Scorecard
              </button>
            </div>
          </div>
        </div>

        {currentInning > 1 && match.score?.target && (
          <div className="px-4 py-2.5 bg-[#E6F6ED] text-[#00A854] text-[11px] font-bold">
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
      <article className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden active:scale-[0.98] transition-transform shadow-sm opacity-80">
        <div 
          onClick={handlePress}
          className="p-4 cursor-pointer"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-md">
              <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">Result</span>
            </div>
            <ChevronDown size={16} className={`text-gray-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className={`font-bold text-base ${match.result?.winner === match.teamA ? 'text-[#1F2937]' : 'text-gray-500'}`}>
                {getTeamName(match.teamA)}
              </span>
              <span className={`font-black text-lg ${match.result?.winner === match.teamA ? 'text-[#1F2937]' : 'text-gray-500'}`}>
                {innings1?.runs || 0}/{innings1?.wickets || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`font-bold text-base ${match.result?.winner === match.teamB ? 'text-[#1F2937]' : 'text-gray-500'}`}>
                {getTeamName(match.teamB)}
              </span>
              {match.score?.innings2 ? (
                <span className={`font-black text-lg ${match.result?.winner === match.teamB ? 'text-[#1F2937]' : 'text-gray-500'}`}>
                  {innings2?.runs || 0}/{innings2?.wickets || 0}
                </span>
              ) : (
                <span className="text-[11px] font-bold text-gray-400">Yet to bat</span>
              )}
            </div>
          </div>
        </div>

        <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>
          <div className="accordion-inner">
            <div className="px-4 pb-4 pt-1 border-t border-gray-50 mt-1">
              <div className="flex justify-between text-[11px] text-gray-500 font-medium mb-3">
                <div>{teams[match.teamA]?.shortName || 'T1'}: {innings1?.overs || 0}.{innings1?.balls || 0} Overs</div>
                {match.score?.innings2 && (
                  <div>{teams[match.teamB]?.shortName || 'T2'}: {innings2?.overs || 0}.{innings2?.balls || 0} Overs</div>
                )}
              </div>
              <button 
                onClick={navigateToMatch}
                className="w-full py-2 bg-gray-100 text-[#1F2937] rounded-lg text-xs font-bold active:scale-95 transition-transform"
              >
                Match Summary
              </button>
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
      className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden active:scale-[0.98] transition-transform cursor-pointer shadow-sm"
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-md">
            <span className="text-[10px] font-black text-blue-600 tracking-widest uppercase">Upcoming</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-bold text-base text-[#1F2937]">{getTeamName(match.teamA)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-bold text-base text-[#1F2937]">{getTeamName(match.teamB)}</span>
          </div>
        </div>
      </div>
      
      <div className="px-4 py-2.5 bg-gray-50 text-gray-600 text-[11px] font-bold border-t border-[#E5E7EB] flex justify-between items-center">
        <span>Match {match.overs} Overs</span>
        <span>{getScheduledText()}</span>
      </div>
    </article>
  );
}
