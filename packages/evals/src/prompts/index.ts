import type { ModerationSource } from '../types';
import aboutMe from './moderation/about_me.md?raw';
import chatMessage from './moderation/chat_message.md?raw';

export const prompts: Record<ModerationSource, string> = {
  about_me: aboutMe,
  chat_message: chatMessage
};
