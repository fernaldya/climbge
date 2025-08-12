import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Settings, Calendar, MessageSquareShare, LogOut, MapPin } from 'lucide-react';
import { useState } from 'react';
import { FeedbackDialog } from '../components/Feedback';
import { apiFeedback } from '../lib/api';
import type { UserProfile } from '../types/user';


interface ProfileTabProps {
  userProfile: UserProfile;
  onLogout: () => void;
}

export function ProfileTab({ userProfile, onLogout }: ProfileTabProps) {
  const getUserInitials = (username: string | null | undefined) => {
    if (!username) return 'Who dis?';
    return username
      .trim()
      .split(/\s+/)
      .map(s => s[0].toUpperCase() ?? '')
      .join('')
      .slice(0, 2) || 'U';
  };

  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  async function submitFeedback(feedback: string) {
    await apiFeedback(feedback);
  }

  const getDisplayName = (username: string) => {
    return username
      .trim()
      .split(/\s+/)
      .map(w => w[0] + w.slice(1).toLowerCase())
      .join(' ');
  };

  const formatStartDate = (startDate?: string | Date | null) => {
    if (!startDate) return '';

    const dateObj = new Date(startDate);
    const month = dateObj.toLocaleString('default', { month: 'long' });
    const year = dateObj.getFullYear();

    return `Climbing since ${month} ${year}`;
  };

  // Helpers to present physical stats (fallbacks until API wired fully)
  const totalRoutes = 100;

  const yearsActive = (startDate?: string | Date | null) => {
    if (!startDate) return '1'; // default to 1 year if missing

    const start = new Date(startDate);
    if (isNaN(start.getTime())) return '1'; // invalid date

    const now = new Date();
    const diffYears = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    return diffYears < 1 ? '<1' : Math.floor(diffYears).toString();
    };


  return (
    <div className="flex flex-col min-h-screen pb-24">
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
                    {userProfile.demography?.homeCity}
                    </p>
                </div>
                <div className="flex items-center gap-2 mt-2 whitespace-nowrap">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {formatStartDate(userProfile.demography?.startedClimbing)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-xl font-bold text-primary">{totalRoutes}</div>
                <div className="text-xs text-muted-foreground">Total Routes</div>
              </div>
              <div>
                <div className="text-xl font-bold text-primary">{yearsActive(userProfile.demography?.startedClimbing)}</div>
                <div className="text-xs text-muted-foreground">Years Active</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Physical Stats */}
      <div className="px-2 mb-6">
        <Card className="border-0 shadow-sm bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Physical Stats</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Height</div>
                <div className="font-semibold">{userProfile.measurements?.height}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Weight</div>
                <div className="font-semibold">{userProfile.measurements?.weight}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Ape Index</div>
                <div className="font-semibold">{userProfile.measurements?.apeIndex}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Grip Strength</div>
                <div className="font-semibold">{userProfile.measurements?.gripStrength}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1" />
        {/* Settings & Actions (sticky) */}
        <div className="px-2 space-y-3 sticky bottom-20 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <Button variant="outline" className="w-full justify-start gap-3 h-12">
                <Settings className="h-5 w-5" />
                Settings & Preferences
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3 h-12" onClick={() => setFeedbackDialogOpen(true)}>
                <MessageSquareShare className="h-5 w-5" />
                Let us know how you feel about Climbge
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3 h-12" onClick={onLogout}>
                <LogOut className="h-5 w-5" />
                Log Out
            </Button>
        </div>

        <FeedbackDialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen} onSubmit={submitFeedback} />
    </div>
  );
}
