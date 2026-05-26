"use client";
import { useState, useEffect } from 'react';
import { Activity, Plus, PlayCircle, ExternalLink, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { ref, push, set, onValue, remove } from 'firebase/database';
import { useAuth } from '@/context/AuthContext';

export default function MatchesPage() {
  const { user: currentUser } = useAuth();
  const [matches, setMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [scorers, setScorers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [newMatch, setNewMatch] = useState({
    tournamentId: '',
    stage: 'Match 1',
    teamA: '',
    teamB: '',
    scorerId: '',
    overs: 20,
    tossWinner: '',
    tossDecision: 'bat',
    scheduledTime: ''
  });

  useEffect(() => {
    // Fetch Tournaments
    onValue(ref(db, 'tournaments'), (snapshot) => {
      if (snapshot.exists()) {
        setTournaments(Object.entries(snapshot.val()).map(([id, val]) => ({ id, ...val })));
      }
    });

    // Fetch Teams
    onValue(ref(db, 'teams'), (snapshot) => {
      if (snapshot.exists()) {
        setTeams(Object.entries(snapshot.val()).map(([id, val]) => ({ id, ...val })));
      }
    });

    // Fetch Users (Scorers)
    onValue(ref(db, 'users'), (snapshot) => {
      if (snapshot.exists()) {
        const uList = Object.entries(snapshot.val()).map(([id, val]) => ({ id, ...val }));
        setScorers(uList.filter(u => u.role === 'scorer' || u.role === 'admin' || u.role === 'manager'));
      }
    });

    // Fetch Matches
    onValue(ref(db, 'matches'), (snapshot) => {
      if (snapshot.exists()) {
        setMatches(Object.entries(snapshot.val()).map(([id, val]) => ({ id, ...val })).reverse());
      } else {
        setMatches([]);
      }
      setLoading(false);
    });

  }, []);

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    if (!newMatch.tournamentId || !newMatch.teamA || !newMatch.teamB || !newMatch.scorerId || !newMatch.tossWinner) {
      alert("Please fill all fields, including the Toss result.");
      return;
    }
    if (newMatch.teamA === newMatch.teamB) {
      alert("Team A and Team B cannot be the same.");
      return;
    }

    // Determine batting order based on toss
    let battingFirstTeam = newMatch.teamA;
    let bowlingFirstTeam = newMatch.teamB;

    if ((newMatch.tossWinner === newMatch.teamA && newMatch.tossDecision === 'bowl') || 
        (newMatch.tossWinner === newMatch.teamB && newMatch.tossDecision === 'bat')) {
      battingFirstTeam = newMatch.teamB;
      bowlingFirstTeam = newMatch.teamA;
    }

    try {
      const matchRef = push(ref(db, 'matches'));
      await set(matchRef, {
        tournamentId: newMatch.tournamentId,
        stage: newMatch.stage || 'League',
        teamA: newMatch.teamA,
        teamB: newMatch.teamB,
        scorerId: newMatch.scorerId,
        overs: newMatch.overs,
        status: 'upcoming', 
        createdAt: new Date().toISOString(),
        scheduledTime: newMatch.scheduledTime,
        toss: { wonBy: newMatch.tossWinner, decision: newMatch.tossDecision },
        currentInnings: 1,
        score: {
          innings1: { 
            runs: 0, wickets: 0, overs: 0, team: battingFirstTeam,
            extras: { wd: 0, nb: 0, b: 0, lb: 0 }
          },
          innings2: { 
            runs: 0, wickets: 0, overs: 0, team: bowlingFirstTeam,
            extras: { wd: 0, nb: 0, b: 0, lb: 0 }
          }
        }
      });
      
      setNewMatch({ tournamentId: '', stage: 'Match 1', teamA: '', teamB: '', scorerId: '', overs: 20, tossWinner: '', tossDecision: 'bat', scheduledTime: '' });
    } catch (error) {
      console.error("Error creating match:", error);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this match? All scoring data will be lost.")) {
      await remove(ref(db, `matches/${id}`));
    }
  };

  const getTeamName = (id) => teams.find(t => t.id === id)?.shortName || 'Unknown';

  return (
    <div className="p-8 pb-20">
      <div className="flex items-center gap-3 mb-8">
        <Activity className="text-[var(--color-cricket-accent)]" size={32} />
        <div>
          <h1 className="text-3xl font-black text-white">Live Matches</h1>
          <p className="text-gray-400">Initialize scoring sessions and assign scorers</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Create Match Form */}
        <div className="lg:col-span-1">
          <div className="glass rounded-2xl p-6 sticky top-8">
            <h2 className="text-xl font-bold text-white mb-6">Initialize Match</h2>
            <form onSubmit={handleCreateMatch} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1 block">Tournament</label>
                  <select 
                    value={newMatch.tournamentId}
                    onChange={e => setNewMatch({...newMatch, tournamentId: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[var(--color-cricket-accent)]"
                    required
                  >
                    <option value="" className="text-black">Select Tournament</option>
                    {tournaments.map(t => <option key={t.id} value={t.id} className="text-black">{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1 block">Match Stage</label>
                  <input 
                    type="text"
                    list="stage-options"
                    value={newMatch.stage}
                    onChange={e => setNewMatch({...newMatch, stage: e.target.value})}
                    placeholder="e.g. Match 1, Semi-Final"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[var(--color-cricket-accent)]"
                    required
                  />
                  <datalist id="stage-options">
                    <option value="Match 1" />
                    <option value="Match 2" />
                    <option value="Match 3" />
                    <option value="Match 4" />
                    <option value="Match 5" />
                    <option value="League Match" />
                    <option value="Quarter-Final" />
                    <option value="Semi-Final" />
                    <option value="Final" />
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1 block">Scheduled Time (Optional)</label>
                  <input 
                    type="datetime-local"
                    value={newMatch.scheduledTime}
                    onChange={e => setNewMatch({...newMatch, scheduledTime: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[var(--color-cricket-accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1 block">Team A</label>
                  <select 
                    value={newMatch.teamA}
                    onChange={e => setNewMatch({...newMatch, teamA: e.target.value, tossWinner: ''})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[var(--color-cricket-accent)]"
                    required
                  >
                    <option value="" className="text-black">Select</option>
                    {teams.map(t => <option key={t.id} value={t.id} className="text-black">{t.shortName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1 block">Team B</label>
                  <select 
                    value={newMatch.teamB}
                    onChange={e => setNewMatch({...newMatch, teamB: e.target.value, tossWinner: ''})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[var(--color-cricket-accent)]"
                    required
                  >
                    <option value="" className="text-black">Select</option>
                    {teams.map(t => <option key={t.id} value={t.id} className="text-black">{t.shortName}</option>)}
                  </select>
                </div>
              </div>

              {/* Toss Section */}
              {(newMatch.teamA && newMatch.teamB) && (
                <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-4">
                  <div>
                     <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">Toss Won By</label>
                     <div className="flex gap-2">
                       <button type="button" onClick={() => setNewMatch({...newMatch, tossWinner: newMatch.teamA})} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${newMatch.tossWinner === newMatch.teamA ? 'bg-[var(--color-cricket-accent)] text-black' : 'glass text-gray-400'}`}>
                         {getTeamName(newMatch.teamA)}
                       </button>
                       <button type="button" onClick={() => setNewMatch({...newMatch, tossWinner: newMatch.teamB})} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${newMatch.tossWinner === newMatch.teamB ? 'bg-[var(--color-cricket-accent)] text-black' : 'glass text-gray-400'}`}>
                         {getTeamName(newMatch.teamB)}
                       </button>
                     </div>
                  </div>
                  
                  {newMatch.tossWinner && (
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">Decision</label>
                      <div className="flex gap-2">
                         <button type="button" onClick={() => setNewMatch({...newMatch, tossDecision: 'bat'})} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${newMatch.tossDecision === 'bat' ? 'bg-white text-black' : 'glass text-gray-400'}`}>
                           Batting First
                         </button>
                         <button type="button" onClick={() => setNewMatch({...newMatch, tossDecision: 'bowl'})} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${newMatch.tossDecision === 'bowl' ? 'bg-white text-black' : 'glass text-gray-400'}`}>
                           Bowling First
                         </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1 block">Total Overs</label>
                  <input 
                    type="number"
                    value={newMatch.overs}
                    onChange={e => setNewMatch({...newMatch, overs: parseInt(e.target.value) || 20})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[var(--color-cricket-accent)]"
                    min="1" max="50"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1 block">Scorer</label>
                  <select 
                    value={newMatch.scorerId}
                    onChange={e => setNewMatch({...newMatch, scorerId: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[var(--color-cricket-accent)]"
                    required
                  >
                    <option value="" className="text-black">Select...</option>
                    {scorers.map(s => <option key={s.id} value={s.id} className="text-black">{s.email.split('@')[0]}</option>)}
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-[var(--color-cricket-accent)] text-black font-black uppercase tracking-wider py-4 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(0,255,65,0.4)] transition-all mt-4"
              >
                <Plus size={20} />
                Initialize Match
              </button>
            </form>
          </div>
        </div>

        {/* Matches List */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="glass p-8 rounded-2xl flex justify-center">
              <div className="w-8 h-8 border-4 border-[var(--color-cricket-accent)]/30 border-t-[var(--color-cricket-accent)] rounded-full animate-spin"></div>
            </div>
          ) : matches.length === 0 ? (
            <div className="glass p-12 rounded-2xl text-center">
              <Activity size={48} className="mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-400">No Matches Found</h3>
            </div>
          ) : (
            matches.map((m) => {
              const isAssigned = m.scorerId === currentUser?.uid || currentUser?.role === 'admin' || currentUser?.role === 'manager';
              
              return (
                <div key={m.id} className="glass rounded-2xl p-6 border-l-4 border-l-[var(--color-cricket-accent)] group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className={`text-[10px] px-2 py-1 rounded font-black tracking-wider uppercase ${
                        m.status === 'live' ? 'bg-red-500/20 text-red-500' : 'bg-gray-800 text-gray-400'
                      }`}>
                        {m.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-2 font-bold">
                        {tournaments.find(t => t.id === m.tournamentId)?.name || 'Unknown Tournament'} • {m.stage || 'Match 1'} • {m.overs} Overs
                      </p>
                      {m.scheduledTime && (
                        <p className="text-xs text-[var(--color-cricket-accent)] mt-1 font-bold tracking-wider">
                          🗓 {new Date(m.scheduledTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      )}
                    </div>
                    <button 
                      onClick={() => handleDelete(m.id)}
                      className="text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-black/40 rounded-xl p-4 mb-4">
                    <div className="text-2xl font-black text-white">{getTeamName(m.score?.innings1?.team)} <span className="text-xs text-gray-500 uppercase tracking-widest block font-bold">Batting</span></div>
                    <div className="text-gray-600 font-black italic text-sm">VS</div>
                    <div className="text-2xl font-black text-white">{getTeamName(m.score?.innings2?.team)} <span className="text-xs text-gray-500 uppercase tracking-widest block font-bold">Bowling</span></div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-400 flex flex-col">
                      <span className="font-bold uppercase tracking-widest">Toss</span>
                      <span>{getTeamName(m.toss?.wonBy)} won & chose to {m.toss?.decision}</span>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/match/${m.id}`} className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                        <ExternalLink size={16} /> Public View
                      </Link>
                      
                      {isAssigned && (
                        <Link href={`/scorer/${m.id}`} className="bg-[var(--color-cricket-accent)]/20 hover:bg-[var(--color-cricket-accent)]/30 text-[var(--color-cricket-accent)] px-4 py-2 rounded-lg text-sm font-black flex items-center gap-2 transition-colors">
                          <PlayCircle size={16} /> Open Scorer Panel
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
