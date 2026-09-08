import { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { LogIn, LogOut, User as UserIcon, X } from 'lucide-react';
import { auth, db, googleProvider, isFirebaseConfigured } from '@/lib/firebase';

function getAuthError(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String((error as { code?: string }).code) : '';
  const messages: Record<string, string> = {
    'auth/popup-closed-by-user': 'The Google sign-in window was closed.',
    'auth/popup-blocked': 'Your browser blocked the Google sign-in popup. Please allow popups for PixelFlow and try again.',
    'auth/cancelled-popup-request': 'Another sign-in request is already in progress.',
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/email-already-in-use': 'An account already exists with this email. Try signing in instead.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-not-found': 'No account exists with this email.',
    'auth/wrong-password': 'The email or password is incorrect.',
    'auth/too-many-requests': 'Too many attempts. Please wait a little and try again.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase yet.',
    'auth/unauthorized-domain': `This domain (${typeof window !== 'undefined' ? window.location.hostname : ''}) is not authorized for sign-in. Add it under Firebase Console > Authentication > Settings > Authorized domains.`,
    'auth/configuration-not-found': 'Google sign-in is not enabled for this Firebase project yet. Enable it under Authentication > Sign-in method.',
  };
  return messages[code] || (error instanceof Error ? error.message : 'Authentication failed. Please try again.');
}

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(auth));

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    }, () => {
      setUser(null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    void setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      displayName: user.displayName ?? null,
      email: user.email ?? null,
      photoURL: user.photoURL ?? null,
      providerId: user.providerData[0]?.providerId ?? null,
      lastSeenAt: serverTimestamp(),
    }, { merge: true }).catch((error) => {
      console.warn('Could not update user profile:', error);
    });
  }, [user]);

  return { user, loading };
}

export async function signInWithGoogle() {
  if (!auth || !isFirebaseConfigured()) {
    throw new Error('Firebase is not configured yet. Add the VITE_FIREBASE_* environment variables.');
  }
  await signInWithPopup(auth, googleProvider);
}

export async function signInWithEmail(email: string, password: string) {
  if (!auth || !isFirebaseConfigured()) throw new Error('Firebase is not configured yet.');
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signUpWithEmail(name: string, email: string, password: string) {
  if (!auth || !isFirebaseConfigured()) throw new Error('Firebase is not configured yet.');
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() });
}

export async function resetPassword(email: string) {
  if (!auth || !isFirebaseConfigured()) throw new Error('Firebase is not configured yet.');
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOutUser() {
  if (auth) await signOut(auth);
}

function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setMessage('');
    }
  }, [open]);

  if (!open) return null;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage('');
    try {
      await action();
      onClose();
    } catch (error) {
      setMessage(getAuthError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{mode === 'login' ? 'Log in to PixelFlow' : 'Create your PixelFlow account'}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Use Google or your email address.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <button
            disabled={busy}
            onClick={() => void run(signInWithGoogle)}
            className="w-full min-h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold flex items-center justify-center gap-3 disabled:opacity-60"
          >
            <span className="font-bold text-lg">G</span>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <span>OR</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          {mode === 'signup' && (
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
          )}

          <label className="block">
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500" />
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500" />
          </label>

          {message && <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">{message}</div>}

          <button
            disabled={busy || !email || !password}
            onClick={() => void run(mode === 'login' ? () => signInWithEmail(email, password) : () => signUpWithEmail(name, email, password))}
            className="w-full min-h-12 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold disabled:opacity-50"
          >
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>

          {mode === 'login' && (
            <button
              disabled={busy || !email}
              onClick={() => void run(async () => {
                await resetPassword(email);
                setMessage('');
              }).catch(() => undefined)}
              className="w-full text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              Forgot password?
            </button>
          )}

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            {mode === 'login' ? 'New to PixelFlow?' : 'Already have an account?'}{' '}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }} className="font-semibold text-slate-900 dark:text-white hover:underline">
              {mode === 'login' ? 'Create an account' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export function AuthButton() {
  const { user, loading } = useCurrentUser();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  if (loading) return <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />;

  if (user) {
    return (
      <div className="relative flex items-center gap-2">
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName || 'Account'} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center"><UserIcon className="w-4 h-4" /></div>
        )}
        <div className="hidden lg:block max-w-36">
          <div className="text-xs font-semibold truncate text-slate-900 dark:text-white">{user.displayName || 'PixelFlow user'}</div>
          <div className="text-[11px] truncate text-slate-400">{user.email}</div>
        </div>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setSignOutError('');
            try { await signOutUser(); } catch (error) { setSignOutError(getAuthError(error)); } finally { setBusy(false); }
          }}
          className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white disabled:opacity-50"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
        {signOutError && <span className="fixed right-4 top-20 max-w-sm rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm shadow-lg">{signOutError}</span>}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold"
      >
        <LogIn className="w-4 h-4" />
        <span className="hidden sm:inline">Log in / Sign up</span>
        <span className="sm:hidden">Log in</span>
      </button>
      <AuthModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
