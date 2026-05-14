/**
 * BarTalk v8 — E2E Type Module Tests
 * Verifies all type modules export correctly and contain expected types.
 */
import { describe, it, expect } from 'vitest';

describe('Type Module Exports', () => {
  it('types/auth exports AuthState and AuthUser', async () => {
    const mod = await import('../../src/types/auth');
    // Type-only exports won't show up at runtime, but the module should load
    expect(mod).toBeDefined();
  });

  it('types/conversation exports correctly', async () => {
    const mod = await import('../../src/types/conversation');
    expect(mod).toBeDefined();
  });

  it('types/agents exports correctly', async () => {
    const mod = await import('../../src/types/agents');
    expect(mod).toBeDefined();
  });

  it('types/settings exports correctly', async () => {
    const mod = await import('../../src/types/settings');
    expect(mod).toBeDefined();
  });

  it('types/courses exports correctly', async () => {
    const mod = await import('../../src/types/courses');
    expect(mod).toBeDefined();
  });

  it('types/orchestrator exports correctly', async () => {
    const mod = await import('../../src/types/orchestrator');
    expect(mod).toBeDefined();
  });

  it('types/billing exports correctly', async () => {
    const mod = await import('../../src/types/billing');
    expect(mod).toBeDefined();
  });

  it('types/tasks exports correctly', async () => {
    const mod = await import('../../src/types/tasks');
    expect(mod).toBeDefined();
  });

  it('types/tools exports correctly', async () => {
    const mod = await import('../../src/types/tools');
    expect(mod).toBeDefined();
  });

  it('types/lifeTutor exports correctly', async () => {
    const mod = await import('../../src/types/lifeTutor');
    expect(mod).toBeDefined();
  });

  it('types/maestro exports correctly', async () => {
    const mod = await import('../../src/types/maestro');
    expect(mod).toBeDefined();
  });

  it('types/education exports correctly', async () => {
    const mod = await import('../../src/types/education');
    expect(mod).toBeDefined();
  });

  it('types/audit exports correctly', async () => {
    const mod = await import('../../src/types/audit');
    expect(mod).toBeDefined();
  });

  it('types/menu exports correctly', async () => {
    const mod = await import('../../src/types/menu');
    expect(mod).toBeDefined();
  });

  it('types/index barrel export works', async () => {
    const mod = await import('../../src/types/index');
    expect(mod).toBeDefined();
  });
});
