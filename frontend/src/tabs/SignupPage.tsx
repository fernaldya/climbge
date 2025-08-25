import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiSignup } from '../lib/api';
import { Mountain, User, Lock, Eye, EyeOff, Calendar, MapPin, Mail } from 'lucide-react';
import type { SignUpData, UserProfile } from '../types/user';

interface SignupPageProps {
  onSignup: (userProfile: UserProfile) => void;
}

export function SignupPage({ onSignup }: SignupPageProps) {
  const navigate = useNavigate();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!data.username.trim()) return setError('Please enter a username');
    if (data.username.length < 3) return setError('Username must be at least 3 characters long');
    if (!data.password.trim()) return setError('Please enter a password');
    if (data.password.length < 6) return setError('Password must be at least 6 characters long');
    if (data.password !== data.confirmPassword) return setError('Passwords do not match');
    if (!data.startedClimbing) return setError('Please select when you started climbing');

    const started = `${data.startedClimbing}-01`;

    try {
      const res = await apiSignup(
        data.username.trim(),
        data.password,
        started,
        {
          email: data.email || undefined,
          name: data.name || undefined,
          age: data.age || undefined,
          sex: data.sex || undefined,
          homeCity: data.homeCity || undefined,
          homeGym: data.homeGym || undefined,
        }
      );
      onSignup(res.profile);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Signup failed';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-brand rounded-full flex items-center justify-center">
            <Mountain className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Create your account</h1>
          <p className="text-gray-500 text-sm">Start tracking your climbing progress!</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={data.username}
                onChange={(e) => setData((p) => ({ ...p, username: e.target.value }))}
                placeholder="Pick a username"
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand focus:outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type={showPw ? 'text' : 'password'}
                value={data.password}
                onChange={(e) => setData((p) => ({ ...p, password: e.target.value }))}
                placeholder="Create a password"
                className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-brand focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type={showPw2 ? 'text' : 'password'}
                value={data.confirmPassword}
                onChange={(e) => setData((p) => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="Re-enter your password"
                className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-brand focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPw2((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPw2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Started Climbing */}
          <div>
            <label className="block text-sm font-medium text-gray-700">When did you start climbing?</label>
            <div className="relative mt-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="month"
                value={data.startedClimbing}
                onChange={(e) => setData((p) => ({ ...p, startedClimbing: e.target.value }))}
                max={startedMax}
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand focus:outline-none"
              />
            </div>
          </div>

          {/* Optional Fields */}
          {[
            { id: 'email', label: 'Email', icon: Mail, type: 'email' },
            { id: 'name', label: 'Name', icon: User, type: 'text' },
            { id: 'age', label: 'Age', icon: Calendar, type: 'number' },
            { id: 'homeCity', label: 'Home City', icon: MapPin, type: 'text' },
            { id: 'homeGym', label: 'Primary Climbing Gym', icon: Mountain, type: 'text' }
          ].map(({ id, label, icon: Icon, type }) => (
            <div key={id}>
              <label className="block text-sm font-medium text-gray-700">{label}</label>
              <div className="relative mt-1">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={type}
                  value={(data as any)[id] || ''}
                  onChange={(e) => setData((p) => ({ ...p, [id]: e.target.value }))}
                  placeholder="Optional"
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand focus:outline-none"
                />
              </div>
            </div>
          ))}

          {/* Sex */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Sex</label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={data.sex || ''}
                onChange={(e) => setData((p) => ({ ...p, sex: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand focus:outline-none"
              >
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Error */}
          {error && <p className="text-red-500 text-sm">{error}</p>}

          {/* Actions */}
          <button
            type="submit"
            className="w-full bg-brand hover:bg-brand-dark text-white py-2 rounded-lg font-medium"
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full mt-2 border border-gray-300 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-100"
          >
            Back to Login
          </button>

          {/* Already have account */}
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-brand hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
