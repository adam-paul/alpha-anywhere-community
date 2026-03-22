// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { D1Database, KVNamespace, DurableObjectNamespace } from '@cloudflare/workers-types';
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
        REALTIME: DurableObjectNamespace;
      };
    }
  }
}

export {};
