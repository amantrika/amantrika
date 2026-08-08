import "server-only";
import { Resend } from "resend";
import { resendApiKey } from "@/lib/env";

let cached: Resend | null = null;

/**
 * Lazily constructed so importing this module never throws at build time on a
 * machine without RESEND_API_KEY — only an actual send does.
 */
export function resend(): Resend {
  cached ??= new Resend(resendApiKey());
  return cached;
}
