// Structured error logging: one JSON line per error, so it is greppable locally
// and parsed as fields by hosts like Vercel.
type Context = Record<string, unknown>;

function describe(e: unknown): Context {
  if (!(e instanceof Error)) return { value: String(e) };
  const { code, meta, clientVersion, errorCode } = e as Error & Record<string, unknown>;
  return {
    name: e.name,
    message: e.message,
    ...(code !== undefined && { code }),
    ...(errorCode !== undefined && { errorCode }),
    ...(meta !== undefined && { meta }),
    ...(clientVersion !== undefined && { clientVersion }),
    stack: e.stack,
    ...(e.cause !== undefined && { cause: describe(e.cause) }),
  };
}

export function logError(where: string, error: unknown, context: Context = {}) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    where,
    ...context,
    error: describe(error),
  }));
}
