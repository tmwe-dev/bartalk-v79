/**
 * BarTalk v8.2.6 — Menu item types
 * Configuration data removed in cleanup (was only used by dead MenuPage).
 */

export interface MenuItemGradient {
  from: string;
  to: string;
  border: string;
}

export interface MenuItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient: MenuItemGradient;
  accentColor: string;
  /** Chiave per feature gating (corrisponde a TIER_FEATURES in featureGating.ts) */
  featureKey: string;
}
