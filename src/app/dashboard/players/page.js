"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Plus, Trash2, Camera, Link as LinkIcon } from 'lucide-react';
import { db, storage } from '@/lib/firebase';
import { ref, push, set, onValue, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import Link from 'next/link';

export default function PlayersPage() {
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
    if (!name.trim()) return;

    setIsUploading(true);
    try {
      let finalPhotoUrl = photoUrl;

      // If a file was selected, upload it to Firebase Storage
      if (photoFile) {
        const fileRef = storageRef(storage, `players/${Date.now()}_${photoFile.name}`);
        const snapshot = await uploadBytes(fileRef, photoFile);
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
      // Keep previous roles selected for ease of bulk entry
    } catch (error) {
      console.error("Error creating player:", error);
      alert("Failed to upload image or create player.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePlayer = async (id) => {
    if (confirm("Delete this player? They will remain in existing scorecards but won't be selectable for new matches.")) {
      await remove(ref(db, `players/${id}`));
    }
  };

  return (
    <div className="p-8 pb-20">
      <div className="flex items-center gap-3 mb-8">
        <User className="text-[var(--color-cricket-accent)]" size={32} />
        <div>
          <h1 className="text-3xl font-black text-white">Global Players</h1>
          <p className="text-gray-400">Manage all registered players in the system</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Create Player Form */}
        <div className="md:col-span-1">
          <div className="glass rounded-2xl p-6 sticky top-8">
            <h2 className="text-xl font-bold text-white mb-4">Register Player</h2>
            <form onSubmit={handleCreatePlayer} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1 block">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Virat Kohli"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[var(--color-cricket-accent)] focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1 block">Role</label>
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[var(--color-cricket-accent)] transition-all"
                >
                  <option value="Batsman">Batsman</option>
                  <option value="Bowler">Bowler</option>
                  <option value="All-Rounder">All-Rounder</option>
                  <option value="Wicket Keeper">Wicket Keeper</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1 block">Batting</label>
                   <select 
                     value={battingStyle}
                     onChange={(e) => setBattingStyle(e.target.value)}
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-3 text-white text-sm focus:ring-2 focus:ring-[var(--color-cricket-accent)]"
                   >
                     <option value="Right-Handed">RHB</option>
                     <option value="Left-Handed">LHB</option>
                   </select>
                 </div>
                 <div>
                   <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1 block">Bowling</label>
                   <select 
                     value={bowlingStyle}
                     onChange={(e) => setBowlingStyle(e.target.value)}
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-3 text-white text-sm focus:ring-2 focus:ring-[var(--color-cricket-accent)]"
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
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1 block">Profile Picture (Optional)</label>
                
                <div className="space-y-3">
                   {/* File Upload Option */}
                   <div className="relative overflow-hidden bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between group hover:bg-white/10 transition-colors cursor-pointer">
                     <div className="flex items-center gap-3">
                        <Camera size={18} className="text-[var(--color-cricket-accent)]" />
                        <span className="text-sm text-gray-300 font-medium truncate max-w-[150px] md:max-w-[200px]">
                          {photoFile ? photoFile.name : 'Choose from Gallery...'}
                        </span>
                     </div>
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Browse</span>
                     <input 
                       type="file" 
                       accept="image/*"
                       onChange={(e) => {
                         if (e.target.files[0]) {
                           setPhotoFile(e.target.files[0]);
                           setPhotoUrl(''); // Clear URL if file is selected
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
                   <div className="relative">
                     <LinkIcon className="absolute left-3 top-3.5 text-gray-500" size={16} />
                     <input 
                       type="url" 
                       value={photoUrl}
                       onChange={(e) => {
                         setPhotoUrl(e.target.value);
                         if (e.target.value) setPhotoFile(null); // Clear file if URL is typed
                       }}
                       placeholder="Paste image link..."
                       className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-[var(--color-cricket-accent)] transition-all"
                     />
                   </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isUploading}
                className="w-full bg-[var(--color-cricket-accent)] text-black font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-colors hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 mt-6"
              >
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Plus size={18} />
                    Register Player
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Players List */}
        <div className="md:col-span-2 space-y-4">
          {loading ? (
            <div className="glass p-8 rounded-2xl flex justify-center">
              <div className="w-8 h-8 border-4 border-[var(--color-cricket-accent)]/30 border-t-[var(--color-cricket-accent)] rounded-full animate-spin"></div>
            </div>
          ) : players.length === 0 ? (
            <div className="glass p-12 rounded-2xl text-center">
              <User size={48} className="mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-400">No Players Registered</h3>
              <p className="text-sm text-gray-500 mt-2">Create players to assign them to teams.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
               {players.map((p, i) => (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: i * 0.05 }}
                   key={p.id} 
                   className="glass rounded-2xl p-4 flex gap-4 items-center group relative overflow-hidden"
                 >
                   <div className="w-16 h-16 rounded-full bg-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/20">
                      {p.photoUrl ? (
                         <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                         <User className="text-gray-500" size={24} />
                      )}
                   </div>
                   <div className="flex-1">
                      <Link href={`/player/${p.id}`} className="hover:underline decoration-[var(--color-cricket-accent)] underline-offset-4">
                         <h3 className="text-lg font-bold text-white leading-tight mb-1">{p.name}</h3>
                      </Link>
                      <span className="inline-block bg-[var(--color-cricket-accent)]/20 text-[var(--color-cricket-accent)] text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-1">
                        {p.role}
                      </span>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest flex flex-col gap-0.5 mt-1">
                        <span>🏏 {p.battingStyle}</span>
                        {p.bowlingStyle !== 'None' && <span>🥎 {p.bowlingStyle}</span>}
                      </p>
                   </div>
                   
                   <button 
                     onClick={() => handleDeletePlayer(p.id)}
                     className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                   >
                     <Trash2 size={14} />
                   </button>
                 </motion.div>
               ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
