"use client";

import { useActionState } from "react";
import { Button, Input } from "@/design-system/components";
import { requestPasswordReset, type AuthState } from "../actions";
import { FormMessage } from "../AuthShell";

export function ForgotForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, {});

  return (
    <form action={action} className="space-y-4">
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
      />
      <FormMessage error={state.error} notice={state.notice} />
      <Button type="submit" className="w-full" loading={pending}>
        Send me a reset code
      </Button>
    </form>
  );
}
