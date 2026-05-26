"use client";
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get, update } from 'firebase/database';
import { auth, db } from '@/lib/firebase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'admin', 'scorer', or 'viewer'
  const [optInAdmin, setOptInAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Fetch role and opt-in status from Realtime Database
        try {
          const userRef = ref(db, `users/${firebaseUser.uid}`);
          const snapshot = await get(userRef);
          
          let dbRole = 'viewer';
          let dbOptIn = false;
          
          if (snapshot.exists()) {
            const data = snapshot.val();
            dbRole = data.role || 'viewer';
            dbOptIn = !!data.optInAdmin;
          }
          
          // Check local storage fallback
          let localOptIn = false;
          if (typeof window !== 'undefined') {
            localOptIn = localStorage.getItem(`skcc_opt_in_${firebaseUser.uid}`) === 'true';
          }
          
          setRole(dbRole);
          setOptInAdmin(dbOptIn || localOptIn);
        } catch (error) {
          console.error("Error fetching user role:", error);
          setRole('viewer');
          
          // Fallback to local storage
          if (typeof window !== 'undefined') {
            setOptInAdmin(localStorage.getItem(`skcc_opt_in_${firebaseUser.uid}`) === 'true');
          } else {
            setOptInAdmin(false);
          }
        }
      } else {
        setUser(null);
        setRole(null);
        setOptInAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateOptInAdmin = async (value) => {
    if (!user) return;
    try {
      // 1. Save to local storage
      if (typeof window !== 'undefined') {
        localStorage.setItem(`skcc_opt_in_${user.uid}`, value ? 'true' : 'false');
      }
      
      // 2. Try to update in Realtime DB (fallback if rules prevent it)
      const userRef = ref(db, `users/${user.uid}`);
      await update(userRef, {
        optInAdmin: value
      });
      
      setOptInAdmin(value);
    } catch (error) {
      console.warn("Could not save optInAdmin to database, relying on local storage:", error);
      setOptInAdmin(value);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, optInAdmin, updateOptInAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
