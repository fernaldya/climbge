import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiForgotPassword } from './lib/api';

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

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() && !username.trim()) return setError('Please enter your email or username.');
    setLoading(true);
    try {
      await apiForgotPassword(email.trim(), username.trim());
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '13px 14px 13px 14px',
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
              FORGOT<br /><span style={{ color: '#F7A62D' }}>PASSWORD?</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#78716c', marginTop: 12, position: 'relative', zIndex: 2 }}>
              We'll send a reset link to your email.
            </div>
          </div>

          <div style={{ flex: 1, background: '#1c1917', borderRadius: '28px 28px 0 0', padding: '28px 28px 0', overflowY: 'auto' }}>
            {submitted ? (
              <div style={{ paddingTop: 16 }}>
                <div style={{ background: 'rgba(247,166,45,0.12)', border: '1px solid rgba(247,166,45,0.3)', borderRadius: 10, padding: '14px 16px', color: '#F7A62D', fontSize: 14, marginBottom: 20 }}>
                  If an account with that email exists, a reset link has been sent. Check your inbox or spam folder.
                </div>
                <Link to="/login" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>
                  ← Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 14 }} />
                <label style={labelStyle}>Email address</label>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <input
                    style={inputStyle}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={(e) => (e.target.style.borderColor = 'rgba(247,166,45,0.5)')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 14px' }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>or</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                </div>

                <label style={labelStyle}>Username</label>
                <div style={{ position: 'relative', marginBottom: 20 }}>
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
                  {loading ? 'Sending…' : 'Send Reset Link ↗'}
                </button>

                <div style={{ textAlign: 'center', padding: '16px 0 28px', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                  <Link to="/login" style={{ color: '#F7A62D', fontWeight: 700, textDecoration: 'none' }}>Back to sign in</Link>
                </div>
              </form>
            )}
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

            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 100, lineHeight: 0.87, color: '#1c1917', position: 'relative', zIndex: 2 }}>
              FORGOT<br /><span style={{ color: '#F7A62D' }}>PASSWORD?</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#78716c', marginTop: 16, position: 'relative', zIndex: 2, lineHeight: 1.5 }}>
              Enter the email tied to your account and we'll send a reset link.
            </div>
          </div>

          <div style={{ flex: 1, background: '#1c1917', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflowY: 'auto', padding: '52px 56px' }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, color: '#fff', letterSpacing: '0.06em', marginBottom: 28 }}>RESET PASSWORD</div>

            {submitted ? (
              <div>
                <div style={{ background: 'rgba(247,166,45,0.12)', border: '1px solid rgba(247,166,45,0.3)', borderRadius: 10, padding: '14px 16px', color: '#F7A62D', fontSize: 14, marginBottom: 24 }}>
                  If an account with that email exists, a reset link has been sent. Check your inbox.
                </div>
                <Link to="/login" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>
                  ← Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <label style={labelStyle}>Email address</label>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <input
                    style={inputStyle}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={(e) => (e.target.style.borderColor = 'rgba(247,166,45,0.5)')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 14px' }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>or</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                </div>

                <label style={labelStyle}>Username</label>
                <div style={{ position: 'relative', marginBottom: 28 }}>
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

                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 12px', color: '#fca5a5', fontSize: 13, marginBottom: 14 }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ flex: 1, background: '#F7A62D', color: '#1c1917', fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', border: 'none', borderRadius: 12, padding: 16, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
                  >
                    {loading ? 'Sending…' : 'Send Reset Link ↗'}
                  </button>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                    <Link to="/login" style={{ color: '#F7A62D', fontWeight: 700, textDecoration: 'none' }}>Back to sign in</Link>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
