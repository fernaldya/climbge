// App.tsx
import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, NavLink, Outlet, useNavigate } from 'react-router-dom';
import type { UserProfile } from './types/user';
import { apiMe, apiLogout } from './lib/api';
import { LoginPage } from './LoginPage';
import { SignupPage } from './SignupPage';

// Tab pages (stubs)
// import { HomeTab } from './tabs/HomePage';
// import { AnalysisTab } from './tabs/AnalysisPage';
// import { ClimbTab } from './tabs/ClimbPage';
// import { HistoryTab } from './tabs/HistoryPage';
import { ProfileTab } from './tabs/ProfilePage';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string>('');
  const location = useLocation();
  const navigate = useNavigate();

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

  const RequireAuth = ({ children }: { children: JSX.Element }) =>
    profile ? children : <Navigate to="/login" replace state={{ from: location }} />;

  const RedirectIfAuthed = ({ children }: { children: JSX.Element }) =>
    profile ? <Navigate to="/app/profile" replace /> : children;

  const handleLogout = async () => {
    await apiLogout();
    setProfile(null);
    navigate('/login', { replace: true });
  };

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <LoginPage
              onLogin={(p) => {
                setProfile(p);
                // land on home tab after login
                navigate('/app/profile', { replace: true });
              }}
            />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/signup"
        element={
          <RedirectIfAuthed>
            <SignupPage
              onSignup={(p) => {
                setProfile(p);
                navigate('/app/profile', { replace: true });
              }}
            />
          </RedirectIfAuthed>
        }
      />

      {/* Protected tabbed app */}
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppShell profile={profile!} onLogout={handleLogout} />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="profile" replace />} />
        {/* <Route path="home" element={<HomeTab />} />
        <Route path="analysis" element={<AnalysisTab />} />
        <Route path="climb" element={<ClimbTab />} />
        <Route path="history" element={<HistoryTab />} /> */}
        <Route path="profile" element={<ProfileTab userProfile={profile} onLogout={handleLogout} />} />
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<Navigate to={profile ? '/app/profile' : '/login'} replace />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** Shell layout that draws the tabs and renders active tab via <Outlet/> */
function AppShell({
  profile,
  onLogout,
}: {
  profile: UserProfile;
  onLogout: () => Promise<void>;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Simple header; customize later */}
      <header className="p-4 border-b flex items-center justify-between">
        <div className="font-semibold">climbge</div>
        <div className="text-sm text-muted-foreground">Hi, {profile.username}</div>
      </header>

      {/* Active tab content */}
      <main className="flex-1 p-4">
        <Outlet />
      </main>

      {/* Bottom tab bar */}
      <nav className="sticky bottom-0 border-t bg-background">
        <ul className="grid grid-cols-5">
          <TabLink to="/app/home" label="Home" />
          <TabLink to="/app/analysis" label="Analysis" />
          <TabLink to="/app/climb" label="Climb" />
          <TabLink to="/app/history" label="History" />
          <TabLink to="/app/profile" label="Profile" />
        </ul>
      </nav>
    </div>
  );
}

function TabLink({ to, label }: { to: string; label: string }) {
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) =>
          [
            'block text-center py-3 text-sm',
            isActive ? 'font-semibold' : 'text-muted-foreground hover:text-foreground',
          ].join(' ')
        }
      >
        {label}
      </NavLink>
    </li>
  );
}
