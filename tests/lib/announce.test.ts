/**
 * Tests for src/lib/announce.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { announceStatus, announceAlert } from '../../src/lib/announce';

describe('announce', () => {
  let statusEl: HTMLElement;
  let alertEl: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    // Create DOM elements
    statusEl = document.createElement('div');
    statusEl.id = 'status-announcer';
    document.body.appendChild(statusEl);

    alertEl = document.createElement('div');
    alertEl.id = 'alert-announcer';
    document.body.appendChild(alertEl);
  });

  afterEach(() => {
    vi.useRealTimers();
    statusEl.remove();
    alertEl.remove();
  });

  describe('announceStatus', () => {
    it('clears text content first', () => {
      statusEl.textContent = 'old';
      announceStatus('new message');
      expect(statusEl.textContent).toBe('');
    });

    it('sets text content after requestAnimationFrame', () => {
      announceStatus('Test status');
      // jsdom with fake timers runs rAF synchronously
      vi.runAllTimers();
      expect(statusEl.textContent).toBe('Test status');
    });

    it('does nothing when element is missing', () => {
      statusEl.remove();
      expect(() => announceStatus('Test')).not.toThrow();
    });
  });

  describe('announceAlert', () => {
    it('clears text content first', () => {
      alertEl.textContent = 'old alert';
      announceAlert('new alert');
      expect(alertEl.textContent).toBe('');
    });

    it('does nothing when element is missing', () => {
      alertEl.remove();
      expect(() => announceAlert('Test')).not.toThrow();
    });
  });
});
