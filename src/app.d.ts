// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { D1Database, ExecutionContext, KVNamespace } from '@cloudflare/workers-types';
import type { UserContext } from '$lib/types';

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      user: UserContext | null;
    }
    // interface PageData {}
    // interface PageState {}
    interface Platform {
      env?: {
        DB: D1Database;
        KV: KVNamespace;
      };
      /**
       * Cloudflare Workers ExecutionContext. Exposes `waitUntil(promise)` for
       * work that should continue after the response is sent (e.g. audit-log
       * writes). Undefined under vite-only dev (`bun run dev`); populated
       * under `bun run dev:cf` and in production.
       */
      context?: ExecutionContext;
    }
  }
}

export {};
