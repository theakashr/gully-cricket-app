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
      case 'admin': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">Admin</span>;
      case 'manager': return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">Manager</span>;
      case 'scorer': return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">Scorer</span>;
      default: return <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">Viewer</span>;
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
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <Users className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Access Control</h1>
            <p className="text-slate-500 font-medium text-sm">Manage user roles and scorer permissions</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-sm flex items-center justify-center ${
            isAdding 
              ? 'bg-slate-200 text-slate-700 hover:bg-slate-350' 
              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100 hover:shadow'
          }`}
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
            className="glass p-6 rounded-2xl mb-8 border border-emerald-500/20 bg-emerald-50/10 shadow-sm"
          >
            <h2 className="text-lg font-bold text-slate-800 mb-4">Pre-authorize New User</h2>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  required
                />
              </div>
              <div className="md:w-48">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1.5">Role</label>
                <select 
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                >
                  <option value="viewer">Viewer</option>
                  <option value="scorer">Scorer</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-black uppercase tracking-wider transition-all h-[50px] shadow-sm shadow-emerald-100">
                  Add User
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3 font-semibold italic">
              * When this user logs in with Google for the first time, they will automatically receive this role.
            </p>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="glass-card border border-white shadow-sm rounded-2xl overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70">
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Email</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Joined</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
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
                  <td colSpan="4" className="p-8 text-center text-slate-400 font-medium">No users found</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">
                      {u.email}
                      {currentUser?.uid === u.id && <span className="ml-2.5 text-[9px] text-slate-500 bg-slate-100 border border-slate-200/50 px-2 py-0.5 rounded font-black tracking-wider uppercase">You</span>}
                    </td>
                    <td className="p-4">
                      {editingId === u.id ? (
                        <select 
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-sm text-slate-805 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold"
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
                    <td className="p-4 text-xs font-semibold text-slate-400">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Unknown'}
                    </td>
                    <td className="p-4 text-right">
                      {editingId === u.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleSave(u.id)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                            <Check size={16} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-2 bg-slate-100 text-slate-550 rounded-lg hover:bg-slate-200 transition-all shadow-sm">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleEdit(u)} 
                          disabled={currentUser?.uid === u.id}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
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
              <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-medium bg-slate-50 border border-slate-100 rounded-xl">No users found</div>
          ) : (
            users.map((u) => (
              <div key={u.id} className="bg-white/80 border border-slate-200/80 shadow-sm rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 break-all pr-2">
                    <p className="font-bold text-slate-800 text-sm">
                      {u.email}
                      {currentUser?.uid === u.id && <span className="ml-2 text-[9px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-black tracking-wider border border-slate-200/40 uppercase">You</span>}
                    </p>
                    <p className="text-xs text-slate-450 font-medium mt-1">Joined: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Unknown'}</p>
                  </div>
                  <div>
                    {editingId !== u.id && getRoleBadge(u.role)}
                  </div>
                </div>

                {editingId === u.id ? (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-3 mt-2">
                    <div>
                      <label className="text-[9px] uppercase font-black text-slate-400 tracking-wider mb-1 block">Change Role</label>
                      <select 
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="scorer">Scorer</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                      <button onClick={() => setEditingId(null)} className="flex-1 py-2 bg-slate-150 text-slate-600 rounded-lg hover:bg-slate-200 transition-all text-xs font-bold uppercase tracking-wider">
                        Cancel
                      </button>
                      <button onClick={() => handleSave(u.id)} className="flex-1 py-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-650 hover:text-white transition-all text-xs font-bold uppercase tracking-wider">
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleEdit(u)} 
                    disabled={currentUser?.uid === u.id}
                    className="w-full mt-2 py-2.5 bg-slate-50 border border-slate-200 text-slate-650 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-widest shadow-sm"
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
