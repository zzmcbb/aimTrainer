import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface RangeFieldProps {
  disabled?: boolean;
  icon?: typeof SlidersHorizontal;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  unit: string;
  value: number;
}

export function RangeField({
  disabled = false,
  icon: Icon = SlidersHorizontal,
  label,
  max,
  min,
  onChange,
  step,
  unit,
  value,
}: RangeFieldProps) {
  return (
    <label className={cn("block rounded-2xl border border-white/10 bg-black/20 p-5", disabled && "opacity-55")}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <span className="flex items-center gap-3 font-medium">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-primary">
            <Icon className="h-4 w-4" />
          </span>
          {label}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm text-foreground">
          {Number.isInteger(value) ? value : value.toFixed(2)}
          {unit}
        </span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cn("h-2 w-full accent-primary", disabled && "cursor-not-allowed")}
      />
    </label>
  );
}

interface ToggleFieldProps {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}

export function ToggleField({ checked, description, disabled = false, label, onChange }: ToggleFieldProps) {
  return (
    <label className={cn("flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-5", disabled && "opacity-55")}>
      <span>
        <span className="block font-medium">{label}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className={cn("h-5 w-5 accent-primary", disabled && "cursor-not-allowed")}
      />
    </label>
  );
}

interface ColorFieldProps {
  defaultLabel: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}

export function ColorField({ defaultLabel, label, onChange, value }: ColorFieldProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="font-medium">{label}</div>
          <div className="mt-1 text-xs text-muted-foreground">{defaultLabel}</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{value.toUpperCase()}</span>
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-11 w-16 cursor-pointer rounded-xl border border-white/10 bg-transparent p-1"
          />
        </div>
      </div>
      <div className="h-3 rounded-full" style={{ backgroundColor: value }} />
    </div>
  );
}
