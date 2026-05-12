/**
 * BarTalk v8.2.5 — Performance utilities
 * Debounce, throttle, memoization, and lazy loading helpers.
 */

/**
 * Debounce: delays execution until after `wait` ms of inactivity.
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  wait: number
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: unknown[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return debounced as T & { cancel: () => void };
}

/**
 * Throttle: allows execution at most once every `wait` ms.
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  wait: number
): T {
  let lastTime = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: unknown[]) => {
    const now = Date.now();
    const remaining = wait - (now - lastTime);
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastTime = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastTime = Date.now();
        timer = null;
        fn(...args);
      }, remaining);
    }
  }) as T;
}

/**
 * Simple memoize for pure functions with a single argument.
 */
export function memoize<A, R>(fn: (arg: A) => R, maxSize = 100): (arg: A) => R {
  const cache = new Map<A, R>();
  return (arg: A) => {
    if (cache.has(arg)) return cache.get(arg)!;
    const result = fn(arg);
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) cache.delete(firstKey);
    }
    cache.set(arg, result);
    return result;
  };
}

/**
 * requestIdleCallback polyfill
 */
export const requestIdle: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number =
  typeof requestIdleCallback === 'function'
    ? requestIdleCallback
    : (cb, opts) => setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline), opts?.timeout ?? 1) as unknown as number;

/**
 * Run a low-priority task during browser idle time.
 */
export function runWhenIdle(fn: () => void, timeout = 2000): void {
  requestIdle(fn, { timeout });
}

/**
 * Preload an image — returns a promise that resolves when loaded.
 */
export function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Batch preload multiple images (non-blocking).
 */
export function preloadImages(srcs: string[]): void {
  srcs.forEach(src => {
    const img = new Image();
    img.src = src;
  });
}
