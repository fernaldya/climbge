import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiResetPassword } from './lib/api';
import { Eye, EyeOff } from 'lucide-react';

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

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password) return setError('Please enter a new password.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    if (!token) return setError('Missing reset token. Use the link from your email.');

    setLoading(true);
    try {
      await apiResetPassword(token, password);
      navigate('/login', { replace: true, state: { passwordReset: true } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '13px 42px 13px 14px',
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

  if (!token) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1c1917', fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ textAlign: 'center', color: '#fff', padding: 32 }}>
          <div style={{ color: '#fca5a5', marginBottom: 16 }}>Invalid or missing reset link.</div>
          <Link to="/forgot-password" style={{ color: '#F7A62D', fontWeight: 700 }}>Request a new one</Link>
        </div>
      </div>
    );
  }

  const formContent = (
    <form onSubmit={handleSubmit}>
      <label style={labelStyle}>New password</label>
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <input
          style={inputStyle}
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

      <label style={labelStyle}>Confirm password</label>
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <input
          style={inputStyle}
          type={showConfirm ? 'text' : 'password'}
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(247,166,45,0.5)')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        <button
          type="button"
          onClick={() => setShowConfirm((s) => !s)}
          style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0, display: 'flex', alignItems: 'center' }}
          aria-label={showConfirm ? 'Hide password' : 'Show password'}
        >
          {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 12px', color: '#fca5a5', fontSize: 13, marginBottom: 14 }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{ width: '100%', background: '#F7A62D', color: '#1c1917', fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', border: 'none', borderRadius: 12, padding: 16, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
      >
        {loading ? 'Saving…' : 'Set New Password ↗'}
      </button>
    </form>
  );

  return (
    <>
      {/* ── MOBILE layout (< 768px) ── */}
      <div className="block md:hidden">
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: '#fafaf9', fontFamily: "'Outfit', sans-serif", overflow: 'hidden' }}>
          <div style={{ position: 'relative', flexShrink: 0, overflow: 'hidden', padding: '44px 32px 16px' }}>
            <Blob style={{ width: 180, height: 180, top: -60, right: -50, opacity: 0.13 }} />
            <Blob style={{ width: 60, height: 60, top: '42%', left: -16, opacity: 0.09, borderRadius: '30% 60% 50% 40%', transform: 'rotate(20deg)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, position: 'relative', zIndex: 2 }}>
              <img src="/climbge.png" style={{ width: 32, height: 32, objectFit: 'contain' }} alt="climbge logo" />
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: '0.12em', color: '#1c1917' }}>CLIMBGE</span>
            </div>

            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(52px, 16vw, 72px)', lineHeight: 0.9, color: '#1c1917', position: 'relative', zIndex: 2 }}>
              NEW<br /><span style={{ color: '#F7A62D' }}>PASSWORD.</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#78716c', marginTop: 12, position: 'relative', zIndex: 2 }}>
              Choose something strong.
            </div>
          </div>

          <div style={{ flex: 1, background: '#1c1917', borderRadius: '28px 28px 0 0', padding: '28px 28px 0', overflowY: 'auto' }}>
            <div style={{ marginBottom: 14 }} />
            {formContent}
            <div style={{ textAlign: 'center', padding: '16px 0 28px', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
              <Link to="/login" style={{ color: '#F7A62D', fontWeight: 700, textDecoration: 'none' }}>Back to sign in</Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── DESKTOP layout (≥ 768px) ── */}
      <div className="hidden md:block">
        <div style={{ display: 'flex', height: '100dvh', fontFamily: "'Outfit', sans-serif", background: '#fafaf9', overflow: 'hidden' }}>
          <div style={{ width: 560, flexShrink: 0, background: '#fafaf9', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '52px 52px 56px' }}>
            <Blob style={{ width: 280, height: 280, top: -80, right: -80, opacity: 0.13 }} />
            <Blob style={{ width: 100, height: 70, top: '42%', left: -24, opacity: 0.09, borderRadius: '30% 60%', transform: 'rotate(15deg)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'absolute', top: 48, left: 52, zIndex: 2 }}>
              <img src="/climbge.png" style={{ width: 36, height: 36, objectFit: 'contain' }} alt="logo" />
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: '0.1em', color: '#1c1917' }}>CLIMBGE</span>
            </div>

            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 110, lineHeight: 0.87, color: '#1c1917', position: 'relative', zIndex: 2 }}>
              NEW<br /><span style={{ color: '#F7A62D' }}>PASSWORD.</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#78716c', marginTop: 16, position: 'relative', zIndex: 2, lineHeight: 1.5 }}>
              Choose something strong you'll remember.
            </div>
          </div>

          <div style={{ flex: 1, background: '#1c1917', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflowY: 'auto', padding: '52px 56px' }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, color: '#fff', letterSpacing: '0.06em', marginBottom: 28 }}>SET NEW PASSWORD</div>
            {formContent}
            <div style={{ marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
              <Link to="/login" style={{ color: '#F7A62D', fontWeight: 700, textDecoration: 'none' }}>Back to sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
