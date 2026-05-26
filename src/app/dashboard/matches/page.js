"use client";
import { useState, useEffect } from 'react';
import { Activity, Plus, PlayCircle, ExternalLink, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { ref, push, set, onValue, remove } from 'firebase/database';
import { useAuth } from '@/context/AuthContext';

export default function MatchesPage() {
  const { user: currentUser, role: userRole } = useAuth();
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
    if (userRole === 'viewer') return;
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
    if (userRole === 'viewer') return;
    if (confirm("Delete this match? All scoring data will be lost.")) {
      await remove(ref(db, `matches/${id}`));
    }
  };

  const getTeamName = (id) => teams.find(t => t.id === id)?.shortName || 'Unknown';

  return (
    <div className="p-8 pb-20">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Activity className="text-emerald-600" size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Live Matches</h1>
          <p className="text-slate-500 font-medium text-sm">Initialize scoring sessions and assign scorers</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Create Match Form / Read Only Block */}
        <div className="lg:col-span-1">
          {userRole === 'viewer' ? (
            <div className="glass rounded-2xl p-6 border border-slate-200/80 shadow-sm sticky top-8 bg-slate-50/50">
              <h2 className="text-lg font-black text-slate-900 mb-2">Read-Only Mode</h2>
              <p className="text-xs text-slate-600 font-bold leading-relaxed">
                You are currently logged in with a **Viewer** account. You can monitor live game states, review schedules, and open the public score center, but you cannot schedule matches or open the scorer entry panels.
              </p>
            </div>
          ) : (
            <div className="glass rounded-2xl p-6 border border-slate-200/80 shadow-sm sticky top-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Initialize Match</h2>
              <form onSubmit={handleCreateMatch} className="space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Tournament</label>
                    <select 
                      value={newMatch.tournamentId}
                      onChange={e => setNewMatch({...newMatch, tournamentId: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-sm"
                      required
                    >
                      <option value="" className="text-slate-500">Select...</option>
                      {tournaments.map(t => <option key={t.id} value={t.id} className="text-slate-805 font-medium">{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Match Stage</label>
                    <input 
                      type="text"
                      list="stage-options"
                      value={newMatch.stage}
                      onChange={e => setNewMatch({...newMatch, stage: e.target.value})}
                      placeholder="e.g. Match 1"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-sm"
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
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Scheduled Time (Optional)</label>
                    <input 
                      type="datetime-local"
                      value={newMatch.scheduledTime}
                      onChange={e => setNewMatch({...newMatch, scheduledTime: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Team A</label>
                    <select 
                      value={newMatch.teamA}
                      onChange={e => setNewMatch({...newMatch, teamA: e.target.value, tossWinner: ''})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-sm"
                      required
                    >
                      <option value="" className="text-slate-500">Select</option>
                      {teams.map(t => <option key={t.id} value={t.id} className="text-slate-805 font-medium">{t.shortName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Team B</label>
                    <select 
                      value={newMatch.teamB}
                      onChange={e => setNewMatch({...newMatch, teamB: e.target.value, tossWinner: ''})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-sm"
                      required
                    >
                      <option value="" className="text-slate-500">Select</option>
                      {teams.map(t => <option key={t.id} value={t.id} className="text-slate-850 font-medium">{t.shortName}</option>)}
                    </select>
                  </div>
                </div>

                {/* Toss Section */}
                {(newMatch.teamA && newMatch.teamB) && (
                  <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl space-y-4">
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Toss Won By</label>
                       <div className="flex gap-2">
                         <button type="button" onClick={() => setNewMatch({...newMatch, tossWinner: newMatch.teamA})} className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all shadow-sm ${newMatch.tossWinner === newMatch.teamA ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                           {getTeamName(newMatch.teamA)}
                         </button>
                         <button type="button" onClick={() => setNewMatch({...newMatch, tossWinner: newMatch.teamB})} className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all shadow-sm ${newMatch.tossWinner === newMatch.teamB ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                           {getTeamName(newMatch.teamB)}
                         </button>
                       </div>
                    </div>
                    
                    {newMatch.tossWinner && (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Decision</label>
                        <div className="flex gap-2">
                           <button type="button" onClick={() => setNewMatch({...newMatch, tossDecision: 'bat'})} className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all shadow-sm ${newMatch.tossDecision === 'bat' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                             Batting First
                           </button>
                           <button type="button" onClick={() => setNewMatch({...newMatch, tossDecision: 'bowl'})} className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all shadow-sm ${newMatch.tossDecision === 'bowl' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                             Bowling First
                           </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Total Overs</label>
                    <input 
                      type="number"
                      value={newMatch.overs}
                      onChange={e => setNewMatch({...newMatch, overs: parseInt(e.target.value) || 20})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-sm"
                      min="1" max="50"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Scorer</label>
                    <select 
                      value={newMatch.scorerId}
                      onChange={e => setNewMatch({...newMatch, scorerId: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-sm"
                      required
                    >
                      <option value="" className="text-slate-500">Select...</option>
                      {scorers.map(s => <option key={s.id} value={s.id} className="text-slate-800 font-medium">{s.email.split('@')[0]}</option>)}
                    </select>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow shadow-emerald-100 mt-4"
                >
                  <Plus size={20} />
                  Initialize Match
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Matches List */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="glass p-8 rounded-2xl border border-slate-200/80 shadow-sm flex justify-center">
              <div className="w-8 h-8 border-4 border-[var(--color-cricket-accent)]/30 border-t-[var(--color-cricket-accent)] rounded-full animate-spin"></div>
            </div>
          ) : matches.length === 0 ? (
            <div className="glass p-12 rounded-2xl border border-slate-200/80 shadow-sm text-center">
              <Activity size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-400">No Matches Found</h3>
            </div>
          ) : (
            matches.map((m) => {
              const isAssigned = m.scorerId === currentUser?.uid || currentUser?.role === 'admin' || currentUser?.role === 'manager';
              const canOpenScorer = isAssigned && userRole !== 'viewer';
              
              return (
                <div key={m.id} className="glass-card rounded-2xl p-6 border-l-4 border-l-emerald-500 border border-white shadow-sm hover:shadow transition-all group relative">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className={`text-[9px] px-2.5 py-0.5 rounded font-black tracking-wider uppercase ${
                        m.status === 'live' ? 'bg-red-100 text-red-650' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {m.status}
                      </span>
                      <p className="text-xs text-slate-400 mt-2.5 font-bold">
                        {tournaments.find(t => t.id === m.tournamentId)?.name || 'Unknown Tournament'} • {m.stage || 'Match 1'} • {m.overs} Overs
                      </p>
                      {m.scheduledTime && (
                        <p className="text-xs text-emerald-600 mt-1.5 font-bold tracking-wider">
                          🗓 {new Date(m.scheduledTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      )}
                    </div>
                    {userRole !== 'viewer' && (
                      <button 
                        onClick={() => handleDelete(m.id)}
                        className="text-slate-300 hover:text-red-650 transition-colors opacity-100 md:opacity-0 group-hover:opacity-100 p-1"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between bg-slate-50/80 border border-slate-150 rounded-xl p-4 mb-4">
                    <div className="text-2xl font-black text-slate-800">{getTeamName(m.score?.innings1?.team)} <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold mt-0.5">Batting First</span></div>
                    <div className="text-slate-400 font-black italic text-sm">VS</div>
                    <div className="text-2xl font-black text-slate-800">{getTeamName(m.score?.innings2?.team)} <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold mt-0.5">Bowling First</span></div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="text-xs text-slate-500 flex flex-col font-semibold">
                      <span className="font-black uppercase tracking-widest text-[9px] text-slate-400 mb-0.5">Toss Info</span>
                      <span>{getTeamName(m.toss?.wonBy)} won & chose to {m.toss?.decision}</span>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <Link href={`/match/${m.id}`} className="flex-1 sm:flex-none bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm">
                        <ExternalLink size={16} /> Public View
                      </Link>
                      
                      {canOpenScorer && (
                        <Link href={`/scorer/${m.id}`} className="flex-1 sm:flex-none bg-emerald-100 hover:bg-emerald-250 text-emerald-700 px-4 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-sm">
                          <PlayCircle size={16} /> Score Panel
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
