"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, Edit2, Check, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import { ref, onValue, update } from 'firebase/database';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [selectedRole, setSelectedRole] = useState('viewer');

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const uList = Object.entries(data).map(([id, val]) => ({
          id,
          ...val,
        }));
        setUsers(uList);
      } else {
        setUsers([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleEdit = (u) => {
    setEditingId(u.id);
    setSelectedRole(u.role);
  };

  const handleSave = async (uid) => {
    try {
      await update(ref(db, `users/${uid}`), {
        role: selectedRole
      });
      setEditingId(null);
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  const [isAdding, setIsAdding] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('manager');

  const getRoleBadge = (role) => {
    switch(role) {
      case 'admin': return <span className="bg-red-500/20 text-red-500 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">Admin</span>;
      case 'manager': return <span className="bg-blue-500/20 text-blue-500 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">Manager</span>;
      case 'scorer': return <span className="bg-[var(--color-cricket-accent)]/20 text-[var(--color-cricket-accent)] px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">Scorer</span>;
      default: return <span className="bg-gray-500/20 text-gray-400 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">Viewer</span>;
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newEmail) return;
    
    // Check if email already exists
    const exists = users.find(u => u.email.toLowerCase() === newEmail.toLowerCase());
    if (exists) {
      alert("User with this email already exists in the system.");
      return;
    }

    try {
      const inviteId = `invite_${Date.now()}`;
      await update(ref(db, `users/${inviteId}`), {
        email: newEmail.toLowerCase(),
        role: newRole,
        createdAt: new Date().toISOString()
      });
      setIsAdding(false);
      setNewEmail('');
      setNewRole('manager');
    } catch (error) {
      console.error("Error adding user:", error);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Users className="text-[var(--color-cricket-blue)]" size={32} />
          <div>
            <h1 className="text-3xl font-black text-white">Access Control</h1>
            <p className="text-gray-400">Manage user roles and scorer permissions</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-[var(--color-cricket-accent)] text-black px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-sm hover:shadow-[0_0_15px_rgba(0,255,65,0.4)] transition-all"
        >
          {isAdding ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddUser}
            className="glass p-6 rounded-2xl mb-8 border border-[var(--color-cricket-accent)]/30"
          >
            <h2 className="text-lg font-bold text-white mb-4">Pre-authorize New User</h2>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-widest block mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-cricket-accent)]"
                  required
                />
              </div>
              <div className="md:w-48">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-widest block mb-1">Role</label>
                <select 
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-cricket-accent)]"
                >
                  <option value="viewer">Viewer</option>
                  <option value="scorer">Scorer</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" className="w-full md:w-auto bg-[var(--color-cricket-accent)] text-black px-8 py-3 rounded-xl font-black uppercase tracking-wider hover:bg-[var(--color-cricket-accent)]/90 transition-colors h-[50px]">
                  Add
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 italic">
              When this user logs in with Google for the first time, they will automatically receive this role.
            </p>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="glass rounded-2xl overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-gray-500">Email</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-gray-500">Role</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-gray-500">Joined</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center">
                    <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-500">No users found</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 font-medium text-white">
                      {u.email}
                      {currentUser?.uid === u.id && <span className="ml-2 text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded uppercase font-bold">You</span>}
                    </td>
                    <td className="p-4">
                      {editingId === u.id ? (
                        <select 
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          className="bg-black border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="scorer">Scorer (Score assigned matches)</option>
                          <option value="manager">Manager (Add/Edit Matches & Teams)</option>
                          <option value="admin">Admin (Full Access)</option>
                        </select>
                      ) : (
                        getRoleBadge(u.role)
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-400">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Unknown'}
                    </td>
                    <td className="p-4 text-right">
                      {editingId === u.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleSave(u.id)} className="p-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-colors">
                            <Check size={16} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-2 bg-gray-500/20 text-gray-400 rounded-lg hover:bg-gray-500 hover:text-white transition-colors">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleEdit(u)} 
                          disabled={currentUser?.uid === u.id}
                          className="p-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4 p-4">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-[var(--color-cricket-accent)]/30 border-t-[var(--color-cricket-accent)] rounded-full animate-spin mx-auto"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-500 glass rounded-xl">No users found</div>
          ) : (
            users.map((u) => (
              <div key={u.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 break-all">
                    <p className="font-bold text-white text-sm">
                      {u.email}
                      {currentUser?.uid === u.id && <span className="ml-2 text-[9px] text-gray-400 bg-black px-2 py-0.5 rounded uppercase font-black border border-white/10">You</span>}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Joined: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Unknown'}</p>
                  </div>
                  <div>
                    {editingId !== u.id && getRoleBadge(u.role)}
                  </div>
                </div>

                {editingId === u.id ? (
                  <div className="bg-black/50 p-3 rounded-lg border border-white/5 space-y-3 mt-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1 block">Change Role</label>
                      <select 
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-cricket-accent)]"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="scorer">Scorer</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                      <button onClick={() => setEditingId(null)} className="flex-1 py-2 bg-gray-500/20 text-gray-400 rounded-lg hover:bg-gray-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">
                        Cancel
                      </button>
                      <button onClick={() => handleSave(u.id)} className="flex-1 py-2 bg-[var(--color-cricket-accent)]/20 text-[var(--color-cricket-accent)] rounded-lg hover:bg-[var(--color-cricket-accent)] hover:text-black transition-colors text-xs font-bold uppercase tracking-wider">
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleEdit(u)} 
                    disabled={currentUser?.uid === u.id}
                    className="w-full mt-2 py-2 bg-white/5 text-gray-300 rounded-lg flex items-center justify-center gap-2 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-widest"
                  >
                    <Edit2 size={14} /> Edit Role
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      </div>
    </ProtectedRoute>
  );
}
