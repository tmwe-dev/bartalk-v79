/**
 * @module announce
 * ARIA live region screen reader announcement utility.
 * Creates and manages a visually hidden live region for accessibility,
 * allowing screen readers to announce dynamic content changes.
 */

/**
 * Announces a status message to screen readers (polite).
 * Used for non-urgent updates like "Messaggio inviato".
 */
export function announceStatus(message: string): void {
  const el = document.getElementById('status-announcer');
  if (el) {
    el.textContent = '';
    // Force re-announcement by clearing then setting after microtask
    requestAnimationFrame(() => {
      el.textContent = message;
    });
  }
}

/**
 * Announces an alert message to screen readers (assertive).
 * Used for urgent messages like errors.
 */
export function announceAlert(message: string): void {
  const el = document.getElementById('alert-announcer');
  if (el) {
    el.textContent = '';
    requestAnimationFrame(() => {
      el.textContent = message;
    });
  }
}
