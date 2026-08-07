import Link from "next/link";
import type { ReactNode } from "react";
import { Card, Divider } from "@/design-system/components";

/** Shared frame for /login and /signup so both read as one ceremony. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex flex-col items-center leading-none">
          <span className="font-display text-4xl font-semibold text-primary">Amantrika</span>
          <svg aria-hidden viewBox="0 0 120 8" className="h-2 w-32 text-accent">
            <path
              d="M2 5c20-4 40 3 60-1s40-3 56 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </Link>

        <Card variant="ornate" className="p-8">
          <h1 className="type-h1 text-primary">{title}</h1>
          <p className="mt-2 type-body text-muted">{subtitle}</p>
          <Divider className="my-6" />
          {children}
        </Card>

        <p className="mt-6 text-center type-caption">{footer}</p>
      </div>
    </main>
  );
}

/** Inline form feedback. Errors are assertive so screen readers interrupt. */
export function FormMessage({ error, notice }: { error?: string; notice?: string }) {
  if (!error && !notice) return null;
  const isError = Boolean(error);
  return (
    <p
      role={isError ? "alert" : "status"}
      className={`mt-4 rounded-md border px-3 py-2 type-caption ${
        isError
          ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"
          : "border-ornate bg-accent/10 text-foreground"
      }`}
    >
      {error ?? notice}
    </p>
  );
}
