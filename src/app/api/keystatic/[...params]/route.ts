import { makeRouteHandler } from "@keystatic/next/route-handler";
import config from "../../../../../keystatic.config";

/**
 * The half of Keystatic that actually touches the filesystem: the editor UI
 * posts here to read and write files under `content/`.
 *
 * `src/middleware.ts` 404s this on any non-local host. That gate matters more
 * here than on the UI — this is the write path, and local storage means it
 * writes to whatever checkout the process is running in.
 */
export const { POST, GET } = makeRouteHandler({ config });
