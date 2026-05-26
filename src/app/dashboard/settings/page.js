"use client";
import { useAuth } from '@/context/AuthContext';
import { Settings, User, Mail, Shield, LogOut } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-[var(--color-cricket-accent)]/30 border-t-[var(--color-cricket-accent)] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  return (
    <div className="p-8 pb-20 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Settings className="text-emerald-600" size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Account Settings</h1>
          <p className="text-slate-500 font-medium text-sm">Manage your profile and authentication</p>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6 md:p-8 space-y-8 border border-white shadow-sm">
        {/* Profile Card */}
        <div className="flex items-start gap-6 pb-8 border-b border-slate-100">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <User size={40} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{user.email?.split('@')[0]}</h2>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                <Mail size={16} className="text-slate-400" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                <Shield size={16} className="text-slate-400" />
                <span className="capitalize">Role: {role || 'Viewer'}</span>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
                Account ID: {user.uid}
              </span>
            </div>
          </div>
        </div>

        {/* Security / Logout */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Security</h3>
          <div className="bg-red-50/50 border border-red-200/55 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h4 className="font-bold text-red-650">Sign Out</h4>
              <p className="text-xs font-semibold text-slate-500 mt-1">Log out of this device securely.</p>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full md:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-sm shadow-red-200 hover:shadow flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              Logout Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
