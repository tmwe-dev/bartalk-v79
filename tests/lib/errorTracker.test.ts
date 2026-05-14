/**
 * Tests for src/lib/errorTracker.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  captureError,
  captureReactError,
  captureAPIError,
  getRecentErrors,
  initGlobalErrorHandlers,
} from '../../src/lib/errorTracker';

describe('errorTracker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('captureError', () => {
    it('captures Error object', () => {
      captureError(new Error('Test error'));
      const errors = getRecentErrors();
      expect(errors.length).toBeGreaterThan(0);
      const last = errors[errors.length - 1];
      expect(last.message).toBe('Test error');
      expect(last.type).toBe('js_error');
    });

    it('captures string error', () => {
      captureError('String error message');
      const errors = getRecentErrors();
      const last = errors[errors.length - 1];
      expect(last.message).toBe('String error message');
    });

    it('captures with custom type', () => {
      captureError(new Error('Network'), 'network_error');
      const errors = getRecentErrors();
      const last = errors[errors.length - 1];
      expect(last.type).toBe('network_error');
    });

    it('captures with context', () => {
      captureError(new Error('Test'), 'js_error', { component: 'ChatPanel' });
      const errors = getRecentErrors();
      const last = errors[errors.length - 1];
      expect(last.context).toEqual({ component: 'ChatPanel' });
    });

    it('includes timestamp', () => {
      captureError(new Error('Test'));
      const errors = getRecentErrors();
      const last = errors[errors.length - 1];
      expect(last.timestamp).toBeTruthy();
      expect(new Date(last.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('includes URL and userAgent', () => {
      captureError(new Error('Test'));
      const errors = getRecentErrors();
      const last = errors[errors.length - 1];
      expect(typeof last.url).toBe('string');
      expect(typeof last.userAgent).toBe('string');
    });

    it('truncates stack trace to 1000 chars', () => {
      const err = new Error('Test');
      err.stack = 'x'.repeat(2000);
      captureError(err);
      const errors = getRecentErrors();
      const last = errors[errors.length - 1];
      expect(last.stack!.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('captureReactError', () => {
    it('captures React error with component stack', () => {
      const error = new Error('React render failed');
      captureReactError(error, { componentStack: '  at Component\n  at App' });
      const errors = getRecentErrors();
      const last = errors[errors.length - 1];
      expect(last.type).toBe('react_error');
      expect(last.message).toBe('React render failed');
      expect(last.context?.componentStack).toBeTruthy();
    });

    it('handles missing errorInfo', () => {
      captureReactError(new Error('Test'));
      const errors = getRecentErrors();
      const last = errors[errors.length - 1];
      expect(last.type).toBe('react_error');
    });
  });

  describe('captureAPIError', () => {
    it('captures API error with provider info', () => {
      captureAPIError('openai', '429 Rate Limited', 'Too many requests', 429);
      const errors = getRecentErrors();
      const last = errors[errors.length - 1];
      expect(last.type).toBe('api_error');
      expect(last.message).toContain('openai');
      expect(last.context?.provider).toBe('openai');
      expect(last.context?.httpStatus).toBe(429);
    });
  });

  describe('getRecentErrors', () => {
    it('returns a copy (not the original buffer)', () => {
      captureError(new Error('Test'));
      const errors1 = getRecentErrors();
      const errors2 = getRecentErrors();
      expect(errors1).not.toBe(errors2);
      expect(errors1).toEqual(errors2);
    });

    it('respects buffer size limit of 50', () => {
      for (let i = 0; i < 60; i++) {
        captureError(new Error(`Error ${i}`));
      }
      const errors = getRecentErrors();
      expect(errors.length).toBeLessThanOrEqual(50);
    });
  });

  describe('initGlobalErrorHandlers', () => {
    it('does not throw', () => {
      expect(() => initGlobalErrorHandlers()).not.toThrow();
    });

    it('registers event listeners', () => {
      const spy = vi.spyOn(window, 'addEventListener');
      initGlobalErrorHandlers();
      expect(spy).toHaveBeenCalledWith('error', expect.any(Function));
      expect(spy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    });
  });
});
