"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Plus, Trash2, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { db, storage } from '@/lib/firebase';
import { ref, push, set, onValue, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function TeamsPage() {
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
    if (confirm("Delete this team and all its players?")) {
      await remove(ref(db, `teams/${id}`));
    }
  };

  const handleAddPlayer = async (e, teamId) => {
    e.preventDefault();
    if (!selectedPlayerId) return;
    
    // Find player details to cache in the team for easy rendering
    const player = globalPlayers.find(p => p.id === selectedPlayerId);
    if (!player) return;

    try {
      // Use the global player ID as the key inside the team's players node
      // This prevents the same player from being added twice and links it properly
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
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1 block">Team Logo (Optional)</label>
                <div className="space-y-3">
                   {/* File Upload Option */}
                   <div className="relative overflow-hidden bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between group hover:bg-white/10 transition-colors cursor-pointer">
                     <div className="flex items-center gap-3">
                        <span className="text-purple-500 font-black">📷</span>
                        <span className="text-sm text-gray-300 font-medium truncate max-w-[150px] md:max-w-[200px]">
                          {logoFile ? logoFile.name : 'Choose from Gallery...'}
                        </span>
                     </div>
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Browse</span>
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
                     <div className="h-[1px] flex-1 bg-white/10"></div>
                     <span className="text-xs font-black text-gray-600 uppercase tracking-widest">OR</span>
                     <div className="h-[1px] flex-1 bg-white/10"></div>
                   </div>

                   {/* URL Option */}
                   <input 
                     type="url" 
                     value={newTeamLogoUrl}
                     onChange={(e) => {
                       setNewTeamLogoUrl(e.target.value);
                       if (e.target.value) setLogoFile(null);
                     }}
                     placeholder="Paste image link..."
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-purple-500 transition-all"
                   />
                </div>
              </div>
              <button 
                type="submit"
                disabled={isUploading}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-6"
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
                    <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white font-black shadow-lg overflow-hidden border border-purple-500/30">
                      {t.logoUrl ? (
                         <img src={t.logoUrl} alt={t.name} className="w-full h-full object-cover" />
                      ) : (
                         t.shortName
                      )}
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
                          <select 
                            value={selectedPlayerId}
                            onChange={(e) => setSelectedPlayerId(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500"
                            required
                          >
                            <option value="">-- Select Player --</option>
                            {globalPlayers.map(gp => {
                               // Don't show if already in squad
                               if (t.players.some(p => p.id === gp.id)) return null;
                               return (
                                 <option key={gp.id} value={gp.id}>{gp.name} ({gp.role})</option>
                               );
                            })}
                          </select>
                          <button type="submit" className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                            Add to Squad
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
