import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { auth, db, googleProvider, isFirebaseConfigured } from '@/lib/firebase';

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(auth));

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, setUser, () => setUser(null));
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    void setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      displayName: user.displayName ?? null,
      email: user.email ?? null,
      photoURL: user.photoURL ?? null,
      lastSeenAt: serverTimestamp(),
    }, { merge: true });
  }, [user]);

  return { user, loading };
}

export async function signInWithGoogle() {
  if (!auth || !isFirebaseConfigured()) {
    throw new Error('Firebase is not configured yet. Add the VITE_FIREBASE_* environment variables.');
  }
  await signInWithPopup(auth, googleProvider);
}

export async function signOutUser() {
  if (auth) await signOut(auth);
}

export function AuthButton() {
  const { user, loading } = useCurrentUser();
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />;

  if (user) {
    return (
      <div className="flex items-center gap-2">
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center"><UserIcon className="w-4 h-4" /></div>
        )}
        <button
          onClick={() => void signOutUser()}
          className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try { await signInWithGoogle(); } finally { setBusy(false); }
      }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold disabled:opacity-60"
    >
      <LogIn className="w-4 h-4" />
      {busy ? 'Signing in…' : 'Sign in with Google'}
    </button>
  );
}
