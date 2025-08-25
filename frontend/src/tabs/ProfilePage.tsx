// src/tabs/ProfilePage.tsx
import { useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, useLocation, NavLink, Outlet, useNavigate } from 'react-router-dom';
import type { UserProfile } from '../types/user';

import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

import { Calendar, MapPin, MessageSquareShare, LogOut, Pencil } from 'lucide-react';
import { FeedbackDialog } from '../components/Feedback';
import { apiFeedback, apiSaveMeasurementsMetric } from '../lib/api';

interface ProfileTabProps {
  userProfile: UserProfile;
  onLogout: () => void;
}

export function ProfileTab({ userProfile, onLogout }: ProfileTabProps) {
  // ---------- Helpers ----------
  const getUserInitials = (username: string | null | undefined) => {
    if (!username) return 'Who dis?';
    return (
      username
        .trim()
        .split(/\s+/)
        .map(s => s[0]?.toUpperCase() ?? '')
        .join('')
        .slice(0, 2) || 'U'
    );
  };

  const getDisplayName = (username: string | undefined | null) => {
    if (!username) return 'User';
    return username
      .trim()
      .split(/\s+/)
      .map(w => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const formatStartDate = (startDate?: string | Date | null) => {
    if (!startDate) return '';
    const dateObj = new Date(startDate);
    if (isNaN(dateObj.getTime())) return '';
    const month = dateObj.toLocaleString('default', { month: 'long' });
    const year = dateObj.getFullYear();
    return `Climbing since ${month} ${year}`;
  };

  const yearsActive = (startDate?: string | Date | null) => {
    if (!startDate) return '1';
    const start = new Date(startDate);
    if (isNaN(start.getTime())) return '1';
    const now = new Date();
    const diffYears = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return diffYears < 1 ? '<1' : Math.floor(diffYears).toString();
  };

  // ---------- Feedback ----------
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  async function submitFeedback(feedback: string) {
    await apiFeedback(feedback);
  }

  // ---------- Edit Physical Stats (Metric‑only) ----------
  const [openEdit, setOpenEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initial metric values from profile (raw numbers)
  const initialMetric = {
    height: (userProfile.measurements as any)?.height ?? null,          // cm
    weight: (userProfile.measurements as any)?.weight ?? null,          // kg
    apeIndex: (userProfile.measurements as any)?.apeIndex ?? null,      // cm
    gripStrength: (userProfile.measurements as any)?.gripStrength ?? null, // kgf
  };

  async function handleSaveMetric(payload: {
    unitOfMeasurement: 'metric';
    height: number | null | undefined;
    weight: number | null | undefined;
    apeIndex: number | null | undefined;
    gripStrength: number | null | undefined;
  }) {
    setSaving(true);
    try {
      await apiSaveMeasurementsMetric(payload);
      // Optimistic local update (minimal). You can refetch /api/me instead if you prefer.
      (userProfile as any).measurements = {
        ...(userProfile as any).measurements,
        unitOfMeasurement: 'metric',
        height: payload.height ?? (userProfile as any).measurements?.height ?? null,
        weight: payload.weight ?? (userProfile as any).measurements?.weight ?? null,
        apeIndex: payload.apeIndex ?? (userProfile as any).measurements?.apeIndex ?? null,
        gripStrength: payload.gripStrength ?? (userProfile as any).measurements?.gripStrength ?? null,
      };
    } finally {
      setSaving(false);
    }
  }

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
            <div className="grid gap-4 text-center">
              {/*<div>*/}
              {/*  <div className="text-xl font-bold text-primary">{'-'}</div>*/}
              {/*  <div className="text-xs text-muted-foreground">Total Routes</div>*/}
              {/*</div>*/}
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
          <CardHeader className="pb-3 flex items-center justify-between">
            <CardTitle className="text-lg">Physical Stats</CardTitle>
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => setOpenEdit(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Height</div>
                <div className="font-semibold">{userProfile?.measurements?.height}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Weight</div>
                <div className="font-semibold">{userProfile?.measurements?.weight}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Ape Index</div>
                <div className="font-semibold">{userProfile?.measurements?.apeIndex}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Grip Strength</div>
                <div className="font-semibold">{userProfile?.measurements?.gripStrength}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1" />

      {/* Settings & Actions (sticky) */}
      <div className="px-2 space-y-3 sticky bottom-20 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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

      {/* Metric-only edit dialog */}
      <EditMeasurementsDialogMetric
        open={openEdit}
        onOpenChange={setOpenEdit}
        initial={initialMetric}
        onSave={handleSaveMetric}
        saving={saving}
      />
    </div>
  );
}

/* ---------------- Metric-only Edit Dialog (inline component) ---------------- */

type NullableNumber = number | null | undefined;

function EditMeasurementsDialogMetric({
  open,
  onOpenChange,
  initial,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: { height?: NullableNumber; weight?: NullableNumber; apeIndex?: NullableNumber; gripStrength?: NullableNumber } | null;
  onSave: (payload: {
    unitOfMeasurement: 'metric';
    height: NullableNumber;
    weight: NullableNumber;
    apeIndex: NullableNumber;
    gripStrength: NullableNumber;
  }) => Promise<void>;
  saving?: boolean;
}) {
  const [height, setHeight] = useState<NullableNumber>(null);
  const [weight, setWeight] = useState<NullableNumber>(null);
  const [apeIndex, setApeIndex] = useState<NullableNumber>(null);
  const [grip, setGrip] = useState<NullableNumber>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHeight(initial?.height ?? null);
    setWeight(initial?.weight ?? null);
    setApeIndex(initial?.apeIndex ?? null);
    setGrip(initial?.gripStrength ?? null);
    setError(null);
  }, [initial, open]);

  const hasAnyValue = useMemo(
    () => [height, weight, apeIndex, grip].some(v => v !== null && v !== undefined && v !== ''),
    [height, weight, apeIndex, grip]
  );

  function parseNum(v: string): NullableNumber {
    const trimmed = v.trim();
    if (trimmed === '') return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }

  async function handleSave() {
    if (!hasAnyValue) {
      setError('Enter at least one field.');
      return;
    }
    setError(null);
    await onSave({
      unitOfMeasurement: 'metric',
      height,
      weight,
      apeIndex,
      gripStrength: grip,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Physical Stats</DialogTitle>
        </DialogHeader>

        {/* Unit indicator (metric only for now) */}
        <div className="mb-2">
          <Label className="text-sm text-muted-foreground">Unit</Label>
          <div className="mt-1">
            <Button variant="secondary" size="sm" className="pointer-events-none opacity-80">
              Metric (cm / kg)
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <LabeledUnitInput
            label="Height"
            unit="cm"
            value={height}
            onChange={(e) => setHeight(parseNum(e.target.value))}
          />
          <LabeledUnitInput
            label="Weight"
            unit="kg"
            value={weight}
            onChange={(e) => setWeight(parseNum(e.target.value))}
          />
          <LabeledUnitInput
            label="Ape Index"
            unit="cm"
            value={apeIndex}
            onChange={(e) => setApeIndex(parseNum(e.target.value))}
          />
          <LabeledUnitInput
            label="Grip Strength"
            unit="kgf"
            value={grip}
            onChange={(e) => setGrip(parseNum(e.target.value))}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!!saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!!saving || !hasAnyValue}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LabeledUnitInput({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value: NullableNumber;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          step="0.01"
          value={value ?? ''}
          onChange={onChange}
          className="pr-12" // space for unit addon
          placeholder=""
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  );
}
