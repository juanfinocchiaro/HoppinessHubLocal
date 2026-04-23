const LOGIN_ATTEMPTS_STORAGE_KEY = 'hoppiness_login_attempts_v1';
const ATTEMPT_WINDOW_MS = 30 * 60 * 1000;
export const LOGIN_CAPTCHA_THRESHOLD = 3;

interface LoginAttemptEntry {
  count: number;
  lastFailedAt: number;
}

type LoginAttemptMap = Record<string, LoginAttemptEntry>;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readAttempts(): LoginAttemptMap {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(LOGIN_ATTEMPTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LoginAttemptMap;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeAttempts(attempts: LoginAttemptMap): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOGIN_ATTEMPTS_STORAGE_KEY, JSON.stringify(attempts));
}

function getActiveEntry(email: string, attempts: LoginAttemptMap): LoginAttemptEntry | null {
  const key = normalizeEmail(email);
  if (!key) return null;

  const entry = attempts[key];
  if (!entry) return null;

  if (Date.now() - entry.lastFailedAt > ATTEMPT_WINDOW_MS) {
    delete attempts[key];
    writeAttempts(attempts);
    return null;
  }

  return entry;
}

export function getFailedLoginAttempts(email: string): number {
  const attempts = readAttempts();
  const entry = getActiveEntry(email, attempts);
  return entry?.count ?? 0;
}

export function registerFailedLoginAttempt(email: string): number {
  const key = normalizeEmail(email);
  if (!key) return 0;

  const attempts = readAttempts();
  const activeEntry = getActiveEntry(email, attempts);
  const nextCount = (activeEntry?.count ?? 0) + 1;

  attempts[key] = {
    count: nextCount,
    lastFailedAt: Date.now(),
  };

  writeAttempts(attempts);
  return nextCount;
}

export function clearFailedLoginAttempts(email: string): void {
  const key = normalizeEmail(email);
  if (!key) return;

  const attempts = readAttempts();
  if (!(key in attempts)) return;

  delete attempts[key];
  writeAttempts(attempts);
}
