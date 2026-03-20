/**
 * Structured logger for server-side observability.
 * Outputs JSON lines compatible with Vercel, Datadog, etc.
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  action?: string;
  userId?: string;
  duration?: number;
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, ctx?: LogContext) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...ctx,
  };

  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  info: (message: string, ctx?: LogContext) => log('info', message, ctx),
  warn: (message: string, ctx?: LogContext) => log('warn', message, ctx),
  error: (message: string, ctx?: LogContext) => log('error', message, ctx),

  /** Wraps an async function with timing + error logging */
  async withTiming<T>(action: string, fn: () => Promise<T>, ctx?: LogContext): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      log('info', `${action} completed`, { ...ctx, action, duration: Date.now() - start });
      return result;
    } catch (err) {
      log('error', `${action} failed`, {
        ...ctx,
        action,
        duration: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },
};
