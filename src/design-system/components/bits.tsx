import type { HTMLAttributes, ImgHTMLAttributes } from "react";
import { motifs, type MotifName } from "../motifs";

/** Small display atoms: Badge, Avatar, Divider. */

export function Badge({
  tone = "neutral",
  className = "",
  children,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" | "error" | "accent" | "primary" }) {
  const tones = {
    neutral: "bg-foreground/8 text-foreground",
    success: "bg-success/12 text-success",
    error: "bg-error/12 text-error",
    accent: "bg-accent/15 text-foreground",
    primary: "bg-primary/12 text-primary",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${tones[tone]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}

export function Avatar({
  name,
  src,
  size = 40,
  className = "",
  ...rest
}: ImgHTMLAttributes<HTMLImageElement> & { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full ring-2 ring-ornate ring-offset-2 ring-offset-surface overflow-hidden bg-primary/10 text-primary font-semibold ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} width={size} height={size} className="size-full object-cover" {...rest} />
      ) : (
        initials
      )}
    </span>
  );
}

export function Divider({
  variant = "line",
  motif = "paisley",
  className = "",
}: {
  /** "motif": gold rule with a centred motif (paisley/diya/…) */
  variant?: "line" | "motif";
  motif?: MotifName;
  className?: string;
}) {
  if (variant === "motif") {
    const Motif = motifs[motif];
    return (
      <div role="separator" className={`flex items-center gap-4 ${className}`}>
        <span className="gold-rule flex-1" />
        <Motif aria-hidden className="size-6 text-ornate" />
        <span className="gold-rule flex-1" />
      </div>
    );
  }
  return <hr className={`gold-rule ${className}`} />;
}
