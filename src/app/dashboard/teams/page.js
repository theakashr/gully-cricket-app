"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Plus, Trash2, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { db } from '@/lib/firebase';
import { ref, push, set, onValue, remove } from 'firebase/database';

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Team Form
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamShortName, setNewTeamShortName] = useState('');
  
  // Player Form (attached to a specific team)
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState('Batsman');

  useEffect(() => {
    const teamsRef = ref(db, 'teams');
    const unsubscribe = onValue(teamsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const tList = Object.entries(data).map(([id, val]) => ({
          id,
          ...val,
          players: val.players ? Object.entries(val.players).map(([pId, pVal]) => ({ id: pId, ...pVal })) : []
        }));
        setTeams(tList.reverse());
      } else {
        setTeams([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamShortName.trim()) return;

    try {
      const teamsRef = ref(db, 'teams');
      const newRef = push(teamsRef);
      await set(newRef, {
        name: newTeamName,
        shortName: newTeamShortName.toUpperCase(),
        createdAt: new Date().toISOString()
      });
      setNewTeamName('');
      setNewTeamShortName('');
    } catch (error) {
      console.error("Error creating team:", error);
    }
  };

  const handleDeleteTeam = async (id) => {
    if (confirm("Delete this team and all its players?")) {
      await remove(ref(db, `teams/${id}`));
    }
  };

  const handleAddPlayer = async (e, teamId) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    try {
      const playerRef = push(ref(db, `teams/${teamId}/players`));
      await set(playerRef, {
        name: newPlayerName,
        role: newPlayerRole,
      });
      setNewPlayerName('');
      setNewPlayerRole('Batsman');
    } catch (error) {
      console.error("Error adding player:", error);
    }
  };

  const handleDeletePlayer = async (teamId, playerId) => {
    await remove(ref(db, `teams/${teamId}/players/${playerId}`));
  };

  const toggleTeam = (id) => {
    setExpandedTeamId(expandedTeamId === id ? null : id);
  };

  return (
    <div className="p-8 pb-20">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="text-purple-500" size={32} />
        <div>
          <h1 className="text-3xl font-black text-white">Teams & Squads</h1>
          <p className="text-gray-400">Manage franchises and players</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Create Team Form */}
        <div className="md:col-span-1">
          <div className="glass rounded-2xl p-6 sticky top-8">
            <h2 className="text-xl font-bold text-white mb-4">Add Franchise</h2>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1 block">Team Name</label>
                <input 
                  type="text" 
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Chennai Super Kings"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1 block">Short Code</label>
                <input 
                  type="text" 
                  value={newTeamShortName}
                  onChange={(e) => setNewTeamShortName(e.target.value)}
                  placeholder="e.g. CSK"
                  maxLength={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all uppercase"
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Plus size={18} />
                Create Team
              </button>
            </form>
          </div>
        </div>

        {/* Teams List */}
        <div className="md:col-span-2 space-y-4">
          {loading ? (
            <div className="glass p-8 rounded-2xl flex justify-center">
              <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
            </div>
          ) : teams.length === 0 ? (
            <div className="glass p-12 rounded-2xl text-center">
              <Shield size={48} className="mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-400">No Teams Found</h3>
            </div>
          ) : (
            teams.map((t, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={t.id} 
                className="glass rounded-2xl overflow-hidden"
              >
                <div 
                  className="p-6 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => toggleTeam(t.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white font-black shadow-lg">
                      {t.shortName}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{t.name}</h3>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Users size={12} /> {t.players.length} Players Squad
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteTeam(t.id); }}
                      className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                    {expandedTeamId === t.id ? <ChevronUp className="text-gray-500" /> : <ChevronDown className="text-gray-500" />}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedTeamId === t.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/10 bg-black/20"
                    >
                      <div className="p-6">
                        {/* Player List */}
                        {t.players.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                            {t.players.map(p => (
                              <div key={p.id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex justify-between items-center group">
                                <div>
                                  <p className="text-white font-bold text-sm">{p.name}</p>
                                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">{p.role}</p>
                                </div>
                                <button 
                                  onClick={() => handleDeletePlayer(t.id, p.id)}
                                  className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm mb-6 text-center">No players in the squad yet.</p>
                        )}

                        {/* Add Player Form */}
                        <form onSubmit={(e) => handleAddPlayer(e, t.id)} className="flex gap-3">
                          <input 
                            type="text" 
                            value={newPlayerName}
                            onChange={(e) => setNewPlayerName(e.target.value)}
                            placeholder="Player Name"
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500"
                            required
                          />
                          <select 
                            value={newPlayerRole}
                            onChange={(e) => setNewPlayerRole(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="Batsman">Batsman</option>
                            <option value="Bowler">Bowler</option>
                            <option value="All-Rounder">All-Rounder</option>
                            <option value="Wicket Keeper">Wicket Keeper</option>
                          </select>
                          <button type="submit" className="bg-purple-500 hover:bg-purple-600 text-white px-4 rounded-xl text-sm font-bold transition-colors">
                            Add
                          </button>
                        </form>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
