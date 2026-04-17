# Security & Compliance Audit — April 2026

Response to DevOps infrastructure/security standards rollout and upcoming compliance audit.

---

## Action Items

### 1. GitHub Org Migration

Current repo: `adam-paul/alpha-anywhere-community` (private, personal account).
Needs to move to `superbuilders` org.

Post-transfer updates:

- Git remotes on all dev machines
- Cloudflare Pages deploy hooks pointing at the old repo
- Any CI referencing the repo path

### 2. Vendor & Tool Inventory (due April 17)

| Vendor                                                   | Used For                                                    | Stores/Processes PII?                                                                          | Whose PII?                            | DPA Signed?       |
| -------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------- |
| **Cloudflare** (Pages, D1, KV, Workers, Durable Objects) | Hosting, primary database, cache, realtime WebSocket        | **Yes** — D1 stores user profiles, emails, display names, messages, friendships, notifications | Student                               | ?                 |
| **AWS Cognito** (via Timeback)                           | SSO / authentication                                        | **Yes** — login credentials, email, user attributes                                            | Student                               | ?                 |
| **Timeback / EduBridge**                                 | XP gating, OneRoster identity resolution, M2M analytics API | **Yes** — student email, activity/XP data, enrollment                                          | Student                               | ?                 |
| **AWS Lambda + Athena** (LWAI Proxy)                     | Learning analytics — weekly active minutes per student      | **Yes** — queries by student email against `coachbot-data-feed`                                | Student                               | ?                 |
| **LiveKit** (self-hosted on DigitalOcean)                | Voice chat                                                  | **Yes** — user identity in JWT tokens, room participation                                      | Student                               | N/A (self-hosted) |
| **DigitalOcean**                                         | Hosts LiveKit server                                        | **Yes** — voice traffic transits their infra                                                   | Student                               | ?                 |
| **Roblox Open Cloud API**                                | Game presence, username lookup, account linking             | **Minimal** — Roblox user IDs/usernames (public data), no school PII sent to Roblox            | Student (public gaming identity only) | ?                 |

---

## Policy Impact Assessment

### PII & AWS Requirement

> "Any applications storing student PII beyond simple directory information will be required to use AWS."

We store student PII (emails, display names, messages, social graph, profiles with bio/location) in **Cloudflare D1**, not AWS. This is more than "simple directory information." Under this policy, we would need to migrate our primary database off Cloudflare D1 to an AWS-hosted database (e.g., RDS, DynamoDB, Aurora).

**This is a significant architectural change.** Our entire data layer is built on D1 + KV + Durable Objects.

Options:

1. **Full migration to AWS** — Replace D1 with RDS/Aurora, KV with ElastiCache/DynamoDB, Durable Objects with something else. Major rewrite of the data layer.
2. **Hybrid approach** — Keep Cloudflare for hosting/edge but move PII storage to AWS. Adds latency and complexity.
3. **Negotiate an exception** — Cloudflare is SOC 2 Type II compliant and offers DPA. Ask if Cloudflare with a signed DPA satisfies the spirit of the requirement, or if AWS is a hard mandate.

**Recommendation**: Pursue option 3 first. A forced migration to AWS would be weeks of work and would lose the edge-computing advantages we get from Cloudflare.

### IaC & Tagging

Current infra state:

| Resource                   | IaC Status                                   |
| -------------------------- | -------------------------------------------- |
| Cloudflare Pages + D1 + KV | `wrangler.toml` (declarative, not Terraform) |
| AWS Lambda (LWAI Proxy)    | **SST** (`sst.config.ts`) — already IaC      |
| LiveKit on DigitalOcean    | Unknown — may be manually provisioned        |

Likely work needed:

- Add resource tagging to SST config (straightforward)
- Potentially wrap Cloudflare resources in Terraform if standardized IaC is required
- Document or codify the LiveKit/DigitalOcean setup

### Vendor DPAs

Critical-tier vendors (store/process student PII) needing DPAs:

- **Cloudflare** (offers standard DPA)
- **DigitalOcean** (offers DPA)
- **Timeback/EduBridge** (internal tool — check if org-level DPA exists)
- **AWS** (has BAA/DPA available)

Roblox is lower tier — we only send/receive public gaming identity data, not school PII.

---

## COPPA/CCPA/FERPA Compliance Gaps (for April 22 assessment)

Since this is a student platform for homeschool kids (likely minors), COPPA applies directly.

Current gaps:

- No explicit parental consent flow
- No data retention/deletion policy implemented
- No audit logging for data access
- Messages stored indefinitely with no purge mechanism
- No documented privacy policy enforcement in code

These should be flagged to DevOps as known gaps.

---

## Technical Stack Summary

| Layer            | Technology                            | PII Exposure                                          |
| ---------------- | ------------------------------------- | ----------------------------------------------------- |
| Frontend/SSR     | SvelteKit on Cloudflare Pages         | Session cookies (signed, httpOnly)                    |
| Primary Database | Cloudflare D1 (SQLite at edge)        | Users, profiles, messages, friendships, notifications |
| Cache            | Cloudflare KV                         | Game launch records (ephemeral, 5-min TTL)            |
| Realtime         | Cloudflare Durable Objects + Workers  | Presence, WebSocket channels                          |
| Auth/SSO         | AWS Cognito via Timeback SDK (OAuth2) | Student credentials, email                            |
| Analytics Proxy  | AWS Lambda + Athena (via SST)         | Student email -> active learning minutes              |
| Voice Chat       | LiveKit (self-hosted, DigitalOcean)   | User identity, voice streams                          |
| External API     | Roblox Open Cloud                     | Public gaming identity                                |

### PII in Database (Cloudflare D1)

| Table           | PII Fields                                             |
| --------------- | ------------------------------------------------------ |
| `users`         | `email`, `display_name`, `timeback_id`                 |
| `profiles`      | `bio`, `location`, `roblox_user_id`, `roblox_username` |
| `messages`      | `content`, `image_url` (user-generated content)        |
| `friendships`   | Social graph (`requester_id`, `addressee_id`)          |
| `notifications` | `recipient_id`, `actor_id`                             |
| `conversations` | Participant membership                                 |

### PII in External Systems

| Service                    | Data Held                                               |
| -------------------------- | ------------------------------------------------------- |
| AWS Cognito (via Timeback) | Login credentials, email, user attributes               |
| Timeback / EduBridge       | Student email, activity/XP data, enrollment             |
| AWS Athena                 | Weekly active learning minutes per student email        |
| LiveKit (DigitalOcean)     | User identity in JWT, voice call participation          |
| Cloudflare KV              | Game launch records keyed by Roblox user ID (5-min TTL) |

### Environment Variables & Secrets

| Variable                     | Classification |
| ---------------------------- | -------------- |
| `AWS_COGNITO_CLIENT_SECRET`  | Critical       |
| `TIMEBACK_API_CLIENT_SECRET` | Critical       |
| `SESSION_SECRET`             | Critical       |
| `EVALS_HASH_SECRET`          | Critical       |
| `GAME_CREDENTIALS_KEY`       | Critical       |
| `LIVEKIT_API_SECRET`         | Critical       |
| `AWS_COGNITO_CLIENT_ID`      | High           |
| `TIMEBACK_API_CLIENT_ID`     | High           |
| `LWAI_API_KEY`               | High           |
| `ROBLOX_API_KEY`             | High           |
| `LIVEKIT_API_KEY`            | High           |
| `CLOUDFLARE_ACCOUNT_ID`      | High           |

All secrets stored in `.env` (gitignored) for local dev. Production secrets managed via Cloudflare Pages secrets.

---

## Recommended Next Steps

1. **This week**: Ask DevOps whether the AWS-for-PII requirement is a hard mandate or if Cloudflare with a signed DPA qualifies
2. **By April 17**: Submit vendor inventory (fill in DPA status)
3. **By April 17**: Start GitHub repo transfer to `superbuilders` org
4. **Flag for April 22**: COPPA compliance gaps (no parental consent flow, no data retention policy, no audit logging)
