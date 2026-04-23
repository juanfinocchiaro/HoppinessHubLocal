/**
 * Centralized Error Handler
 *
 * Provides consistent error handling across the application:
 * - In development: logs detailed error information
 * - In production: logs generic messages, could integrate with monitoring services
 */

import { toast } from 'sonner';

interface ErrorHandlerOptions {
  /** Show a toast notification to the user */
  showToast?: boolean;
  /** Custom user-friendly message (defaults to generic message) */
  userMessage?: string;
  /** Context for debugging (e.g., component name, action) */
  context?: string;
  /** Whether this is a critical error that should always be logged */
  critical?: boolean;
}

const DEFAULT_USER_MESSAGE = 'Ocurrió un error. Por favor, intentá de nuevo.';

/**
 * Handles errors consistently across the application
 *
 * @param error - The error object
 * @param options - Configuration options
 *
 * @example
 * // Basic usage
 * handleError(error);
 *
 * @example
 * // With custom message
 * handleError(error, {
 *   userMessage: 'No se pudo guardar el producto',
 *   context: 'ProductForm.handleSave'
 * });
 *
 * @example
 * // Silent logging (no toast)
 * handleError(error, { showToast: false, context: 'BackgroundSync' });
 */
export function handleError(error: unknown, options: ErrorHandlerOptions = {}): void {
  const {
    showToast = true,
    userMessage = DEFAULT_USER_MESSAGE,
    context,
    critical = false,
  } = options;

  // Extract error details (supports Supabase-style error objects)
  const extractMessage = (err: unknown): string => {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object') {
      const maybeAny = err as Record<string, unknown>;
      const msg = maybeAny.message;
      if (typeof msg === 'string' && msg.trim()) return msg;
      const details = maybeAny.details;
      if (typeof details === 'string' && details.trim()) return details;
      const hint = maybeAny.hint;
      if (typeof hint === 'string' && hint.trim()) return hint;
      // Last resort: JSON stringify
      try {
        return JSON.stringify(maybeAny);
      } catch {
        return '[object Object]';
      }
    }
    return String(err);
  };

  const errorMessage = extractMessage(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Development: log detailed information
  if (import.meta.env.DEV || critical) {
    const logPrefix = context ? `[${context}]` : '[Error]';
    console.error(`${logPrefix} ${errorMessage}`);
    if (errorStack && import.meta.env.DEV) {
      console.error('Stack:', errorStack);
    }
  }

  // Production: could integrate with monitoring service
  // Example: Sentry.captureException(error, { extra: { context } });

  // Show user-friendly message
  if (showToast) {
    toast.error(userMessage);
  }
}

/**
 * Wraps an async function with error handling
 *
 * @param fn - The async function to wrap
 * @param options - Error handling options
 * @returns The wrapped function
 *
 * @example
 * const safeFetch = withErrorHandling(
 *   async () => await fetchData(),
 *   { userMessage: 'Error al cargar datos' }
 * );
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: ErrorHandlerOptions = {},
): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
  return async (...args: Parameters<T>) => {
    try {
      return (await fn(...args)) as ReturnType<T>;
    } catch (error) {
      handleError(error, options);
      return undefined;
    }
  };
}

/**
 * Safely logs information in development only
 * Use this instead of console.log for debug info
 */
export function devLog(message: string, ...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.log(`[DEV] ${message}`, ...args);
  }
}

/**
 * Safely logs warnings in development only
 * Use this instead of console.warn for non-critical issues
 */
export function devWarn(message: string, ...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.warn(`[DEV] ${message}`, ...args);
  }
}
