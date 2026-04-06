import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirebaseAuth, googleProvider, isFirebaseConfigured } from '../firebase';
import { api } from '../services/api';

const AuthContext = createContext(null);

function mapFirebaseUser(fbUser) {
  if (!fbUser) return null;
  return {
    uid: fbUser.uid,
    name: fbUser.displayName || 'User',
    email: fbUser.email || '',
    profilePic: fbUser.photoURL || '',
    isFirebase: true,
  };
}

/** Fetch existing profile from DB and cache it in localStorage */
async function hydrateProfile(uid) {
  try {
    const data = await api.getMe(uid);
    if (data?.user) {
      const p = data.user;
      const profileToStore = {
        age: p.age,
        gender: p.gender,
        preference: p.preference,
        location: p.location || '',
        profilePic: p.profilePic || '',
      };
      localStorage.setItem('sc_profile', JSON.stringify(profileToStore));
      return profileToStore;
    }
  } catch {
    /* user not found in DB yet — new user */
  }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      const stored = localStorage.getItem('sc_user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          /* ignore */
        }
      }
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const mapped = mapFirebaseUser(fbUser);
        setUser(mapped);
        localStorage.setItem('sc_user', JSON.stringify(mapped));
        setLoading(false);
        // Restore existing profile from DB in the background so returning users skip /profile
        const existingProfile = localStorage.getItem('sc_profile');
        if (!existingProfile || !JSON.parse(existingProfile).gender) {
          hydrateProfile(fbUser.uid);
        }
      } else {
        const stored = localStorage.getItem('sc_user');
        if (stored) {
          try {
            const u = JSON.parse(stored);
            if (u.isDemo) setUser(u);
            else {
              localStorage.removeItem('sc_user');
              setUser(null);
            }
          } catch {
            setUser(null);
          }
        } else setUser(null);
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('Firebase is not configured. Add VITE_FIREBASE_* to .env');
    await signInWithPopup(auth, googleProvider);
  };

  /** Dev / offline fallback when Firebase env vars are missing */
  const demoLogin = (name = 'Guest') => {
    const uid = 'demo_' + Math.random().toString(36).slice(2);
    const newUser = {
      uid,
      name,
      email: `${uid}@demo.local`,
      profilePic: '',
      isDemo: true,
    };
    setUser(newUser);
    localStorage.setItem('sc_user', JSON.stringify(newUser));
    return newUser;
  };

  const updateUser = (data) => {
    setUser((prev) => {
      const updated = { ...prev, ...data };
      localStorage.setItem('sc_user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = async () => {
    const auth = getFirebaseAuth();
    if (auth) {
      try {
        await firebaseSignOut(auth);
      } catch {
        /* ignore */
      }
    }
    setUser(null);
    localStorage.removeItem('sc_user');
    // NOTE: We intentionally keep sc_profile so returning users don't lose their settings.
    // It will be overwritten on next login from the DB.
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        demoLogin,
        updateUser,
        logout,
        firebaseConfigured: isFirebaseConfigured(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
