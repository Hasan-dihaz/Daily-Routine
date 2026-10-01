import { createHash } from 'crypto';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

type Doc = { data: unknown; updatedAt: number };

let ready: Promise<unknown> | null = null;
function db() {
  const sql = neon(DB_URL!);
  // Create the table on first use (idempotent).
  ready ??= sql`CREATE TABLE IF NOT EXISTS plans (key TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at BIGINT NOT NULL)`.catch((e) => { ready = null; throw e; });
  return { sql, ready };
}

// The sync code is the secret; only its hash is used as the storage key.
function keyFor(req: Request) {
  const code = req.headers.get('x-sync-code') || '';
  if (code.length < 12 || code.length > 128) return null;
  return createHash('sha256').update(code).digest('hex');
}

const json = (b: unknown, status = 200) => Response.json(b, { status, headers: { 'Cache-Control': 'no-store' } });
const toDoc = (r?: { data: unknown; updated_at: string }): Doc => (r ? { data: r.data, updatedAt: Number(r.updated_at) } : { data: null, updatedAt: 0 });

export async function GET(req: Request) {
  if (!DB_URL) return json({ error: 'not_configured' }, 503);
  const key = keyFor(req);
  if (!key) return json({ error: 'bad_code' }, 400);
  try {
    const { sql, ready } = db();
    await ready;
    const rows = await sql`SELECT data, updated_at FROM plans WHERE key = ${key}`;
    return json(toDoc(rows[0] as never));
  } catch { return json({ error: 'store_error' }, 502); }
}

export async function PUT(req: Request) {
  if (!DB_URL) return json({ error: 'not_configured' }, 503);
  const key = keyFor(req);
  if (!key) return json({ error: 'bad_code' }, 400);
  try {
    const body = (await req.json()) as Doc;
    if (!body || typeof body.updatedAt !== 'number' || !body.data || typeof body.data !== 'object') return json({ error: 'bad_body' }, 400);
    const value = JSON.stringify(body.data);
    if (value.length > 200_000) return json({ error: 'too_large' }, 413);
    const { sql, ready } = db();
    await ready;
    // Last write wins: stale writes from devices that were offline are ignored.
    await sql`INSERT INTO plans (key, data, updated_at) VALUES (${key}, ${value}::jsonb, ${body.updatedAt})
      ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
      WHERE plans.updated_at <= EXCLUDED.updated_at`;
    const rows = await sql`SELECT data, updated_at FROM plans WHERE key = ${key}`;
    return json(toDoc(rows[0] as never));
  } catch { return json({ error: 'store_error' }, 502); }
}
