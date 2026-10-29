export type RunStatus = 'ok' | 'retry' | 'fail';

// One row per job in a night's run log. Missing data stays visible: `owner` and `lastError`
// are null here and render as `—` (styleguide).
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  // ISO timestamps with the offset kept as logged; never converted to UTC.
  first: string;
  last: string;
};

export type DigestNight = {
  night: string;
  // Sorted by job.
  rows: DigestRow[];
  // Lines that did not parse. Counted, never thrown.
  badLines: number;
};

// Returns null when runs/<night>.jsonl does not exist (the route answers 404).
export type ReadNight = (runsDir: string, night: string) => DigestNight | null;
