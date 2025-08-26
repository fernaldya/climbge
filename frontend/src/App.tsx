// App.tsx
import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, NavLink, Outlet, useNavigate } from 'react-router-dom';
import type { UserProfile } from './types/user';
import { apiMe, apiLogout } from './lib/api';
import { LoginPage } from './LoginPage';
import { SignupPage } from './SignupPage';
import { cn } from './components/ui/utils';
import { Home, Mountain, History, User } from "lucide-react";

// Tab pages
import { HomeTab } from './tabs/HomePage';
import { ClimbTab } from './tabs/ClimbPage';
import { HistoryTab } from './tabs/HistoryPage';
import { ProfileTab } from './tabs/ProfilePage';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [, setError] = useState<string>('');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        {/* Default to History */}
        <Route index element={<Navigate to="profile" replace />} />
        <Route path="home" element={<HomeTab />} />
        <Route path="climb" element={<ClimbTab />} />
        <Route path="history" element={<HistoryTab />} />
        <Route path="profile" element={
            <RequireAuth>
              <ProfileTab userProfile={profile!} onLogout={handleLogout} />
            </RequireAuth>
          }
        />
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<Navigate to={profile ? '/app/history' : '/login'} replace />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}



function AppShell({ profile: _profile, onLogout: _onLogout }: { profile: UserProfile | null; onLogout: () => void }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Active tab content */}
      <main className="flex-1 p-4 pb-[4.5rem] sm:pb-20">
        <Outlet />
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 bg-white shadow-[0_-1px_4px_rgba(0,0,0,0.1)] h-16 pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-4 h-full">
          <TabLink to="/app/home" label="Home" icon={Home} />
          <TabLink to="/app/climb" label="Climb" icon={Mountain} />
          <TabLink to="/app/history" label="History" icon={History} />
          <TabLink to="/app/profile" label="Profile" icon={User} />
        </ul>
      </nav>
    </div>
  );
}

function TabLink({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) =>
          cn(
            "flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors",
            isActive ? "text-orange-500" : "text-muted-foreground"
          )
        }
      >
        <Icon className="h-5 w-5 mb-1" />
        <span>{label}</span>
      </NavLink>
    </li>
  );
}