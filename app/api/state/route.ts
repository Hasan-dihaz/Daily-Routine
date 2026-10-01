import { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { logError } from '../../../lib/logger';

export const dynamic = 'force-dynamic';

type Doc = { data: unknown; updatedAt: number };

// Single-user app: one shared row.
const key = 'default';

const json = (b: unknown, status = 200) => Response.json(b, { status, headers: { 'Cache-Control': 'no-store' } });
const toDoc = (p: { data: unknown; updatedAt: bigint } | null): Doc => (p ? { data: p.data, updatedAt: Number(p.updatedAt) } : { data: null, updatedAt: 0 });

export async function GET() {
  if (!process.env.DATABASE_URL) {
    logError('GET /api/state', new Error('DATABASE_URL is not set'));
    return json({ error: 'not_configured' }, 503);
  }
  try {
    return json(toDoc(await prisma.plan.findUnique({ where: { key } })));
  } catch (e) {
    logError('GET /api/state', e);
    return json({ error: 'store_error' }, 502);
  }
}

export async function PUT(req: Request) {
  if (!process.env.DATABASE_URL) {
    logError('PUT /api/state', new Error('DATABASE_URL is not set'));
    return json({ error: 'not_configured' }, 503);
  }
  let updatedAtRaw: unknown;
  try {
    const body = (await req.json()) as Doc;
    updatedAtRaw = body?.updatedAt;
    if (!body || typeof body.updatedAt !== 'number' || !body.data || typeof body.data !== 'object') return json({ error: 'bad_body' }, 400);
    if (JSON.stringify(body.data).length > 200_000) return json({ error: 'too_large' }, 413);
    const updatedAt = BigInt(Math.trunc(body.updatedAt));
    const data = body.data as Prisma.InputJsonObject;
    // Last write wins: stale writes from devices that were offline are ignored.
    try {
      await prisma.plan.create({ data: { key, data, updatedAt } });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      await prisma.plan.updateMany({ where: { key, updatedAt: { lte: updatedAt } }, data: { data, updatedAt } });
    }
    return json(toDoc(await prisma.plan.findUnique({ where: { key } })));
  } catch (e) {
    logError('PUT /api/state', e, { updatedAt: updatedAtRaw });
    return json({ error: 'store_error' }, 502);
  }
}
