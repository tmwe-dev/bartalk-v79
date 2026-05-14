/**
 * Tests for src/lib/dbValidation.ts
 */
import { describe, it, expect } from 'vitest';

import {
  validateMessage,
  validateConversation,
  validateProfile,
  validateSettings,
  validateAPIKey,
} from '../../src/lib/dbValidation';

describe('dbValidation', () => {
  describe('validateMessage', () => {
    const validMsg = {
      conversation_id: 'conv-123',
      sender_type: 'human',
      sender_name: 'User',
      content: 'Hello',
    };

    it('accepts valid message', () => {
      expect(() => validateMessage(validMsg)).not.toThrow();
    });

    it('rejects empty conversation_id', () => {
      expect(() => validateMessage({ ...validMsg, conversation_id: '' })).toThrow('conversation_id');
    });

    it('rejects invalid sender_type', () => {
      expect(() => validateMessage({ ...validMsg, sender_type: 'bot' })).toThrow('sender_type');
    });

    it('accepts human sender_type', () => {
      expect(() => validateMessage({ ...validMsg, sender_type: 'human' })).not.toThrow();
    });

    it('accepts assistant sender_type', () => {
      expect(() => validateMessage({ ...validMsg, sender_type: 'assistant' })).not.toThrow();
    });

    it('accepts system sender_type', () => {
      expect(() => validateMessage({ ...validMsg, sender_type: 'system' })).not.toThrow();
    });

    it('rejects empty sender_name', () => {
      expect(() => validateMessage({ ...validMsg, sender_name: '' })).toThrow('sender_name');
    });

    it('rejects whitespace-only sender_name', () => {
      expect(() => validateMessage({ ...validMsg, sender_name: '   ' })).toThrow('sender_name');
    });

    it('rejects empty content', () => {
      expect(() => validateMessage({ ...validMsg, content: '' })).toThrow('content');
    });

    it('rejects content exceeding 50000 chars', () => {
      expect(() => validateMessage({ ...validMsg, content: 'a'.repeat(50001) })).toThrow('content');
    });

    it('accepts content at exactly 50000 chars', () => {
      expect(() => validateMessage({ ...validMsg, content: 'a'.repeat(50000) })).not.toThrow();
    });
  });

  describe('validateConversation', () => {
    const validConv = {
      workspace_id: 'ws-123',
      title: 'My Chat',
    };

    it('accepts valid conversation', () => {
      expect(() => validateConversation(validConv)).not.toThrow();
    });

    it('rejects empty workspace_id', () => {
      expect(() => validateConversation({ ...validConv, workspace_id: '' })).toThrow('workspace_id');
    });

    it('rejects empty title', () => {
      expect(() => validateConversation({ ...validConv, title: '' })).toThrow('title');
    });

    it('rejects title exceeding 200 chars', () => {
      expect(() => validateConversation({ ...validConv, title: 'a'.repeat(201) })).toThrow('title');
    });

    it('accepts title at exactly 200 chars', () => {
      expect(() => validateConversation({ ...validConv, title: 'a'.repeat(200) })).not.toThrow();
    });

    it('rejects negative turn_index', () => {
      expect(() => validateConversation({ ...validConv, turn_index: -1 })).toThrow('turn_index');
    });

    it('rejects non-integer turn_index', () => {
      expect(() => validateConversation({ ...validConv, turn_index: 1.5 })).toThrow('turn_index');
    });

    it('accepts zero turn_index', () => {
      expect(() => validateConversation({ ...validConv, turn_index: 0 })).not.toThrow();
    });
  });

  describe('validateProfile', () => {
    it('accepts valid profile', () => {
      expect(() => validateProfile({ display_name: 'User', plan: 'free' })).not.toThrow();
    });

    it('rejects display_name exceeding 100 chars', () => {
      expect(() => validateProfile({ display_name: 'a'.repeat(101) })).toThrow('display_name');
    });

    it('rejects invalid plan', () => {
      expect(() => validateProfile({ plan: 'enterprise' })).toThrow('plan');
    });

    it('accepts free plan', () => {
      expect(() => validateProfile({ plan: 'free' })).not.toThrow();
    });

    it('accepts pro plan', () => {
      expect(() => validateProfile({ plan: 'pro' })).not.toThrow();
    });

    it('accepts empty profile', () => {
      expect(() => validateProfile({})).not.toThrow();
    });
  });

  describe('validateSettings', () => {
    it('accepts valid settings', () => {
      expect(() => validateSettings({
        conversation_mode: 'standard',
        turn_strategy: 'round_robin',
        temperature: 0.7,
        max_tokens: 2048,
      })).not.toThrow();
    });

    it('rejects invalid conversation_mode', () => {
      expect(() => validateSettings({ conversation_mode: 'turbo' })).toThrow('conversation_mode');
    });

    it('accepts all valid modes', () => {
      for (const mode of ['standard', 'consultation', 'bar_realtime']) {
        expect(() => validateSettings({ conversation_mode: mode })).not.toThrow();
      }
    });

    it('rejects invalid turn_strategy', () => {
      expect(() => validateSettings({ turn_strategy: 'fifo' })).toThrow('turn_strategy');
    });

    it('accepts all valid strategies', () => {
      for (const s of ['round_robin', 'random', 'smart']) {
        expect(() => validateSettings({ turn_strategy: s })).not.toThrow();
      }
    });

    it('rejects temperature below 0', () => {
      expect(() => validateSettings({ temperature: -0.1 })).toThrow('temperature');
    });

    it('rejects temperature above 2', () => {
      expect(() => validateSettings({ temperature: 2.1 })).toThrow('temperature');
    });

    it('accepts temperature at boundaries', () => {
      expect(() => validateSettings({ temperature: 0 })).not.toThrow();
      expect(() => validateSettings({ temperature: 2 })).not.toThrow();
    });

    it('rejects max_tokens below 1', () => {
      expect(() => validateSettings({ max_tokens: 0 })).toThrow('max_tokens');
    });

    it('rejects max_tokens above 128000', () => {
      expect(() => validateSettings({ max_tokens: 128001 })).toThrow('max_tokens');
    });
  });

  describe('validateAPIKey', () => {
    it('accepts valid entry', () => {
      expect(() => validateAPIKey({ provider: 'openai', encrypted_key: 'enc-key-123' })).not.toThrow();
    });

    it('rejects invalid provider', () => {
      expect(() => validateAPIKey({ provider: 'unknown', encrypted_key: 'key' })).toThrow('provider');
    });

    it('accepts all valid providers', () => {
      for (const p of ['openai', 'anthropic', 'gemini', 'groq', 'xai']) {
        expect(() => validateAPIKey({ provider: p, encrypted_key: 'key' })).not.toThrow();
      }
    });

    it('rejects empty encrypted_key', () => {
      expect(() => validateAPIKey({ provider: 'openai', encrypted_key: '' })).toThrow('encrypted_key');
    });

    it('rejects whitespace-only encrypted_key', () => {
      expect(() => validateAPIKey({ provider: 'openai', encrypted_key: '   ' })).toThrow('encrypted_key');
    });
  });
});
