/**
 * LWAI Proxy — internal types.
 *
 * Lambda-scoped: handler response shapes. Cross-project contracts (e.g.
 * `GatingResponse`) live in `@alpha/shared/types` and are imported directly.
 */

export interface ProbeResponse {
  email: string;
  exists: boolean;
}

export interface ErrorResponse {
  error: string;
}
