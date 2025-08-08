import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Mountain, User, Lock, Eye, EyeOff, Globe, MapPin, UserCheck } from 'lucide-react';
import { SignUpData, UserProfile } from '../types/user';

interface LoginPageProps {
  onLogin: (userProfile: UserProfile) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Sign up dialog state
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [signUpData, setSignUpData] = useState<SignUpData>({
    username: '',
    password: '',
    confirmPassword: '',
    climbingLevel: 'new',
    gender: '',
    nationality: '',
    homeCity: ''
  });
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signUpError, setSignUpError] = useState('');
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  // Handle login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!username.trim()) {
      setLoginError('Please enter your username');
      return;
    }

    if (!password.trim()) {
      setLoginError('Please enter your password');
      return;
    }

    // Simulate authentication (in real app, this would be an API call)
    if (password.length < 3) {
      setLoginError('Invalid username or password');
      return;
    }

    // Try to load user profile from localStorage first
    const storedProfile = localStorage.getItem('userProfile');
    if (storedProfile) {
      try {
        const userProfile: UserProfile = JSON.parse(storedProfile);
        if (userProfile.username === username.trim()) {
          // User found in storage, use their profile
          onLogin(userProfile);
          return;
        }
      } catch (error) {
        console.error('Error parsing stored user profile:', error);
      }
    }

    // Fallback for demo users or existing users without stored profiles
    const defaultProfile: UserProfile = {
      username: username.trim(),
      climbingLevel: 'intermediate',
      gender: 'Prefer not to say',
      nationality: 'United States',
      homeCity: 'Boulder, Colorado',
      joinDate: new Date('2018-01-01')
    };

    onLogin(defaultProfile);
  };

  // Handle sign up
  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError('');

    if (!signUpData.username.trim()) {
      setSignUpError('Please enter a username');
      return;
    }

    if (signUpData.username.length < 3) {
      setSignUpError('Username must be at least 3 characters long');
      return;
    }

    if (!signUpData.password.trim()) {
      setSignUpError('Please enter a password');
      return;
    }

    if (signUpData.password.length < 6) {
      setSignUpError('Password must be at least 6 characters long');
      return;
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      setSignUpError('Passwords do not match');
      return;
    }

    if (!signUpData.gender.trim()) {
      setSignUpError('Please select your gender');
      return;
    }

    if (!signUpData.nationality.trim()) {
      setSignUpError('Please enter your nationality');
      return;
    }

    if (!signUpData.homeCity.trim()) {
      setSignUpError('Please enter your home city');
      return;
    }

    // Create user profile
    const userProfile: UserProfile = {
      username: signUpData.username.trim(),
      climbingLevel: signUpData.climbingLevel,
      gender: signUpData.gender.trim(),
      nationality: signUpData.nationality.trim(),
      homeCity: signUpData.homeCity.trim(),
      joinDate: new Date()
    };

    // Store user profile (in real app, this would be saved to a database)
    localStorage.setItem('userProfile', JSON.stringify(userProfile));

    // Simulate successful registration
    setSignUpSuccess(true);
    setTimeout(() => {
      setIsSignUpOpen(false);
      setSignUpSuccess(false);
      setSignUpData({ username: '', password: '', confirmPassword: '', climbingLevel: 'new', gender: '', nationality: '', homeCity: '' });
      // Pre-fill login form with new user data
      setUsername(signUpData.username);
      setPassword('');
    }, 1500);
  };

  const resetSignUpForm = () => {
    setSignUpData({ username: '', password: '', confirmPassword: '', climbingLevel: 'new', gender: '', nationality: '', homeCity: '' });
    setSignUpError('');
    setSignUpSuccess(false);
    setShowSignUpPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* App Logo/Title */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg">
              <Mountain className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">ClimbTracker</h1>
          <p className="text-muted-foreground">Track your climbing progress</p>
        </div>

        {/* Login Form */}
        <Card className="border-0 shadow-lg bg-card/80 backdrop-blur">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">Welcome Back</CardTitle>
            <p className="text-sm text-muted-foreground text-center">
              Sign in to continue your climbing journey
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 bg-input-background border-border/50 focus:border-primary"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-input-background border-border/50 focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {loginError && (
                <Alert className="border-destructive/50 bg-destructive/10">
                  <AlertDescription className="text-destructive">
                    {loginError}
                  </AlertDescription>
                </Alert>
              )}

              {/* Login Button */}
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11"
              >
                Sign In
              </Button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <button
                  onClick={() => setIsSignUpOpen(true)}
                  className="text-primary hover:text-primary/80 font-medium"
                >
                  Sign up here
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Demo Info */}
        <Card className="border-0 bg-muted/50 backdrop-blur">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground text-center">
              Demo: Use any username with a password of 3+ characters
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sign Up Dialog */}
      <Dialog open={isSignUpOpen} onOpenChange={(open) => {
        setIsSignUpOpen(open);
        if (!open) resetSignUpForm();
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create Account</DialogTitle>
            <DialogDescription>
              Join ClimbTracker to start tracking your climbing progress
            </DialogDescription>
          </DialogHeader>

          {signUpSuccess ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mountain className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-green-600 mb-2">Account Created!</h3>
              <p className="text-sm text-muted-foreground">
                Welcome to ClimbTracker. You can now sign in with your new account.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="signup-username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="Choose a username"
                    value={signUpData.username}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, username: e.target.value }))}
                    className="pl-10 bg-input-background border-border/50 focus:border-primary"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type={showSignUpPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, password: e.target.value }))}
                    className="pl-10 pr-10 bg-input-background border-border/50 focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={signUpData.confirmPassword}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="pl-10 pr-10 bg-input-background border-border/50 focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Climbing Experience Level */}
              <div className="space-y-2">
                <Label htmlFor="climbing-level">Climbing Experience</Label>
                <Select value={signUpData.climbingLevel} onValueChange={(value: 'new' | 'novice' | 'intermediate') => setSignUpData(prev => ({ ...prev, climbingLevel: value }))}>
                  <SelectTrigger className="bg-input-background border-border/50 focus:border-primary">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Select your experience level" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New to climbing</SelectItem>
                    <SelectItem value="novice">Novice</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={signUpData.gender} onValueChange={(value) => setSignUpData(prev => ({ ...prev, gender: value }))}>
                  <SelectTrigger className="bg-input-background border-border/50 focus:border-primary">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Select your gender" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non-binary">Non-binary</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Nationality */}
              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nationality"
                    type="text"
                    placeholder="Enter your nationality"
                    value={signUpData.nationality}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, nationality: e.target.value }))}
                    className="pl-10 bg-input-background border-border/50 focus:border-primary"
                  />
                </div>
              </div>

              {/* Home City */}
              <div className="space-y-2">
                <Label htmlFor="home-city">Home City</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="home-city"
                    type="text"
                    placeholder="Enter your home city"
                    value={signUpData.homeCity}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, homeCity: e.target.value }))}
                    className="pl-10 bg-input-background border-border/50 focus:border-primary"
                  />
                </div>
              </div>

              {/* Error Message */}
              {signUpError && (
                <Alert className="border-destructive/50 bg-destructive/10">
                  <AlertDescription className="text-destructive">
                    {signUpError}
                  </AlertDescription>
                </Alert>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsSignUpOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Create Account
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}