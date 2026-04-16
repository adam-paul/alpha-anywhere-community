/**
 * Realtime Worker — internal types.
 *
 * Worker-scoped: bindings + session shape. Cross-project protocol types
 * (ClientRequest, ChannelMessage, ConnectionMeta, etc.) live in
 * `@alpha/shared/types` and are imported directly.
 */

/** Cloudflare bindings + secrets declared in `wrangler.toml`. */
export interface Env {
  CHANNEL: DurableObjectNamespace;
  SESSION_SECRET: string;
}

/** Payload carried inside the HMAC-signed `alpha_session` cookie. */
export interface SessionUser {
  id: string;
  displayName: string;
}
