/**
 * BarTalk v8 — Tests for src/lib/taskTemplates.ts
 */
import { describe, it, expect } from 'vitest';
import { DELIVERABLE_TEMPLATES, PHASE_LABELS } from '../../src/lib/taskTemplates';

describe('DELIVERABLE_TEMPLATES', () => {
  const templateTypes = ['report', 'analysis', 'plan', 'lesson', 'creative', 'code', 'brainstorm', 'review', 'custom'];

  it('has all expected template types', () => {
    for (const type of templateTypes) {
      expect(DELIVERABLE_TEMPLATES[type as keyof typeof DELIVERABLE_TEMPLATES]).toBeDefined();
    }
  });

  it('each template has required fields', () => {
    for (const key of Object.keys(DELIVERABLE_TEMPLATES)) {
      const tmpl = DELIVERABLE_TEMPLATES[key as keyof typeof DELIVERABLE_TEMPLATES];
      expect(tmpl.type).toBe(key);
      expect(tmpl.icon).toBeTruthy();
      expect(tmpl.label).toBeTruthy();
      expect(tmpl.description).toBeTruthy();
      expect(tmpl.phases.length).toBeGreaterThanOrEqual(3);
      expect(tmpl.outputFormat).toBeTruthy();
      expect(tmpl.suggestedMode).toBeTruthy();
    }
  });

  it('each template has phase instructions for its phases', () => {
    for (const key of Object.keys(DELIVERABLE_TEMPLATES)) {
      const tmpl = DELIVERABLE_TEMPLATES[key as keyof typeof DELIVERABLE_TEMPLATES];
      for (const phase of tmpl.phases) {
        expect(tmpl.phaseInstructions[phase]).toBeDefined();
      }
    }
  });

  it('all templates include deliverable phase', () => {
    for (const key of Object.keys(DELIVERABLE_TEMPLATES)) {
      const tmpl = DELIVERABLE_TEMPLATES[key as keyof typeof DELIVERABLE_TEMPLATES];
      expect(tmpl.phases).toContain('deliverable');
    }
  });

  it('report template has correct structure', () => {
    const report = DELIVERABLE_TEMPLATES.report;
    expect(report.label).toBe('Report');
    expect(report.outputFormat).toBe('markdown');
    expect(report.phases).toContain('setup');
    expect(report.phases).toContain('analysis');
    expect(report.phases).toContain('synthesis');
  });
});

describe('PHASE_LABELS', () => {
  it('has all phase labels', () => {
    const phases = ['setup', 'analysis', 'debate', 'synthesis', 'deliverable', 'completed'];
    for (const phase of phases) {
      expect(PHASE_LABELS[phase]).toBeDefined();
      expect(PHASE_LABELS[phase].icon).toBeTruthy();
      expect(PHASE_LABELS[phase].label).toBeTruthy();
    }
  });

  it('setup has correct icon', () => {
    expect(PHASE_LABELS.setup.icon).toContain('🎯');
  });

  it('completed has check mark', () => {
    expect(PHASE_LABELS.completed.icon).toContain('✅');
  });
});
