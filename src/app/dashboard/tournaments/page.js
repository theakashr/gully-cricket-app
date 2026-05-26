"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Plus, Trash2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { ref, push, set, onValue, remove } from 'firebase/database';
import Link from 'next/link';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tournamentsRef = ref(db, 'tournaments');
    const unsubscribe = onValue(tournamentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const tList = Object.entries(data).map(([id, val]) => ({
          id,
          ...val,
        }));
        setTournaments(tList.reverse()); // Newest first
      } else {
        setTournaments([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTournamentName.trim()) return;

    try {
      const tournamentsRef = ref(db, 'tournaments');
      const newRef = push(tournamentsRef);
      await set(newRef, {
        name: newTournamentName,
        status: 'active',
        createdAt: new Date().toISOString()
      });
      setNewTournamentName('');
    } catch (error) {
      console.error("Error creating tournament:", error);
      alert("Failed to create tournament.");
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this tournament?")) {
      try {
        await remove(ref(db, `tournaments/${id}`));
      } catch (error) {
        console.error("Error deleting:", error);
      }
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
          <Trophy className="text-blue-600" size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tournaments</h1>
          <p className="text-slate-500 font-medium text-sm">Manage your leagues and cups</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Create Form */}
        <div className="md:col-span-1">
          <div className="glass rounded-2xl p-6 border border-slate-200/80 shadow-sm sticky top-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Create New</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Tournament Name</label>
                <input 
                  type="text" 
                  value={newTournamentName}
                  onChange={(e) => setNewTournamentName(e.target.value)}
                  placeholder="e.g. Summer Cup 2026"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow shadow-blue-200"
              >
                <Plus size={18} />
                Create Tournament
              </button>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="md:col-span-2 space-y-4">
          {loading ? (
            <div className="glass p-8 rounded-2xl border border-slate-200/80 shadow-sm flex justify-center">
              <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          ) : tournaments.length === 0 ? (
            <div className="glass p-12 rounded-2xl border border-slate-200/80 shadow-sm text-center">
              <Trophy size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-400">No Tournaments Found</h3>
              <p className="text-sm text-slate-500 mt-2">Create your first tournament using the form.</p>
            </div>
          ) : (
            tournaments.map((t, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={t.id} 
                className="glass-card rounded-2xl p-5 border border-white shadow-sm flex justify-between items-center group hover:shadow transition-all"
              >
                <div>
                  <Link href={`/tournament/${t.id}`} className="hover:underline decoration-blue-600 underline-offset-4 decoration-2">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
                      {t.name}
                      {t.status === 'active' && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-black tracking-wider uppercase no-underline">Active</span>
                      )}
                    </h3>
                  </Link>
                  <p className="text-xs text-slate-400 font-medium mt-1">Created: {new Date(t.createdAt).toLocaleDateString()}</p>
                </div>
                
                <button 
                  onClick={() => handleDelete(t.id)}
                  className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                >
                  <Trash2 size={18} />
                </button>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
