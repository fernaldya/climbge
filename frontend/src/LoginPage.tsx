import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiLogin } from './lib/api';
import { Eye, EyeOff } from 'lucide-react';
import type { UserProfile } from './types/user';

interface LoginPageProps {
  onLogin: (userProfile: UserProfile) => void;
}

// Decorative amber blob
function Blob({ style }: { style: React.CSSProperties }) {
  return (
    <div
      style={{
        position: 'absolute',
        background: '#F7A62D',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 1,
        ...style,
      }}
    />
  );
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!username.trim()) return setLoginError('Please enter your username');
    if (!password.trim()) return setLoginError('Please enter your password');
    try {
      const res = await apiLogin(username.trim(), password);
      onLogin(res.profile);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setLoginError(msg);
    }
  };

  /* ── shared inline styles ── */
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '13px 14px 13px 42px',
    color: '#fff',
    fontSize: 15,
    fontFamily: "'Outfit', sans-serif",
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 6,
    display: 'block',
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 14,
    color: 'rgba(247,166,45,0.65)',
    pointerEvents: 'none',
  };

  return (
    <>
      {/* ── MOBILE layout (< 768px) ── */}
      <div className="block md:hidden">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100dvh',
            background: '#fafaf9',
            fontFamily: "'Outfit', sans-serif",
            overflow: 'hidden',
          }}
        >
          {/* Hero top */}
          <div style={{ position: 'relative', flexShrink: 0, overflow: 'hidden', padding: '44px 32px 16px' }}>
            <Blob style={{ width: 180, height: 180, top: -60, right: -50, opacity: 0.13 }} />
            <Blob style={{ width: 60, height: 60, top: '42%', left: -16, opacity: 0.09, borderRadius: '30% 60% 50% 40%', transform: 'rotate(20deg)' }} />
            <Blob style={{ width: 32, height: 22, top: '28%', right: 72, opacity: 0.18, borderRadius: '50% 30% 60% 40%', transform: 'rotate(-15deg)' }} />

            {/* Brand row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, position: 'relative', zIndex: 2 }}>
              <img src="/climbge.png" style={{ width: 32, height: 32, objectFit: 'contain' }} alt="climbge logo" />
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: '0.12em', color: '#1c1917' }}>CLIMBGE</span>
            </div>

            {/* Hero text */}
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(72px, 22vw, 88px)', lineHeight: 0.87, color: '#1c1917', position: 'relative', zIndex: 2 }}>
              CLIMB<br /><span style={{ color: '#F7A62D' }}>MORE.</span><br />LOG IT.
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#78716c', marginTop: 12, position: 'relative', zIndex: 2, letterSpacing: '0.01em' }}>
              Sign back in to keep your streak alive.
            </div>
          </div>

          {/* Dark form sheet */}
          <div style={{ flex: 1, background: '#1c1917', borderRadius: '28px 28px 0 0', padding: '28px 28px 0', overflowY: 'auto' }}>
            <div style={{ marginBottom: 14 }} />

            <form onSubmit={handleLogin}>
              <label style={labelStyle}>Username</label>
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <span style={iconStyle}>◉</span>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="your handle"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(247,166,45,0.5)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>

              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <span style={iconStyle}>◈</span>
                <input
                  style={{ ...inputStyle, paddingRight: 42 }}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(247,166,45,0.5)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0, display: 'flex', alignItems: 'center' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div style={{ textAlign: 'right', marginBottom: 16 }}>
                <Link to="/forgot-password" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Forgot password?</Link>
              </div>

              {loginError && (
                <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 12px', color: '#fca5a5', fontSize: 13, marginBottom: 14 }}>
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                style={{ width: '100%', background: '#F7A62D', color: '#1c1917', fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', border: 'none', borderRadius: 12, padding: 16, cursor: 'pointer' }}
              >
                Let's Go ↗
              </button>
            </form>

            <div style={{ textAlign: 'center', padding: '16px 0 28px', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
              First time?{' '}
              <Link to="/signup" style={{ color: '#F7A62D', fontWeight: 700, textDecoration: 'none' }}>Create account</Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── DESKTOP layout (≥ 768px) ── */}
      <div className="hidden md:block">
        <div style={{ display: 'flex', height: '100dvh', fontFamily: "'Outfit', sans-serif", background: '#fafaf9', overflow: 'hidden' }}>
          {/* Left hero panel */}
          <div style={{ width: 560, flexShrink: 0, background: '#fafaf9', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '52px 52px 56px' }}>
            <Blob style={{ width: 280, height: 280, top: -80, right: -80, opacity: 0.13 }} />
            <Blob style={{ width: 100, height: 70, top: '42%', left: -24, opacity: 0.09, borderRadius: '30% 60%', transform: 'rotate(15deg)' }} />
            <Blob style={{ width: 50, height: 36, top: '32%', right: 120, opacity: 0.17, borderRadius: '50% 30%', transform: 'rotate(-20deg)' }} />
            <Blob style={{ width: 44, height: 30, bottom: 120, right: 60, opacity: 0.12, borderRadius: '40% 60%', transform: 'rotate(10deg)' }} />

            {/* Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'absolute', top: 48, left: 52, zIndex: 2 }}>
              <img src="/climbge.png" style={{ width: 36, height: 36, objectFit: 'contain' }} alt="logo" />
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: '0.1em', color: '#1c1917' }}>CLIMBGE</span>
            </div>

            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 124, lineHeight: 0.85, color: '#1c1917', position: 'relative', zIndex: 2 }}>
              CLIMB<br /><span style={{ color: '#F7A62D' }}>MORE.</span><br />LOG IT.
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#78716c', marginTop: 16, position: 'relative', zIndex: 2, lineHeight: 1.5 }}>
              Sign back in to continue tracking your sends, streaks, and progress.
            </div>
          </div>

          {/* Right form panel */}
          <div style={{ flex: 1, background: '#1c1917', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflowY: 'auto', padding: '52px 56px' }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, color: '#fff', letterSpacing: '0.06em', marginBottom: 28 }}>SIGN IN</div>

            <form onSubmit={handleLogin}>
              <label style={labelStyle}>Username</label>
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <span style={iconStyle}>◉</span>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="your handle"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(247,166,45,0.5)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>

              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <span style={iconStyle}>◈</span>
                <input
                  style={{ ...inputStyle, paddingRight: 42 }}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(247,166,45,0.5)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0, display: 'flex', alignItems: 'center' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div style={{ textAlign: 'right', marginBottom: 20 }}>
                <Link to="/forgot-password" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Forgot password?</Link>
              </div>

              {loginError && (
                <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 12px', color: '#fca5a5', fontSize: 13, marginBottom: 14 }}>
                  {loginError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <button
                  type="submit"
                  style={{ flex: 1, background: '#F7A62D', color: '#1c1917', fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', border: 'none', borderRadius: 12, padding: 16, cursor: 'pointer' }}
                >
                  Let's Go ↗
                </button>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                  No account?{' '}
                  <Link to="/signup" style={{ color: '#F7A62D', fontWeight: 700, textDecoration: 'none' }}>Sign up free</Link>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
