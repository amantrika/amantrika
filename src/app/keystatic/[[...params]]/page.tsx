"use client";

import { makePage } from "@keystatic/next/ui/app";
import config from "../../../../keystatic.config";

/**
 * The editor UI. A client component because that is what Keystatic ships — it
 * is an app, not a page, and it renders entirely in the browser.
 *
 * Reachable only from a local host; `src/middleware.ts` 404s it everywhere
 * else, and `src/app/keystatic/layout.tsx` repeats the check for any path that
 * bypasses middleware.
 */
export default makePage(config);
