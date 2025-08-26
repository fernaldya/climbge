// src/components/EditMeasurements.tsx
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

type NullableNumber = number | null | undefined;

export function EditUserMeasurements({
  open,
  onOpenChange,
  initial, // raw numeric values as stored (cm/kg/cm/kgf)
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

  const hasAnyValue = useMemo(() => {
    return [height, weight, apeIndex, grip].some(v => v !== null && v !== undefined);
  }, [height, weight, apeIndex, grip]);

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

        {/* Unit selector (metric only for now) */}
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
          className="pr-12" // make room for unit
          placeholder=""
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  );
}
