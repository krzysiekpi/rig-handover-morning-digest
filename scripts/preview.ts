// Saves a rig page as one self-contained HTML file (ADR 0001, 0003).
// Usage: pnpm preview [path] [out]   (defaults: /digest/2026-10-28, var/preview.html)
// The lane banner carries LANE_MARKER; unset it for the clean-up copy.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApp } from '../src/app.js';

const path = process.argv[2] ?? '/digest/2026-10-28';
const out = process.argv[3] ?? 'var/preview.html';

const res = await createApp().request(path);
if (res.status !== 200) {
  console.error(`${path} answered ${res.status}`);
  process.exit(1);
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, await res.text());
console.log(`saved ${path} -> ${out}`);
