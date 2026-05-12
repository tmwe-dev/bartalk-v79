/**
 * BarTalk v8.2.5 — ARIA Live Region Announcements
 * Utility per annunci accessibili via screen reader.
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
