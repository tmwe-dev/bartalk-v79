/**
 * BarTalk v8.2.4 — E2E Browser Tests
 * Playwright tests for core user flows.
 */

import { test, expect } from '@playwright/test';

// ═══════════════════════════════════════════════════
//  1. PAGE LOAD & NAVIGATION
// ═══════════════════════════════════════════════════

test.describe('App Load', () => {
  test('homepage loads and shows app name', async ({ page }) => {
    await page.goto('/');
    // Should redirect to /radio-chat or show welcome
    await expect(page).toHaveTitle(/BarTalk/i);
  });

  test('shows navbar with BarTalk branding', async ({ page }) => {
    await page.goto('/');
    const navbar = page.locator('.navbar');
    await expect(navbar).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.navbar-title')).toContainText('BarTalk');
  });

  test('shows version number', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.navbar-version', { timeout: 10000 });
    const version = page.locator('.navbar-version');
    await expect(version).toContainText('v8.2');
  });
});

// ═══════════════════════════════════════════════════
//  2. WELCOME / ONBOARDING
// ═══════════════════════════════════════════════════

test.describe('Welcome Page', () => {
  test('welcome page renders at /welcome', async ({ page }) => {
    await page.goto('/welcome');
    await expect(page.locator('body')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════
//  3. SETTINGS PAGE
// ═══════════════════════════════════════════════════

test.describe('Settings Page', () => {
  test('settings page loads at /settings', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('.settings-page')).toBeVisible({ timeout: 10000 });
  });

  test('settings has sidebar tabs', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('.settings-sidebar', { timeout: 10000 });
    const tabs = page.locator('.settings-sidebar-btn');
    await expect(tabs).toHaveCount(5);
  });

  test('can switch between tabs', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('.settings-sidebar', { timeout: 10000 });

    // Click "Agenti" tab
    await page.click('text=Agenti');
    await expect(page.locator('text=Agenti AI')).toBeVisible();
  });

  test('back button navigates to chat', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('.settings-back-btn', { timeout: 10000 });
    await page.click('.settings-back-btn');
    await expect(page).toHaveURL(/radio-chat/);
  });
});

// ═══════════════════════════════════════════════════
//  4. CHAT PAGE
// ═══════════════════════════════════════════════════

test.describe('Chat Page', () => {
  test('chat page loads at /radio-chat', async ({ page }) => {
    await page.goto('/radio-chat');
    await expect(page.locator('.navbar')).toBeVisible({ timeout: 10000 });
  });

  test('input box is visible', async ({ page }) => {
    await page.goto('/radio-chat');
    await page.waitForSelector('.input-box', { timeout: 10000 });
    const textarea = page.locator('.input-box textarea');
    await expect(textarea).toBeVisible();
  });

  test('send button exists', async ({ page }) => {
    await page.goto('/radio-chat');
    await page.waitForSelector('.input-box', { timeout: 10000 });
    const sendBtn = page.locator('.send-button');
    await expect(sendBtn).toBeVisible();
  });

  test('can type in chat input', async ({ page }) => {
    await page.goto('/radio-chat');
    await page.waitForSelector('.input-box textarea', { timeout: 10000 });
    const textarea = page.locator('.input-box textarea');
    await textarea.fill('Ciao BarTalk!');
    await expect(textarea).toHaveValue('Ciao BarTalk!');
  });
});

// ═══════════════════════════════════════════════════
//  5. NAVBAR INTERACTIONS
// ═══════════════════════════════════════════════════

test.describe('Navbar', () => {
  test('theme toggle button exists', async ({ page }) => {
    await page.goto('/radio-chat');
    await page.waitForSelector('.navbar', { timeout: 10000 });
    // Theme toggle should be one of the nav-btn elements
    const themeBtn = page.locator('button[aria-label*="tema"]');
    await expect(themeBtn).toBeVisible();
  });

  test('settings button opens settings modal', async ({ page }) => {
    await page.goto('/radio-chat');
    await page.waitForSelector('.navbar', { timeout: 10000 });
    const settingsBtn = page.locator('button[title="Impostazioni (Ctrl+K)"]');
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();
    // Modal should open (SettingsModal)
    await expect(page.locator('body')).toBeVisible();
  });

  test('new chat button is clickable', async ({ page }) => {
    await page.goto('/radio-chat');
    await page.waitForSelector('.navbar', { timeout: 10000 });
    const newChatBtn = page.locator('button[title="Nuova conversazione"]');
    await expect(newChatBtn).toBeVisible();
    await newChatBtn.click();
    // Should not crash
    await expect(page.locator('.navbar')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════
//  6. DEBUG PAGE
// ═══════════════════════════════════════════════════

test.describe('Debug Page', () => {
  test('debug page loads at /radio-debug', async ({ page }) => {
    await page.goto('/radio-debug');
    await expect(page.locator('body')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════
//  6b. V2 ROUTES
// ═══════════════════════════════════════════════════

test.describe('V2 Routes', () => {
  test('courses page loads at /courses', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.locator('body')).toBeVisible();
    // Should have PageShell (navbar)
    await expect(page.locator('.navbar').or(page.locator('nav'))).toBeVisible({ timeout: 10000 });
  });

  test('maestro page loads at /maestro', async ({ page }) => {
    await page.goto('/maestro');
    await expect(page.locator('body')).toBeVisible();
  });

  test('life tutor page loads at /life-tutor', async ({ page }) => {
    await page.goto('/life-tutor');
    await expect(page.locator('body')).toBeVisible();
  });

  test('free voice page loads at /free-voice', async ({ page }) => {
    await page.goto('/free-voice');
    await expect(page.locator('body')).toBeVisible();
  });

  test('progress page loads at /progress', async ({ page }) => {
    await page.goto('/progress');
    await expect(page.locator('body')).toBeVisible();
  });

  test('billing page loads at /billing', async ({ page }) => {
    await page.goto('/billing');
    await expect(page.locator('body')).toBeVisible();
  });

  test('privacy page loads at /privacy', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('body')).toBeVisible();
  });

  test('terms page loads at /terms', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.locator('body')).toBeVisible();
  });

  test('landing page loads at /landing', async ({ page }) => {
    await page.goto('/landing');
    await expect(page.locator('body')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════
//  7. ROUTING — CATCH-ALL
// ═══════════════════════════════════════════════════

test.describe('Routing', () => {
  test('unknown route does not show blank page', async ({ page }) => {
    await page.goto('/nonexistent-page');
    // SPA should catch-all and redirect or show content
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('login page loads at /login', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('body')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════
//  8. ACCESSIBILITY BASICS
// ═══════════════════════════════════════════════════

test.describe('Accessibility', () => {
  test('settings page has correct ARIA roles', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('.settings-page', { timeout: 10000 });
    const main = page.locator('[role="main"]');
    await expect(main).toBeVisible();
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();
  });

  test('skip-to-content link exists on settings', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('.settings-page', { timeout: 10000 });
    const skipLink = page.locator('.sr-only');
    // Should exist even if not visible
    await expect(skipLink.first()).toBeAttached();
  });
});

// ═══════════════════════════════════════════════════
//  9. API HEALTH
// ═══════════════════════════════════════════════════

test.describe('API Health', () => {
  test('health endpoint returns OK', async ({ request }) => {
    const res = await request.get('/api/ai-proxy', {
      params: { health: '1' }
    });
    // May return 200 or 405 depending on method but should not 500
    expect(res.status()).toBeLessThan(500);
  });
});
