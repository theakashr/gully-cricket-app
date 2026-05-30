"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, ArrowRight, UserPlus, KeyRound, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { auth, db } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { ref, get, set, remove } from 'firebase/database';

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState('login'); // 'login', 'signup', 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const router = useRouter();

  // Prevent hydration mismatch from browser extensions (Bitwarden, etc.)
  useEffect(() => {
    setMounted(true);
  }, []);

  const resolveUserRole = async (email, uid) => {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    let role = 'viewer';
    let inviteId = null;

    if (snapshot.exists()) {
      const data = snapshot.val();
      for (const [id, val] of Object.entries(data)) {
        if (val.email && val.email.toLowerCase() === email.toLowerCase()) {
          if (id.startsWith('invite_') || val.role !== 'viewer') {
            role = val.role;
            if (id.startsWith('invite_')) {
              inviteId = id;
            }
          }
        }
      }
    }

    await set(ref(db, `users/${uid}`), {
      email: email.toLowerCase(),
      role: role,
      createdAt: new Date().toISOString()
    });

    if (inviteId) {
      await remove(ref(db, `users/${inviteId}`));
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'forgot') {
        if (!email) throw new Error('Please enter your email address.');
        await sendPasswordResetEmail(auth, email);
        setMessage('Password reset email sent! Check your inbox.');
        setMode('login');
      } else if (mode === 'signup') {
        if (!email || !password) throw new Error('Please enter both email and password.');
        const result = await createUserWithEmailAndPassword(auth, email, password);
        
        await resolveUserRole(result.user.email, result.user.uid);
        
        router.push('/dashboard');
      } else {
        if (!email || !password) throw new Error('Please enter both email and password.');
        await signInWithEmailAndPassword(auth, email, password);
        router.push('/dashboard');
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') setError('Email is already in use.');
      else if (err.code === 'auth/invalid-credential') setError('Invalid email or password.');
      else setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userRef = ref(db, `users/${result.user.uid}`);
      const snapshot = await get(userRef);
      
      if (!snapshot.exists()) {
        await resolveUserRole(result.user.email, result.user.uid);
      }
      
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Failed to login with Google.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[var(--color-cricket-accent)]/30 border-t-[var(--color-cricket-accent)] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center relative overflow-hidden px-4 bg-slate-50">
      {/* Decorative backdrop pulse glows - Stadium Lights soft effect */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[140px] -z-10 animate-pulse"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md relative z-10 my-8"
      >
        {/* PREMIUM WHITE CARD */}
        <div className="bg-white rounded-3xl p-8 md:p-10 border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.08)] relative overflow-hidden hover:border-emerald-500/30 transition-all duration-500">
          {/* Decorative premium top light line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-cricket-accent)] to-transparent"></div>

          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4 border-2 border-[var(--color-cricket-accent)]/20 shadow-md hover:scale-105 transition-transform duration-300">
              <img src="/11shots-logo.png?v=3" alt="11shots Logo" className="w-full h-full object-cover" />
            </div>
            
            {/* DEEP BLACK HEADING */}
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
            </h1>
            
            {/* HIGH CONTRAST SLATE-600 SUBTITLE */}
            <p className="text-slate-600 font-semibold text-sm mt-3 leading-relaxed">
              {mode === 'login' ? 'Sign in to access your dashboard' : mode === 'signup' ? 'Join 11shots Live today' : 'Enter your email to receive a reset link'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-center text-red-650 font-bold text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-250 rounded-xl text-center text-emerald-700 font-bold text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              {/* CLEAR SPACED HIGH CONTRAST FORM LABEL */}
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-700 ml-1">
                Email Address
              </label>
              {/* SLATE-50 LIGHT INPUT WITH EMERALD FOCUS GLOW & DARK TYPING TEXT */}
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 focus:bg-white transition-all font-semibold shadow-inner"
                placeholder="scorer@11shots.com"
                required
              />
            </div>
            
            {mode !== 'forgot' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-700">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => setMode('forgot')} 
                      className="text-xs text-[var(--color-cricket-accent)] hover:text-emerald-700 hover:underline font-extrabold tracking-wide transition-colors"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 focus:bg-white transition-all font-semibold shadow-inner"
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            {/* GRADIENT BUTTON WITH GLOW & HOVER EFFECT */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-650 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold uppercase tracking-wider shadow-md shadow-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>
                    {mode === 'login' ? 'Sign In Securely' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                  </span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {mode === 'forgot' && (
             <button 
               onClick={() => setMode('login')} 
               className="mt-6 w-full flex items-center justify-center text-sm text-slate-500 hover:text-slate-800 transition-colors font-bold tracking-wide"
             >
               <ArrowLeft size={16} className="mr-2" /> Back to Login
             </button>
          )}
          
          {(mode === 'login' || mode === 'signup') && (
            <>
              <div className="mt-6 flex items-center justify-center">
                <div className="w-full h-[1px] bg-slate-200"></div>
                <span className="px-4 text-xs font-bold uppercase tracking-widest text-slate-400">OR</span>
                <div className="w-full h-[1px] bg-slate-200"></div>
              </div>
              
              {/* OAUTH BUTTON WITH HOVER EFFECT */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="mt-6 w-full flex items-center justify-center space-x-3 py-4 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all duration-300 shadow-sm hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="mt-8 text-center">
                <p className="text-slate-500 text-sm font-semibold">
                  {mode === 'login' ? "Don't have an account?" : "Already have an account?"} 
                  <button 
                    type="button"
                    onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} 
                    className="ml-2 text-[var(--color-cricket-accent)] font-extrabold hover:underline hover:text-emerald-700 transition-colors"
                  >
                    {mode === 'login' ? 'Create one' : 'Sign in'}
                  </button>
                </p>
              </div>
            </>
          )}

        </div>
      </motion.div>
    </div>
  );
}
