import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const base = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60 };
const realApp = () => createApp({ ...base, runsDir: 'runs' });

const jobs = ['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs'];

type ApiNight = { night: string; rows: { job: string }[]; badLines: number };

// A temp runs dir with the given night files. `runs/` is read-only; never write there.
function tempApp(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  for (const [night, text] of Object.entries(files)) writeFileSync(join(dir, `${night}.jsonl`), text);
  return createApp({ ...base, runsDir: dir });
}

const line = (job: string, status: string, at = '2026-01-02T01:00:00+01:00') =>
  JSON.stringify({ at, job, status, owner: 'rook' });

// The opening tag of the table row that holds `job`.
function rowTag(html: string, job: string): string {
  const cell = html.indexOf(job);
  expect(cell).toBeGreaterThan(-1);
  const start = html.lastIndexOf('<tr', cell);
  return html.slice(start, html.indexOf('>', start) + 1);
}

describe('GET /digest/:night', () => {
  it('renders 2026-10-28 as one table with its 5 jobs sorted by job', async () => {
    const res = await realApp().request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(html.match(/<table/g)).toHaveLength(1);
    const positions = jobs.map((j) => html.indexOf(j));
    expect(positions.every((p) => p > -1)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('mentions the one bad line of 2026-10-28', async () => {
    const html = await (await realApp().request('/digest/2026-10-28')).text();
    expect(html).toMatch(/\b1\b[^<]*bad line/i);
  });

  it('marks rows with retries >= 3 or a fail status, and only those', async () => {
    const app = tempApp({
      '2026-01-02': [
        line('a/clean', 'ok'),
        line('b/retried', 'retry'),
        line('b/retried', 'retry'),
        line('b/retried', 'retry'),
        line('b/retried', 'ok'),
        line('c/failed', 'fail'),
        line('d/two-retries', 'retry'),
        line('d/two-retries', 'retry'),
        line('d/two-retries', 'ok'),
      ].join('\n') + '\n',
    });
    const html = await (await app.request('/digest/2026-01-02')).text();
    const clean = rowTag(html, 'a/clean');
    expect(rowTag(html, 'b/retried')).not.toBe(clean);
    expect(rowTag(html, 'c/failed')).not.toBe(clean);
    expect(rowTag(html, 'd/two-retries')).toBe(clean);
  });

  it('answers 404 for a night with no file', async () => {
    const res = await tempApp({}).request('/digest/2026-01-03');
    expect(res.status).toBe(404);
  });

  it('says "nothing ran" for an empty night', async () => {
    const res = await tempApp({ '2026-01-01': '' }).request('/digest/2026-01-01');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('still renders a night with a bad line and mentions the count', async () => {
    const app = tempApp({ '2026-01-02': `${line('lane/sync', 'ok')}\nnot json\n{"at":1}\n` });
    const res = await app.request('/digest/2026-01-02');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('lane/sync');
    expect(html).toMatch(/\b2\b[^<]*bad line/i);
  });
});

describe('GET /api/digest/:night', () => {
  it('returns { night, rows, badLines } for 2026-10-28', async () => {
    const res = await realApp().request('/api/digest/2026-10-28');
    const body = (await res.json()) as ApiNight;
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(body.night).toBe('2026-10-28');
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(jobs);
  });

  it('answers 404 JSON { error: "no such night" } for a night with no file', async () => {
    const res = await tempApp({}).request('/api/digest/2026-01-03');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no such night' });
  });

  it('returns no rows for an empty night', async () => {
    const res = await tempApp({ '2026-01-01': '' }).request('/api/digest/2026-01-01');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: '2026-01-01', rows: [], badLines: 0 });
  });

  it('counts bad lines and still returns 200', async () => {
    const app = tempApp({ '2026-01-02': `${line('lane/sync', 'ok')}\nnot json\n{"at":1}\n` });
    const res = await app.request('/api/digest/2026-01-02');
    const body = (await res.json()) as ApiNight;
    expect(res.status).toBe(200);
    expect(body.badLines).toBe(2);
    expect(body.rows.map((r) => r.job)).toEqual(['lane/sync']);
  });
});

describe('digest page and JSON agree', () => {
  it('list the same jobs in the same order', async () => {
    const app = realApp();
    const html = await (await app.request('/digest/2026-10-28')).text();
    const body = (await (await app.request('/api/digest/2026-10-28')).json()) as ApiNight;
    const byPage = body.rows.map((r) => r.job).sort((a, b) => html.indexOf(a) - html.indexOf(b));
    expect(byPage).toEqual(body.rows.map((r) => r.job));
  });
});
