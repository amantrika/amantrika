/**
 * What a cron run reports back. Returned as JSON from `/api/cron/[job]` so a
 * manual invocation is legible without opening the logs.
 */
export type CronJobResult = {
  job: string;
  /** Rows the candidate query returned. */
  considered: number;
  sent: number;
  /** Already claimed by an earlier run, or ledgered without sending in a dry run. */
  skipped: number;
  failed: number;
  error?: string;
};
