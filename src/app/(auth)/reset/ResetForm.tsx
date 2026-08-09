"use client";

import { useActionState } from "react";
import { Button, Input } from "@/design-system/components";
import { resetPassword, type AuthState } from "../actions";
import { FormMessage } from "../AuthShell";

export function ResetForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(resetPassword, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="email" value={email} />
      <Input
        label="Reset code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        required
        placeholder="123456"
      />
      <Input
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
      />
      <FormMessage error={state.error} notice={state.notice} />
      <Button type="submit" className="w-full" loading={pending}>
        Set my new password
      </Button>
    </form>
  );
}
