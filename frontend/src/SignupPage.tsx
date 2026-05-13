import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiSignup } from './lib/api';
import { Eye, EyeOff } from 'lucide-react';
import type { SignUpData, UserProfile } from './types/user';

interface SignupPageProps {
  onSignup: (userProfile: UserProfile) => void;
}

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

export function SignupPage({ onSignup }: SignupPageProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // mobile: 0 = required, 1 = optional
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [error, setError] = useState('');

  const [data, setData] = useState<SignUpData>({
    username: '',
    password: '',
    confirmPassword: '',
    startedClimbing: '',
    email: '',
    name: '',
    age: '',
    sex: '',
    homeCity: '',
    homeGym: '',
  });

  const startedMax = new Date().toISOString().slice(0, 7);

  const set = (field: keyof SignUpData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setData((p) => ({ ...p, [field]: e.target.value }));

  const validateStep1 = () => {
    if (!data.username.trim()) return setError('Please enter a username'), false;
    if (data.username.length < 3) return setError('Username must be at least 3 characters'), false;
    if (!data.password.trim()) return setError('Please enter a password'), false;
    if (data.password.length < 6) return setError('Password must be at least 6 characters'), false;
    if (data.password !== data.confirmPassword) return setError('Passwords do not match'), false;
    if (!data.startedClimbing) return setError('Please select when you started climbing'), false;
    if (!data.email.trim()) return setError('Please enter your email address'), false;
    if (!/\S+@\S+\.\S+/.test(data.email)) return setError('Please enter a valid email address'), false;
    return true;
  };

  const handleMobileNext = () => {
    setError('');
    if (validateStep1()) setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateStep1()) return;
    const started = `${data.startedClimbing}-01`;
    try {
      const res = await apiSignup(data.username.trim(), data.password, started, {
        email: data.email,
        name: data.name || undefined,
        age: data.age || undefined,
        sex: data.sex || undefined,
        homeCity: data.homeCity || undefined,
        homeGym: data.homeGym || undefined,
      });
      onSignup(res.profile);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Signup failed';
      setError(msg);
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

  const focusHandlers = {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
      (e.target.style.borderColor = 'rgba(247,166,45,0.5)'),
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
      (e.target.style.borderColor = 'rgba(255,255,255,0.1)'),
  };

  const ctaStyle: React.CSSProperties = {
    width: '100%',
    background: '#F7A62D',
    color: '#1c1917',
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 800,
    fontSize: 16,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    border: 'none',
    borderRadius: 12,
    padding: 16,
    cursor: 'pointer',
  };

  return (
    <>
      {/* ── MOBILE ── */}
      <div className="block md:hidden">
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: '#fafaf9', fontFamily: "'Outfit', sans-serif", overflow: 'hidden' }}>
          {/* Hero top */}
          <div style={{ position: 'relative', flexShrink: 0, overflow: 'hidden', padding: '44px 32px 14px' }}>
            <Blob style={{ width: 140, height: 140, top: -50, right: -40, opacity: 0.12 }} />
            <Blob style={{ width: 44, height: 30, top: '38%', right: 80, opacity: 0.15, borderRadius: '50% 30%', transform: 'rotate(20deg)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, position: 'relative', zIndex: 2 }}>
              <img src="/climbge.png" style={{ width: 32, height: 32, objectFit: 'contain' }} alt="climbge logo" />
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: '0.12em', color: '#1c1917' }}>CLIMBGE</span>
            </div>

            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(60px, 18vw, 68px)', lineHeight: 0.87, color: '#1c1917', position: 'relative', zIndex: 2 }}>
              JOIN<br />THE<br /><span style={{ color: '#F7A62D' }}>WALL.</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#78716c', marginTop: 12, position: 'relative', zIndex: 2 }}>
              Start tracking every send.
            </div>
          </div>

          {/* Dark form sheet */}
          <div style={{ flex: 1, background: '#1c1917', borderRadius: '28px 28px 0 0', padding: '24px 28px 0', overflowY: 'auto' }}>
            {/* Step indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: '#F7A62D', transition: 'background 0.3s' }} />
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: step >= 1 ? '#F7A62D' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                Step {step + 1} of 2
              </span>
            </div>

            {step === 0 ? (
              <>
                <label style={labelStyle}>Username <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <span style={iconStyle}>◉</span>
                  <input style={inputStyle} type="text" placeholder="pick a handle" value={data.username} onChange={set('username')} {...focusHandlers} />
                </div>

                <label style={labelStyle}>Password <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <span style={iconStyle}>◈</span>
                  <input style={{ ...inputStyle, paddingRight: 42 }} type={showPw ? 'text' : 'password'} placeholder="min 6 characters" value={data.password} onChange={set('password')} {...focusHandlers} />
                  <button type="button" onClick={() => setShowPw((v) => !v)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <label style={labelStyle}>Confirm Password <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <span style={iconStyle}>◈</span>
                  <input style={{ ...inputStyle, paddingRight: 42 }} type={showPw2 ? 'text' : 'password'} placeholder="re-enter password" value={data.confirmPassword} onChange={set('confirmPassword')} {...focusHandlers} />
                  <button type="button" onClick={() => setShowPw2((v) => !v)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex' }}>
                    {showPw2 ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <label style={labelStyle}>Started Climbing <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <span style={iconStyle}>◷</span>
                  <input style={{ ...inputStyle, colorScheme: 'dark' }} type="month" max={startedMax} value={data.startedClimbing} onChange={set('startedClimbing')} {...focusHandlers} />
                </div>

                <label style={labelStyle}>Email <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <span style={iconStyle}>@</span>
                  <input style={inputStyle} type="email" placeholder="your@email.com" value={data.email} onChange={set('email')} {...focusHandlers} />
                </div>

                {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 12px', color: '#fca5a5', fontSize: 13, marginBottom: 14 }}>{error}</div>}

                <div style={{ marginBottom: 20 }} />
                <button type="button" onClick={handleMobileNext} style={ctaStyle}>Next →</button>
                <div style={{ textAlign: 'center', padding: '16px 0 28px', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                  Already have an account?{' '}<Link to="/login" style={{ color: '#F7A62D', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 14 }}>
                  <span style={{ ...labelStyle, display: 'inline', marginBottom: 0 }}>Profile Details</span>
                  <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'rgba(247,166,45,0.15)', color: '#F7A62D', borderRadius: 4, padding: '2px 6px', marginLeft: 6 }}>Optional</span>
                </div>
                <div style={{ marginBottom: 14 }} />

                <label style={labelStyle}>Name</label>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <span style={iconStyle}>◉</span>
                  <input style={inputStyle} type="text" placeholder="your name" value={data.name} onChange={set('name')} {...focusHandlers} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                  <div>
                    <label style={labelStyle}>Age</label>
                    <div style={{ position: 'relative', marginBottom: 14 }}>
                      <span style={iconStyle}>#</span>
                      <input style={inputStyle} type="number" placeholder="—" value={data.age} onChange={set('age')} {...focusHandlers} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Sex</label>
                    <div style={{ position: 'relative', marginBottom: 14 }}>
                      <span style={iconStyle}>▾</span>
                      <select style={{ ...inputStyle, appearance: 'none', cursor: 'pointer', color: data.sex ? '#fff' : 'rgba(255,255,255,0.2)' }} value={data.sex} onChange={set('sex')} {...focusHandlers}>
                        <option value="">—</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                <label style={labelStyle}>Home City</label>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <span style={iconStyle}>◎</span>
                  <input style={inputStyle} type="text" placeholder="city, country" value={data.homeCity} onChange={set('homeCity')} {...focusHandlers} />
                </div>

                <label style={labelStyle}>Primary Gym</label>
                <div style={{ position: 'relative', marginBottom: 20 }}>
                  <span style={iconStyle}>⌂</span>
                  <input style={inputStyle} type="text" placeholder="your gym's name" value={data.homeGym} onChange={set('homeGym')} {...focusHandlers} />
                </div>

                {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 12px', color: '#fca5a5', fontSize: 13, marginBottom: 14 }}>{error}</div>}

                <button type="submit" style={ctaStyle}>Create Account ↗</button>
                <div style={{ textAlign: 'center', padding: '16px 0 28px', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                  <span style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }} onClick={() => { setStep(0); setError(''); }}>← back</span>
                  {'  ·  '}
                  <Link to="/login" style={{ color: '#F7A62D', fontWeight: 700, textDecoration: 'none' }}>Already have an account?</Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden md:block">
        <div style={{ display: 'flex', height: '100dvh', fontFamily: "'Outfit', sans-serif", background: '#fafaf9', overflow: 'hidden' }}>
          {/* Left hero panel */}
          <div style={{ width: 480, flexShrink: 0, background: '#fafaf9', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '52px 52px 56px' }}>
            <Blob style={{ width: 220, height: 220, top: -60, right: -60, opacity: 0.12 }} />
            <Blob style={{ width: 70, height: 50, top: '44%', left: -18, opacity: 0.09, borderRadius: '30% 60%', transform: 'rotate(15deg)' }} />
            <Blob style={{ width: 40, height: 28, top: '30%', right: 100, opacity: 0.16, borderRadius: '50% 30%', transform: 'rotate(-20deg)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'absolute', top: 48, left: 52, zIndex: 2 }}>
              <img src="/climbge.png" style={{ width: 36, height: 36, objectFit: 'contain' }} alt="logo" />
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: '0.1em', color: '#1c1917' }}>CLIMBGE</span>
            </div>

            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 100, lineHeight: 0.85, color: '#1c1917', position: 'relative', zIndex: 2 }}>
              JOIN<br />THE<br /><span style={{ color: '#F7A62D' }}>WALL.</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#78716c', marginTop: 16, position: 'relative', zIndex: 2, lineHeight: 1.5 }}>
              Track every send. See your grade progression. Build your streak.
            </div>
          </div>

          {/* Right form panel */}
          <form onSubmit={handleSubmit} style={{ flex: 1, background: '#1c1917', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflowY: 'auto', padding: '52px 48px' }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, color: '#fff', letterSpacing: '0.06em', marginBottom: 20 }}>CREATE ACCOUNT</div>

            {/* Required section */}
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Required</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
              <div>
                <label style={labelStyle}>Username</label>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <span style={iconStyle}>◉</span>
                  <input style={inputStyle} type="text" placeholder="pick a handle" value={data.username} onChange={set('username')} {...focusHandlers} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Started Climbing</label>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <span style={iconStyle}>◷</span>
                  <input style={{ ...inputStyle, colorScheme: 'dark' }} type="month" max={startedMax} value={data.startedClimbing} onChange={set('startedClimbing')} {...focusHandlers} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <span style={iconStyle}>◈</span>
                  <input style={{ ...inputStyle, paddingRight: 42 }} type={showPw ? 'text' : 'password'} placeholder="min 6 chars" value={data.password} onChange={set('password')} {...focusHandlers} />
                  <button type="button" onClick={() => setShowPw((v) => !v)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Confirm Password</label>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <span style={iconStyle}>◈</span>
                  <input style={{ ...inputStyle, paddingRight: 42 }} type={showPw2 ? 'text' : 'password'} placeholder="re-enter" value={data.confirmPassword} onChange={set('confirmPassword')} {...focusHandlers} />
                  <button type="button" onClick={() => setShowPw2((v) => !v)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex' }}>
                    {showPw2 ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Email <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <span style={iconStyle}>@</span>
                  <input style={inputStyle} type="email" placeholder="your@email.com" value={data.email} onChange={set('email')} {...focusHandlers} />
                </div>
              </div>
            </div>

            {/* Optional divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 12px' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>Optional details</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
              <div>
                <label style={labelStyle}>Name</label>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <span style={iconStyle}>◉</span>
                  <input style={inputStyle} type="text" placeholder="your name" value={data.name} onChange={set('name')} {...focusHandlers} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Age</label>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <span style={iconStyle}>#</span>
                  <input style={inputStyle} type="number" placeholder="—" value={data.age} onChange={set('age')} {...focusHandlers} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Sex</label>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <span style={iconStyle}>▾</span>
                  <select style={{ ...inputStyle, appearance: 'none', cursor: 'pointer', color: data.sex ? '#fff' : 'rgba(255,255,255,0.2)' }} value={data.sex} onChange={set('sex')} {...focusHandlers}>
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Home City</label>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <span style={iconStyle}>◎</span>
                  <input style={inputStyle} type="text" placeholder="city, country" value={data.homeCity} onChange={set('homeCity')} {...focusHandlers} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Primary Gym</label>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <span style={iconStyle}>⌂</span>
                  <input style={inputStyle} type="text" placeholder="your gym's name" value={data.homeGym} onChange={set('homeGym')} {...focusHandlers} />
                </div>
              </div>
            </div>

            {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 12px', color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>{error}</div>}

            <div style={{ marginTop: 8, display: 'flex', gap: 16, alignItems: 'center' }}>
              <button type="submit" style={{ ...ctaStyle, flex: 1 }}>Create Account ↗</button>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                Have an account?{' '}<Link to="/login" style={{ color: '#F7A62D', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
