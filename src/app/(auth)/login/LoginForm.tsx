"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Input } from "@/design-system/components";
import { signIn, type AuthState } from "../actions";
import { FormMessage } from "../AuthShell";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <p className="text-right text-sm">
        <Link href="/forgot" className="text-muted underline underline-offset-4 hover:text-primary">
          Forgotten your password?
        </Link>
      </p>
      <FormMessage error={state.error} notice={state.notice} />
      <Button type="submit" className="w-full" loading={pending}>
        Sign in
      </Button>
    </form>
  );
}
