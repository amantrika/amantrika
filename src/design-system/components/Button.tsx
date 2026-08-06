"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "celebration";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary: maroon w/ gold border on hover · secondary: gold outline ·
   * ghost: text only · celebration: rani pink with gold shimmer on hover */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** shows a slow gold spinner and disables the button */
  loading?: boolean;
}

const sizeCls: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-5 py-2.5 text-base gap-2",
  lg: "px-7 py-3.5 text-lg gap-2.5",
};

const variantCls: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-bg border border-primary hover:border-ornate hover:shadow-gold-glow",
  secondary:
    "bg-transparent text-foreground border border-ornate hover:bg-accent/10",
  ghost: "bg-transparent text-primary border border-transparent hover:bg-primary/8",
  celebration:
    "bg-rani text-ivory border border-rani hover:shadow-gold-glow hover:border-gold",
};

/**
 * Amantrika Button. All colors flow from semantic tokens so it restyles
 * per theme automatically.
 * @example <Button variant="celebration" size="lg">Send blessings</Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, className = "", children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-soft font-semibold tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${sizeCls[size]} ${variantCls[variant]} ${className}`}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="inline-block size-4 rounded-full border-2 border-gold border-t-transparent animate-spin [animation-duration:1.2s]"
        />
      )}
      {children}
    </button>
  );
});
