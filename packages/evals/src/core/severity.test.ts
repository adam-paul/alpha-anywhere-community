import { describe, expect, test } from 'bun:test';
import type { CategoryFlag } from '../types';
import { determineSeverity, userFacingMessage } from './severity';

const selfHarmIdeation: CategoryFlag = {
  category: 'self_harm',
  subcategory: 'ideation',
  confidence: 0.9
};
const piiPhone: CategoryFlag = {
  category: 'pii',
  subcategory: 'phone_number',
  confidence: 0.95
};
const harmfulHigh: CategoryFlag = {
  category: 'harmful',
  subcategory: 'hate',
  confidence: 0.85
};
const harmfulMedium: CategoryFlag = {
  category: 'harmful',
  subcategory: 'violence',
  confidence: 0.6
};

describe('determineSeverity', () => {
  test('empty categories → null', () => {
    expect(determineSeverity([])).toBe(null);
  });

  test('self_harm anywhere → critical (wins over harmful/pii)', () => {
    expect(determineSeverity([selfHarmIdeation])).toBe('critical');
    expect(determineSeverity([selfHarmIdeation, harmfulHigh])).toBe('critical');
    expect(determineSeverity([piiPhone, selfHarmIdeation])).toBe('critical');
  });

  test('harmful with max confidence ≥ 0.8 → high', () => {
    expect(determineSeverity([harmfulHigh])).toBe('high');
  });

  test('harmful with max confidence < 0.8 → medium', () => {
    expect(determineSeverity([harmfulMedium])).toBe('medium');
  });

  test('harmful mix: max confidence wins', () => {
    expect(determineSeverity([harmfulMedium, harmfulHigh])).toBe('high');
  });

  test('pii alone → medium', () => {
    expect(determineSeverity([piiPhone])).toBe('medium');
  });
});

describe('userFacingMessage', () => {
  test('empty categories → null', () => {
    expect(userFacingMessage([], 'chat_message')).toBe(null);
  });

  test('PII takes priority over harmful', () => {
    const msg = userFacingMessage([piiPhone, harmfulHigh], 'about_me');
    expect(msg).toMatch(/personal info/);
  });

  test('self_harm includes crisis line', () => {
    const msg = userFacingMessage([selfHarmIdeation], 'chat_message');
    expect(msg).toMatch(/741741/);
  });

  test('chat_message surface uses "this message" wording', () => {
    const msg = userFacingMessage([piiPhone], 'chat_message');
    expect(msg).toMatch(/this message/);
  });

  test('about_me surface uses "your bio" wording', () => {
    const msg = userFacingMessage([piiPhone], 'about_me');
    expect(msg).toMatch(/your bio/);
  });

  test('general harmful gets a neutral message', () => {
    const chatMsg = userFacingMessage([harmfulHigh], 'chat_message');
    expect(chatMsg).toMatch(/can't be sent/);
    const bioMsg = userFacingMessage([harmfulHigh], 'about_me');
    expect(bioMsg).toMatch(/can't be used in your bio/);
  });
});
