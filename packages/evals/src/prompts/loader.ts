/**
 * Prompt loader.
 *
 * Uses Vite's `?raw` import suffix to bundle the markdown files as strings
 * at build time. Works inside the Worker runtime (no filesystem required).
 *
 * When Plan B adds a Bun CLI eval harness, this loader can branch on env
 * (`typeof Bun !== 'undefined'` → read from disk) without changing the
 * consumer API.
 */

import type { ModerationSource } from '../types';

// Vite transforms these into string imports at build time.
import aboutMe from './moderation/about_me.md?raw';
import chatMessage from './moderation/chat_message.md?raw';

const PROMPTS: Record<ModerationSource, string> = {
  about_me: aboutMe,
  chat_message: chatMessage
};

export function loadPrompt(source: ModerationSource): string {
  const prompt = PROMPTS[source];
  if (!prompt) {
    throw new Error(`Unknown moderation source: ${String(source)}`);
  }
  return prompt;
}
