/**
 * BarTalk v8 — useIsAdmin hook
 * Checks if the current user is admin (email in VITE_ADMIN_EMAILS).
 */

import { useAuthContext } from '../context/AuthContext';

const ADMIN_EMAILS: string[] = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

export function useIsAdmin(): boolean {
  const { user, authState } = useAuthContext();
  if (authState !== 'authenticated' || !user?.email) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}
