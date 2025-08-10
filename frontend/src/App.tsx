import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { UserProfile } from './types/user';
import { apiMe, apiLogout } from './lib/api';
import { LoginPage } from './LoginPage';
import { SignupPage } from './SignupPage'

export default function App() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string>('');
  const location = useLocation();

  useEffect(() => {
    (async () => {
      try {
        const me = await apiMe();
        if (me?.authenticated && me.profile) setProfile(me.profile);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to check session';
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  // Helpers
  const RequireAuth = ({ children }: { children: JSX.Element }) =>
    profile ? children : <Navigate to="/login" replace state={{ from: location }} />;

  const RedirectIfAuthed = ({ children }: { children: JSX.Element }) =>
    profile ? <Navigate to="/" replace /> : children;

  return (
    <Routes>
      {/* App home (protected) */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <Dashboard profile={profile!} onLogout={async () => { await apiLogout(); setProfile(null); }} />
          </RequireAuth>
        }
      />

      {/* Login (public, but hidden if already authed) */}
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <LoginPage onLogin={(p) => setProfile(p)} />
          </RedirectIfAuthed>
        }
      />

      {/* Signup (public, but hidden if already authed) */}
      <Route
        path="/signup"
        element={
          <RedirectIfAuthed>
            <SignupPage onSignup={(p) => setProfile(p)} />
          </RedirectIfAuthed>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function Dashboard({ profile, onLogout }: { profile: UserProfile; onLogout: () => Promise<void> }) {
  return (
    <div className="min-h-screen p-6 flex flex-col gap-4">
      <div className="text-xl font-semibold">Welcome, {profile.username} 👋</div>
      <div className="text-sm text-muted-foreground">
        You've been climbing for {profile.demography.months_climbing}
      </div>
      <div className="text-sm text-muted-foreground">
        Happy to have you here! Start tracking your climbing progress now.
      </div>
      <div className="flex gap-3">
        <button className="px-3 py-2 rounded-md border" onClick={onLogout}>Log out</button>
      </div>
    </div>
  );
}
