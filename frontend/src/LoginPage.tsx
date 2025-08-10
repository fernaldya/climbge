import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Alert, AlertDescription } from './components/ui/alert';
import { apiLogin } from './lib/api';
import { User, Lock, Eye, EyeOff, Mountain } from 'lucide-react';
import type { UserProfile } from './types/user';

interface LoginPageProps {
  onLogin: (userProfile: UserProfile) => void;
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

  // small style helpers to match SignupPage
  const fieldClass =
    "pl-10 h-11 bg-brand/10 border border-brand/30 text-foreground " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:border-brand " +
    "placeholder:text-muted-foreground";
  const iconClass = "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center space-y-3 mb-6">
          <div className="mx-auto w-16 h-16 bg-brand rounded-full flex items-center justify-center shadow-sm">
            <Mountain className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome back</h1>
          <p className="text-gray-500 text-sm">Sign in to continue your climbing journey</p>
        </div>

        {/* Login */}
        <Card className="border border-brand/20 bg-white shadow-xl rounded-2xl">
          <CardHeader className="pb-0">
            <CardTitle className="text-center text-lg">Sign In</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className={iconClass} />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className={iconClass} />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${fieldClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand hover:opacity-80"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {loginError && (
                <Alert className="border-destructive/50 bg-destructive/10">
                  <AlertDescription className="text-destructive">{loginError}</AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <Button type="submit" className="w-full h-11 bg-brand hover:bg-brand-dark text-white">
                  Sign In
                </Button>
                <p className="text-center text-sm text-gray-500">
                  Don’t have an account?{' '}
                  <Link to="/signup" className="text-brand hover:opacity-80 font-medium">
                    Sign up
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
