"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Plus, Trash2, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { db, storage } from '@/lib/firebase';
import { ref, push, set, onValue, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/context/AuthContext';

export default function TeamsPage() {
  const { role } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Team Form
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamShortName, setNewTeamShortName] = useState('');
  const [newTeamLogoUrl, setNewTeamLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Player Form (attached to a specific team)
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [globalPlayers, setGlobalPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');

  useEffect(() => {
    const teamsRef = ref(db, 'teams');
    const unsubscribeTeams = onValue(teamsRef, (snapshot) => {
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

    const playersRef = ref(db, 'players');
    const unsubscribePlayers = onValue(playersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const pList = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        setGlobalPlayers(pList.sort((a,b) => a.name.localeCompare(b.name)));
      } else {
        setGlobalPlayers([]);
      }
    });

    return () => {
       unsubscribeTeams();
       unsubscribePlayers();
    };
  }, []);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (role === 'viewer') return;
    if (!newTeamName.trim() || !newTeamShortName.trim()) return;

    setIsUploading(true);
    try {
      let finalLogoUrl = newTeamLogoUrl;

      // If a file was selected, upload it to Firebase Storage
      if (logoFile) {
        const fileRef = storageRef(storage, `teams/${Date.now()}_${logoFile.name}`);
        const snapshot = await uploadBytes(fileRef, logoFile);
        finalLogoUrl = await getDownloadURL(snapshot.ref);
      }

      const teamsRef = ref(db, 'teams');
      const newRef = push(teamsRef);
      await set(newRef, {
        name: newTeamName,
        shortName: newTeamShortName.toUpperCase(),
        logoUrl: finalLogoUrl,
        createdAt: new Date().toISOString()
      });
      setNewTeamName('');
      setNewTeamShortName('');
      setNewTeamLogoUrl('');
      setLogoFile(null);
    } catch (error) {
      console.error("Error creating team:", error);
      alert("Failed to create team or upload logo.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteTeam = async (id) => {
    if (role === 'viewer') return;
    if (confirm("Delete this team and all its players?")) {
      await remove(ref(db, `teams/${id}`));
    }
  };

  const handleAddPlayer = async (e, teamId) => {
    e.preventDefault();
    if (role === 'viewer') return;
    if (!selectedPlayerId) return;
    
    // Find player details to cache in the team for easy rendering
    const player = globalPlayers.find(p => p.id === selectedPlayerId);
    if (!player) return;

    try {
      const playerRef = ref(db, `teams/${teamId}/players/${selectedPlayerId}`);
      await set(playerRef, {
        name: player.name,
        role: player.role,
      });
      setSelectedPlayerId('');
    } catch (error) {
      console.error("Error adding player:", error);
    }
  };

  const handleDeletePlayer = async (teamId, playerId) => {
    if (role === 'viewer') return;
    await remove(ref(db, `teams/${teamId}/players/${playerId}`));
  };

  const toggleTeam = (id) => {
    setExpandedTeamId(expandedTeamId === id ? null : id);
  };

  return (
    <div className="p-8 pb-20">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
          <Shield className="text-purple-600" size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Teams & Squads</h1>
          <p className="text-slate-500 font-medium text-sm">Manage franchises and players</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Create Team Form / Read Only Block */}
        <div className="md:col-span-1">
          {role === 'viewer' ? (
            <div className="glass rounded-2xl p-6 border border-slate-200/80 shadow-sm sticky top-8 bg-slate-50/50">
              <h2 className="text-lg font-black text-slate-900 mb-2">Read-Only Mode</h2>
              <p className="text-xs text-slate-600 font-bold leading-relaxed">
                You are currently logged in with a **Viewer** account. You can inspect squads and player statistics, but you do not have permission to add new teams, modify rosters, or add players to teams.
              </p>
            </div>
          ) : (
            <div className="glass rounded-2xl p-6 border border-slate-200/80 shadow-sm sticky top-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Add Franchise</h2>
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Team Name</label>
                  <input 
                    type="text" 
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="e.g. Chennai Super Kings"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Short Code</label>
                  <input 
                    type="text" 
                    value={newTeamShortName}
                    onChange={(e) => setNewTeamShortName(e.target.value)}
                    placeholder="e.g. CSK"
                    maxLength={4}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Team Logo (Optional)</label>
                  <div className="space-y-3">
                     <div className="relative overflow-hidden bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between group hover:bg-slate-100 transition-all cursor-pointer">
                       <div className="flex items-center gap-3">
                          <span className="text-purple-600 font-black">📷</span>
                          <span className="text-sm text-slate-700 font-bold truncate max-w-[150px] md:max-w-[200px]">
                            {logoFile ? logoFile.name : 'Choose from Gallery...'}
                          </span>
                       </div>
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-700 transition-colors">Browse</span>
                       <input 
                         type="file" 
                         accept="image/*"
                         onChange={(e) => {
                           if (e.target.files[0]) {
                             setLogoFile(e.target.files[0]);
                             setNewTeamLogoUrl('');
                           }
                         }}
                         className="absolute inset-0 opacity-0 cursor-pointer"
                       />
                     </div>

                     <div className="flex items-center gap-4">
                       <div className="h-[1px] flex-1 bg-slate-200"></div>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OR</span>
                       <div className="h-[1px] flex-1 bg-slate-200"></div>
                     </div>

                     <input 
                       type="url" 
                       value={newTeamLogoUrl}
                       onChange={(e) => {
                         setNewTeamLogoUrl(e.target.value);
                         if (e.target.value) setLogoFile(null);
                       }}
                       placeholder="Paste image link..."
                       className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                     />
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={isUploading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow disabled:opacity-50 mt-6 shadow-purple-100"
                >
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Plus size={18} />
                      Create Team
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Teams List */}
        <div className="md:col-span-2 space-y-4">
          {loading ? (
            <div className="glass p-8 rounded-2xl border border-slate-200/80 shadow-sm flex justify-center">
              <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
            </div>
          ) : teams.length === 0 ? (
            <div className="glass p-12 rounded-2xl border border-slate-200/80 shadow-sm text-center">
              <Shield size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-400">No Teams Found</h3>
            </div>
          ) : (
            teams.map((t, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={t.id} 
                className="glass rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden"
              >
                <div 
                  className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-100/50 transition-all"
                  onClick={() => toggleTeam(t.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-black shadow-inner overflow-hidden border border-purple-200/30">
                      {t.logoUrl ? (
                         <img src={t.logoUrl} alt={t.name} className="w-full h-full object-cover" />
                      ) : (
                         t.shortName
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{t.name}</h3>
                      <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 mt-0.5">
                        <Users size={12} className="text-slate-400" /> {t.players.length} Players Squad
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {role !== 'viewer' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteTeam(t.id); }}
                        className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                    {expandedTeamId === t.id ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedTeamId === t.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100 bg-slate-50/40"
                    >
                      <div className="p-6">
                        {/* Player List */}
                        {t.players.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                            {t.players.map(p => (
                              <div key={p.id} className="bg-white border border-slate-200/80 shadow-sm rounded-xl p-3 flex justify-between items-center group hover:border-slate-300 transition-all">
                                <div>
                                  <p className="text-slate-850 font-bold text-sm">{p.name}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{p.role}</p>
                                </div>
                                {role !== 'viewer' && (
                                  <button 
                                    onClick={() => handleDeletePlayer(t.id, p.id)}
                                    className="text-slate-300 hover:text-red-650 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all p-1"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-450 text-sm mb-6 text-center font-medium">No players in the squad yet.</p>
                        )}

                        {/* Add Player Form */}
                        {role !== 'viewer' && (
                          <form onSubmit={(e) => handleAddPlayer(e, t.id)} className="flex gap-3">
                            <select 
                              value={selectedPlayerId}
                              onChange={(e) => setSelectedPlayerId(e.target.value)}
                              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                              required
                            >
                              <option value="" className="text-slate-500">-- Select Player --</option>
                              {globalPlayers.map(gp => {
                                 if (t.players.some(p => p.id === gp.id)) return null;
                                 return (
                                   <option key={gp.id} value={gp.id} className="text-slate-800 font-medium">{gp.name} ({gp.role})</option>
                                 );
                              })}
                            </select>
                            <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm shadow-purple-100 hover:shadow">
                              Add to Squad
                            </button>
                          </form>
                        )}
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
