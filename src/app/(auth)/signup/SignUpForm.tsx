"use client";

import { useActionState, useState } from "react";
import { Button, Input, ToggleGroup } from "@/design-system/components";
import { signUp, type AuthState } from "../actions";
import { FormMessage } from "../AuthShell";

const roleOptions = [
  { value: "host", label: "I'm hosting" },
  { value: "agent", label: "I'm an agent" },
];

export function SignUpForm({
  referralCode,
  initialRole,
  next = "",
}: {
  referralCode: string;
  initialRole: "host" | "agent";
  /** Where to land after signing up. Already validated as relative by the page. */
  next?: string;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});
  const [role, setRole] = useState<string>(initialRole);
  const isAgent = role === "agent";

  return (
    <form action={action} className="space-y-4">
      <div>
        <span className="type-overline">Account type</span>
        <div className="mt-2">
          <ToggleGroup options={roleOptions} value={role} onChange={setRole} />
        </div>
        <p className="mt-2 type-caption">
          {isAgent
            ? "Agents build invitations for couples and families, and earn a commission on every plan sold."
            : "Hosts create and manage their own celebrations."}
        </p>
      </div>
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="next" value={next} />

      <Input label="Full name" name="fullName" autoComplete="name" required />
      <Input label="Email" name="email" type="email" autoComplete="email" required />
      <Input label="Phone" name="phone" type="tel" autoComplete="tel" placeholder="+91 " />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters."
      />

      {isAgent ? (
        <Input
          label="Agency name"
          name="agencyName"
          hint="Shown to the couples you onboard. Optional."
        />
      ) : (
        <Input
          label="Referral code"
          name="referralCode"
          defaultValue={referralCode}
          hint="If an agent invited you, enter their code so they get credit."
        />
      )}

      <FormMessage error={state.error} notice={state.notice} />
      <Button type="submit" variant="celebration" className="w-full" loading={pending}>
        Create account
      </Button>
    </form>
  );
}
