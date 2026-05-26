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
        <Settings className="text-[var(--color-cricket-accent)]" size={32} />
        <div>
          <h1 className="text-3xl font-black text-white">Account Settings</h1>
          <p className="text-gray-400">Manage your profile and authentication</p>
        </div>
      </div>

      <div className="glass rounded-3xl p-6 md:p-8 space-y-8">
        {/* Profile Card */}
        <div className="flex items-start gap-6 pb-8 border-b border-white/10">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-[var(--color-cricket-accent)] to-[var(--color-cricket-blue)] flex items-center justify-center shadow-lg shadow-[var(--color-cricket-accent)]/20">
            <User size={40} className="text-[var(--color-cricket-dark)]" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white mb-2">{user.email?.split('@')[0]}</h2>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Mail size={16} />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Shield size={16} />
                <span className="capitalize">Role: {role || 'Viewer'}</span>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-white/5 px-3 py-1.5 rounded-full">
                Account ID: {user.uid}
              </span>
            </div>
          </div>
        </div>

        {/* Security / Logout */}
        <div>
          <h3 className="text-lg font-bold text-white mb-4">Security</h3>
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h4 className="font-bold text-red-400">Sign Out</h4>
              <p className="text-sm text-gray-500">Log out of this device securely.</p>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full md:w-auto px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
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
