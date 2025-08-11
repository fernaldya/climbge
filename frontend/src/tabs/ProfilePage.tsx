import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Settings, Calendar, Share, LogOut, MapPin } from 'lucide-react';
import type { UserProfile } from '../types/user';

interface ProfileTabProps {
  userProfile: UserProfile | null;
  onLogout: () => void;
}

export function ProfileTab({ userProfile, onLogout }: ProfileTabProps) {
  const getUserInitials = (username: string | null | undefined) => {
    if (!username) return 'U';
    return username
      .trim()
      .split(/\s+/)
      .map(s => s[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2) || 'U';
  };

  const getDisplayName = (username: string | null | undefined) => {
    if (!username) return 'Mysterious person';
    return username
      .trim()
      .split(/\s+/)
      .map(w => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const formatStartDate = (startDate?: string | Date | null) => {
    if (!startDate) return '';

    const dateObj = new Date(startDate);
    if (isNaN(dateObj.getTime())) return 'Climbing since —';

    const month = dateObj.toLocaleString('default', { month: 'long' });
    const year = dateObj.getFullYear();

    return `Climbing since ${month} ${year}`;
  };

  // Helpers to present physical stats (fallbacks until API wired fully)
  const height = userProfile?.heightText ?? `165 cm`;
  const weight = userProfile?.weightText ?? `66.5 kg`;
  const apeIndex = userProfile?.apeIndexText ?? `+0.2`;
  const gripStrength = userProfile?.gripStrengthText ?? `40 kg`;
  const totalRoutes = userProfile?.totalRoutes ?? 100;
  const yearsActive = userProfile?.yearsActive ?? 1;

  return (
    <div className="space-y-4 pb-24">
      {/* Profile Header */}
      <div className="px-2 pt-2">
        <Card className="border-0 shadow-sm bg-card/50">
          <CardContent className="p-6 pt-3">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {getUserInitials(userProfile?.username)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl">{getDisplayName(userProfile?.username)}</h2>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                    {userProfile?.homeCity}
                    </p>
                </div>
                <div className="flex items-center gap-2 mt-2 whitespace-nowrap">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {formatStartDate(userProfile?.startedClimbing)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick stats (stubbed until backend wiring) */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-xl font-bold text-primary">{totalRoutes}</div>
                <div className="text-xs text-muted-foreground">Total Routes</div>
              </div>
              <div>
                <div className="text-xl font-bold text-primary">{yearsActive}</div>
                <div className="text-xs text-muted-foreground">Years Active</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Physical Stats */}
      <div className="px-2">
        <Card className="border-0 shadow-sm bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Physical Stats</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Height</div>
                <div className="font-semibold">{height}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Weight</div>
                <div className="font-semibold">{weight}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Ape Index</div>
                <div className="font-semibold">{apeIndex}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Grip Strength</div>
                <div className="font-semibold">{gripStrength}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings & Actions */}
      <div className="px-2 space-y-3">
        <Button variant="outline" className="w-full justify-start gap-3 h-12">
          <Settings className="h-5 w-5" />
          Settings & Preferences
        </Button>
        <Button variant="outline" className="w-full justify-start gap-3 h-12">
          <Share className="h-5 w-5" />
          Share Profile
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-12"
          onClick={onLogout}
        >
          <LogOut className="h-5 w-5" />
          Log Out
        </Button>
      </div>
    </div>
  );
}
