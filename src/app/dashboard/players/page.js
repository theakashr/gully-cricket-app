"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Plus, Trash2, Camera, Link as LinkIcon } from 'lucide-react';
import { db, storage } from '@/lib/firebase';
import { ref, push, set, onValue, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function PlayersPage() {
  const { role: userRole } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Player Form
  const [name, setName] = useState('');
  const [role, setRole] = useState('Batsman');
  const [battingStyle, setBattingStyle] = useState('Right-Handed');
  const [bowlingStyle, setBowlingStyle] = useState('None');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const playersRef = ref(db, 'players');
    const unsubscribe = onValue(playersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const pList = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        setPlayers(pList.reverse());
      } else {
        setPlayers([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreatePlayer = async (e) => {
    e.preventDefault();
    if (userRole === 'viewer') return;
    if (!name.trim()) return;

    setIsUploading(true);
    try {
      let finalPhotoUrl = photoUrl;

      // If a file was selected, upload it to Firebase Storage
      if (photoFile) {
        const fileRef = storageRef(storage, `players/${Date.now()}_${photoFile.name}`);
        const uploadTask = uploadBytes(fileRef, photoFile);
        const timeoutTask = new Promise((_, reject) => setTimeout(() => reject(new Error("Upload timed out. Please check if Firebase Storage is enabled in your Firebase console.")), 15000));
        const snapshot = await Promise.race([uploadTask, timeoutTask]);
        finalPhotoUrl = await getDownloadURL(snapshot.ref);
      }

      const playersRef = ref(db, 'players');
      const newRef = push(playersRef);
      await set(newRef, {
        name,
        role,
        battingStyle,
        bowlingStyle,
        photoUrl: finalPhotoUrl,
        createdAt: new Date().toISOString()
      });
      setName('');
      setPhotoUrl('');
      setPhotoFile(null);
    } catch (error) {
      console.error("Error creating player:", error);
      toast.error(error.message === "Upload timed out. Please check if Firebase Storage is enabled in your Firebase console." ? error.message : "Failed to upload image or create player.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePlayer = async (id) => {
    if (userRole === 'viewer') return;
    if (confirm("Delete this player? They will remain in existing scorecards but won't be selectable for new matches.")) {
      await remove(ref(db, `players/${id}`));
    }
  };

  return (
    <div className="p-8 pb-20">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
          <User className="text-emerald-600" size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Global Players</h1>
          <p className="text-slate-500 font-medium text-sm">Manage all registered players in the system</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Create Player Form / Read Only Block */}
        <div className="md:col-span-1">
          {userRole === 'viewer' ? (
            <div className="glass rounded-2xl p-6 border border-slate-200/80 shadow-sm sticky top-8 bg-slate-50/50">
              <h2 className="text-lg font-black text-slate-900 mb-2">Read-Only Mode</h2>
              <p className="text-xs text-slate-600 font-bold leading-relaxed">
                You are currently logged in with a **Viewer** account. You can view all players and their styles, but you do not have permission to register new players or remove them from the database.
              </p>
            </div>
          ) : (
            <div className="glass rounded-2xl p-6 border border-slate-200/80 shadow-sm sticky top-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Register Player</h2>
              <form onSubmit={handleCreatePlayer} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Full Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Virat Kohli"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Role</label>
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  >
                    <option value="Batsman">Batsman</option>
                    <option value="Bowler">Bowler</option>
                    <option value="All-Rounder">All-Rounder</option>
                    <option value="Wicket Keeper">Wicket Keeper</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Batting</label>
                     <select 
                       value={battingStyle}
                       onChange={(e) => setBattingStyle(e.target.value)}
                       className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                     >
                       <option value="Right-Handed">RHB</option>
                       <option value="Left-Handed">LHB</option>
                     </select>
                   </div>
                   <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Bowling</label>
                     <select 
                       value={bowlingStyle}
                       onChange={(e) => setBowlingStyle(e.target.value)}
                       className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                     >
                       <option value="None">None</option>
                       <option value="Right-arm Fast">Right Fast</option>
                       <option value="Right-arm Spin">Right Spin</option>
                       <option value="Left-arm Fast">Left Fast</option>
                       <option value="Left-arm Spin">Left Spin</option>
                     </select>
                   </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Profile Picture (Optional)</label>
                  
                  <div className="space-y-3">
                     <div className="relative overflow-hidden bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between group hover:bg-slate-100 transition-all cursor-pointer">
                       <div className="flex items-center gap-3">
                          <Camera size={18} className="text-emerald-600" />
                          <span className="text-sm text-slate-700 font-bold truncate max-w-[150px] md:max-w-[200px]">
                            {photoFile ? photoFile.name : 'Choose from Gallery...'}
                          </span>
                       </div>
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-700 transition-colors">Browse</span>
                       <input 
                         type="file" 
                         accept="image/*"
                         onChange={(e) => {
                           if (e.target.files[0]) {
                             setPhotoFile(e.target.files[0]);
                             setPhotoUrl('');
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

                     <div className="relative flex items-center">
                       <LinkIcon className="absolute left-3.5 text-slate-400" size={16} />
                       <input 
                         type="url" 
                         value={photoUrl}
                         onChange={(e) => {
                           setPhotoUrl(e.target.value);
                           if (e.target.value) setPhotoFile(null);
                         }}
                         placeholder="Paste image link..."
                         className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                       />
                     </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isUploading}
                  className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow disabled:opacity-50 mt-6 shadow-emerald-100"
                >
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Plus size={18} />
                      Register Player
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Players List */}
        <div className="md:col-span-2 space-y-4">
          {loading ? (
            <div className="glass p-8 rounded-2xl border border-slate-200/80 shadow-sm flex justify-center">
              <div className="w-8 h-8 border-4 border-[var(--color-cricket-accent)]/30 border-t-[var(--color-cricket-accent)] rounded-full animate-spin"></div>
            </div>
          ) : players.length === 0 ? (
            <div className="glass p-12 rounded-2xl border border-slate-200/80 shadow-sm text-center">
              <User size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-400">No Players Registered</h3>
              <p className="text-sm text-slate-500 mt-2">Create players to assign them to teams.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
               {players.map((p, i) => (
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: i * 0.05 }}
                   key={p.id} 
                   className="glass-card rounded-2xl p-4 border border-white shadow-sm flex gap-4 items-center group relative overflow-hidden hover:shadow transition-all"
                 >
                   <div className="w-16 h-16 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-200">
                      {p.photoUrl ? (
                         <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                         <User className="text-slate-400" size={24} />
                      )}
                   </div>
                   <div className="flex-1">
                      <Link href={`/player/${p.id}`} className="hover:underline decoration-emerald-500 underline-offset-4 decoration-2">
                         <h3 className="text-lg font-bold text-slate-800 leading-tight mb-1.5">{p.name}</h3>
                      </Link>
                      <span className="inline-block bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-1">
                        {p.role}
                      </span>
                      <p className="text-[10px] text-slate-405 font-bold uppercase tracking-widest flex flex-col gap-0.5 mt-1.5">
                        <span>🏏 {p.battingStyle}</span>
                        {p.bowlingStyle !== 'None' && <span>🥎 {p.bowlingStyle}</span>}
                      </p>
                   </div>
                   
                   {userRole !== 'viewer' && (
                     <button 
                       onClick={() => handleDeletePlayer(p.id)}
                       className="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-50 text-red-650 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all opacity-100 md:opacity-0 group-hover:opacity-100 shadow-sm"
                     >
                       <Trash2 size={14} />
                     </button>
                   )}
                 </motion.div>
               ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
