import type { DigestNight, DigestRow } from '../digest/types.js';

const dash = '—';

function flags(row: DigestRow): string[] {
  const out: string[] = [];
  if (row.retries >= 3) out.push('retries ≥ 3');
  if (row.lastStatus === 'fail') out.push('fail');
  return out;
}

export function DigestPage({ digest }: { digest: DigestNight }) {
  return (
    <>
      <h1>digest · {digest.night}</h1>
      {digest.badLines > 0 && (
        <p class="warn">
          {`${digest.badLines} bad ${digest.badLines === 1 ? 'line' : 'lines'} (could not be parsed)`}
        </p>
      )}
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((row) => {
              const marks = flags(row);
              return (
                <tr class={marks.length > 0 ? 'warn' : undefined}>
                  <td>
                    {row.job}
                    {marks.length > 0 && <> [{marks.join(', ')}]</>}
                  </td>
                  <td>{row.owner ?? dash}</td>
                  <td>{row.runs}</td>
                  <td>{row.retries}</td>
                  <td>{row.lastStatus}</td>
                  <td>{row.lastError ?? dash}</td>
                  <td>{row.first}</td>
                  <td>{row.last}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}

export function DigestNotFound({ night }: { night: string }) {
  return (
    <>
      <h1>digest</h1>
      <p class="warn">no digest for {night}</p>
    </>
  );
}
