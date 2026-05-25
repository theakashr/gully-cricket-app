"use client";
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (allowedRoles && !allowedRoles.includes(role)) {
        router.push('/'); // Redirect unauthorized to home for now
      }
    }
  }, [user, role, loading, router, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 border-4 border-[var(--color-cricket-accent)]/20 border-t-[var(--color-cricket-accent)] rounded-full animate-spin"></div>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Authenticating...</p>
      </div>
    );
  }

  if (!user || (allowedRoles && !allowedRoles.includes(role))) {
    return null; // Return null while redirecting
  }

  return <>{children}</>;
}
