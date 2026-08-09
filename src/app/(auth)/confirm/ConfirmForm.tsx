"use client";

import { useActionState } from "react";
import { Button, Input } from "@/design-system/components";
import { confirmSignUp, resendCode, type AuthState } from "../actions";
import { FormMessage } from "../AuthShell";

/**
 * Six digits, typed by hand.
 *
 * Cognito confirms a sign-up with an emailed code rather than a link, which is
 * a real behavioural difference from Supabase and the reason this page exists
 * at all. Two separate forms rather than one with two buttons: a nested form is
 * invalid HTML, and "resend" must not be able to submit a half-typed code.
 */
export function ConfirmForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(confirmSignUp, {});
  const [resendState, resendAction, resending] = useActionState<AuthState, FormData>(
    resendCode,
    {}
  );

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        <Input
          label="Confirmation code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          placeholder="123456"
        />
        <FormMessage error={state.error} notice={state.notice ?? resendState.notice} />
        <Button type="submit" className="w-full" loading={pending}>
          Confirm my email
        </Button>
      </form>

      <form action={resendAction}>
        <input type="hidden" name="email" value={email} />
        <Button type="submit" variant="ghost" className="w-full" loading={resending}>
          Send the code again
        </Button>
      </form>
    </div>
  );
}
