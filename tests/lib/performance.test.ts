/**
 * BarTalk v8 — Tests for src/lib/performance.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, throttle, memoize } from '../../src/lib/performance';

describe('debounce', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('delays execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('resets timer on subsequent calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(50);
    debounced(); // reset
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('cancel prevents execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('throttle', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('executes immediately on first call', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    expect(fn).toHaveBeenCalledOnce();
  });

  it('blocks subsequent calls within window', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled();
    throttled();
    expect(fn).toHaveBeenCalledOnce();
  });

  it('allows calls after window expires', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    vi.advanceTimersByTime(150);
    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('memoize', () => {
  it('caches results', () => {
    const fn = vi.fn((x: number) => x * 2);
    const memoized = memoize(fn);

    expect(memoized(5)).toBe(10);
    expect(memoized(5)).toBe(10);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('handles different arguments', () => {
    const fn = vi.fn((x: number) => x * 2);
    const memoized = memoize(fn);

    expect(memoized(5)).toBe(10);
    expect(memoized(10)).toBe(20);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('respects maxSize', () => {
    const fn = vi.fn((x: number) => x * 2);
    const memoized = memoize(fn, 3);

    memoized(1);
    memoized(2);
    memoized(3);
    memoized(4); // evicts 1
    expect(fn).toHaveBeenCalledTimes(4);

    memoized(1); // cache miss, was evicted
    expect(fn).toHaveBeenCalledTimes(5);

    memoized(4); // still cached
    expect(fn).toHaveBeenCalledTimes(5);
  });
});
