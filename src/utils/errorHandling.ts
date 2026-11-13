const SENSITIVE_KEY_PATTERN = /(password|token|secret|authorization|cookie|key|phone|email)/i;

export function sanitizeLogMeta(
  meta?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE_KEY_PATTERN.test(k)) {
      clean[k] = '[REDACTED]';
    } else if (typeof v === 'string' && v.length > 200) {
      clean[k] = `${v.slice(0, 200)}…`;
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

export function normalizeAppError(err: unknown, fallbackMessage: string): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : fallbackMessage;

  const lower = raw.toLowerCase();

  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('load failed')) {
    return 'Network connection error. Check your internet connection and retry.';
  }
  if (lower.includes('invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (lower.includes('jwt') || lower.includes('not authenticated') || lower.includes('authentication required')) {
    return 'Your session has expired. Please sign in again.';
  }
  if (lower.includes('forbidden') || lower.includes('unauthorized') || lower.includes('insufficient privileges')) {
    return 'You do not have permission to perform this action.';
  }
  if (lower.includes('row-level security') || lower.includes('violates row-level security')) {
    return 'Access denied by tenant security policy.';
  }
  if (lower.includes('payload too large') || lower.includes('exceeds') || lower.includes('file size')) {
    return raw;
  }

  return raw || fallbackMessage;
}

export function logAppError(
  context: string,
  err: unknown,
  meta?: Record<string, unknown>
): void {
  const safeMeta = sanitizeLogMeta(meta);
  const message = err instanceof Error ? err.message : String(err);
  if (safeMeta) {
    console.error(`[DukaanFlow:${context}] ${message}`, safeMeta);
  } else {
    console.error(`[DukaanFlow:${context}] ${message}`);
  }
}
