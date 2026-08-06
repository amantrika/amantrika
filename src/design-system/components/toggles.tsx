"use client";

/** ToggleGroup (segmented) and Switch (gold-bead handle). */

export function ToggleGroup({
  options,
  value,
  onChange,
  className = "",
  label,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-pill border border-ornate/60 bg-surface p-1 ${className}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`rounded-pill px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
              active ? "bg-primary text-bg shadow-resting" : "text-muted hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  className = "",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <label className={`inline-flex cursor-pointer items-center gap-3 ${className}`}>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-pill border transition-colors cursor-pointer ${
          checked ? "border-ornate bg-primary" : "border-ornate/50 bg-foreground/12"
        }`}
      >
        {/* the handle is a tiny gold bead */}
        <span
          aria-hidden
          className={`absolute top-1/2 size-4 -translate-y-1/2 rounded-full bg-gold shadow-resting transition-all duration-200 ${
            checked ? "left-[calc(100%-1.25rem)]" : "left-1"
          }`}
        />
      </button>
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
}
