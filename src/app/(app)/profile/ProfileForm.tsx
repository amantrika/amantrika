"use client";

import { useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { Button, Card, Input, Textarea } from "@/design-system/components";
import { updateProfile, type ProfileInput } from "./actions";

export function ProfileForm({
  initial,
  email,
}: {
  initial: Required<Pick<ProfileInput, "fullName">> & Record<string, string>;
  email: string | null;
}) {
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (key: string) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <Card variant="ornate" className="p-6 sm:p-8">
      <h2 className="type-h2 text-primary">About you</h2>
      <p className="mt-1 type-caption">
        Only your name is ever shown publicly, and only on the roadmap if you suggest something.
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <Input label="Your name" value={form.fullName} onChange={set("fullName")} />

        <Input
          label="Email"
          value={email ?? ""}
          disabled
          hint="Changing your email isn't self-service yet — it's how you sign in, so we handle it by hand."
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Phone" value={form.phone} onChange={set("phone")} placeholder="+91 " />
          <Input label="City" value={form.city} onChange={set("city")} placeholder="Jaipur" />
        </div>

        <Input
          label="Instagram"
          value={form.instagram}
          onChange={set("instagram")}
          placeholder="@yourhandle"
          hint="Paste the handle or the whole profile link — we'll tidy it up."
        />

        <Input
          label="What are you celebrating?"
          value={form.occasionNote}
          onChange={set("occasionNote")}
          placeholder="Our wedding — December, Jaipur"
          hint="Just for us, so we know who we're talking to."
        />

        <Textarea
          label="A little about you"
          rows={3}
          value={form.bio}
          onChange={set("bio")}
          hint="Optional. Shown on your partner profile if you join the programme."
        />

        {message && (
          <p
            role={message.isError ? "alert" : "status"}
            className={`type-caption ${message.isError ? "text-red-600 dark:text-red-400" : "text-success"}`}
          >
            {message.text}
          </p>
        )}

        <Button
          className="self-start"
          loading={pending}
          loadingLabel="Saving your profile"
          onClick={() =>
            startTransition(async () => {
              const result = await updateProfile(form as ProfileInput);
              setMessage({
                text: result.ok ? (result.notice ?? "Saved.") : (result.error ?? "Failed."),
                isError: !result.ok,
              });
            })
          }
        >
          Save changes
        </Button>

        {form.instagram && (
          <a
            href={`https://instagram.com/${form.instagram.replace(/^@/, "")}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 type-caption text-primary hover:underline"
          >
            <ExternalLink className="size-4" /> instagram.com/{form.instagram.replace(/^@/, "")}
          </a>
        )}
      </div>
    </Card>
  );
}
