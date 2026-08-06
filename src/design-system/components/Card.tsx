import type { HTMLAttributes } from "react";
import { MehndiCorner } from "../motifs";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** plain: quiet surface · ornate: double gold border + mehndi corners ·
   * envelope: paper with inner envelope-depth shadow */
  variant?: "plain" | "ornate" | "envelope";
}

/**
 * Card surface. `ornate` is the signature wedding-card look.
 * @example <Card variant="ornate" className="p-8">…</Card>
 */
export function Card({ variant = "plain", className = "", children, ...rest }: CardProps) {
  if (variant === "ornate") {
    return (
      <div className={`relative rounded-card bg-surface shadow-resting ornate-border ${className}`} {...rest}>
        <MehndiCorner aria-hidden className="pointer-events-none absolute left-1.5 top-1.5 size-6 text-ornate/70" />
        <MehndiCorner aria-hidden className="pointer-events-none absolute right-1.5 top-1.5 size-6 -scale-x-100 text-ornate/70" />
        <MehndiCorner aria-hidden className="pointer-events-none absolute bottom-1.5 left-1.5 size-6 -scale-y-100 text-ornate/70" />
        <MehndiCorner aria-hidden className="pointer-events-none absolute bottom-1.5 right-1.5 size-6 -scale-100 text-ornate/70" />
        {children}
      </div>
    );
  }
  if (variant === "envelope") {
    return (
      <div className={`rounded-soft bg-surface shadow-envelope border border-ornate/30 ${className}`} {...rest}>
        {children}
      </div>
    );
  }
  return (
    <div className={`rounded-card bg-raised shadow-resting ${className}`} {...rest}>
      {children}
    </div>
  );
}
