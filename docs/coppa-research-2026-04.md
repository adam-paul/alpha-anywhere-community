# COPPA Research — Alpha Anywhere Community

_Research compiled 2026-04-16._

Before diving in: a timing note. The 2025 COPPA amendments have a hard compliance deadline of **April 22, 2026** — six days from today. Whatever path we pick, moving soon matters.

---

## 1. What COPPA Is

The **Children's Online Privacy Protection Act** (COPPA; 15 U.S.C. §§ 6501–6506) and its implementing **Rule** (16 CFR Part 312) regulate any online operator that collects personal information from children under 13. Enforced by the **FTC**, with penalties of up to **$51,744 per violation** (each child counts separately — fines scale fast).

The Rule applies whenever one of these is true:

1. **"Child-directed"** — the site/service is directed to children under 13 (totality-of-circumstances test: subject matter, visuals, language, ads, audience);
2. **"Mixed-audience"** — a general-audience service with a portion directed at children;
3. **"Actual knowledge"** — a general-audience service that knows, in fact, that a specific user is under 13.

**Alpha Anywhere Community is almost certainly "child-directed"** — the platform is a work-walled community portal _for homeschool students_, integrated with a learning system. The FTC's totality test (marketing, subject matter, audience) lands squarely on child-directed. Plan accordingly; do not try to argue general-audience-with-age-gate.

### Core operator obligations (§ 312.3–312.10)

1. **Post a clear privacy policy** listing what's collected, how it's used, who it's shared with, and parental rights.
2. **Give direct notice** to parents _before_ collecting PI.
3. **Obtain verifiable parental consent (VPC)** before collection.
4. **Let parents review, delete, and stop collection** of their child's data at any time.
5. **Retain only as long as reasonably necessary** (2025 rule: written retention policy required).
6. **Maintain reasonable security** (2025 rule: written information security program required).
7. **Don't condition participation on more data than necessary.**

### Definition of "personal information" (post-2025)

- First/last name, home/physical address, email, phone, SSN
- **Persistent identifiers** (cookies, device ID, IP address, customer number)
- Photos, videos, or audio containing a child's image or voice
- Geolocation (street-level)
- Screen/user names that function as online contact info
- **NEW (2025): biometric identifiers** — fingerprints, retina scans, **voiceprints**, genetic data, gait
- **NEW (2025): government-issued identifiers**

**Voiceprints are now PI.** This is the single most important 2025 change for us given LiveKit voice chat.

---

## 2. The 2025 Amendments (compliance deadline: **2026-04-22**)

Significant additions beyond the 1999/2013 baseline:

1. **Written data-retention policy** — publicly disclosed, specific per data type, no indefinite storage.
2. **Written information-security program** — designated owner, annual risk assessment, vendor written confirmations, annual updates.
3. **Separate VPC for third-party disclosures** — a parent consenting to _collection_ does not automatically consent to _sharing_. Two consents, not one. (Exception: disclosure "integral to" the service.)
4. **Enhanced direct notice & privacy policy** — must list recipient categories, retention timelines, persistent-identifier practices, and audio-file handling.
5. **New VPC methods** — knowledge-based authentication (KBA) with questions kids can't answer, government-ID-plus-facial-recognition, text-plus.
6. **Narrow audio-file exception codified** — voice accepted _without_ VPC only if (a) collected solely to respond to a specific request, (b) no other PI collected, (c) immediately deleted, (d) disclosed in privacy policy. **Real-time peer voice chat does not qualify.**
7. **Mixed-audience defined explicitly** — age-screen required before collection; under-13 users trigger full COPPA.

---

## 3. How COPPA Maps to Our Modalities

Codebase inventory cross-referenced with regulatory requirements:

### 3.1 Identity / Timeback SSO

- **Currently collected**: email, display name, Timeback ID (OneRoster `sourcedId`).
- **Not collected**: birthdate, age, parental email, parental consent flag.
- **Problem**: the platform cannot identify who is under 13, so it cannot apply differential treatment. Under COPPA, if you operate a child-directed service, you **must assume all users are under 13** unless you have reliable age information — you don't get to avoid VPC by staying blind.
- **Open question — worth resolving first**: Has Alpha Schools (or Timeback) already obtained verifiable parental consent during enrollment, and does that consent cover this platform's social/voice features? If yes, the school-agent pathway may cover a lot. If no, this platform needs its own consent flow. This is a legal/business question that should precede any technical work.

### 3.2 Profile data (bio, location, interests, avatar, cover, Roblox link)

- Bio and location are **free-text user input** → already moderated, good.
- **Location field**: if granularity approaches street/city level, it's PI (geolocation). Keep it free-text-but-moderated OR switch to a coarse picker (country/state).
- **Avatar & cover**: photos of a child = PI under COPPA. If these are user-uploaded photos (not generated/selected from a set), full VPC applies.
- **Roblox username + user ID**: PI. Linking to a Roblox account effectively transfers/associates PI with a third party — requires separate disclosure (and under 2025 rule, separate VPC for third-party sharing).
- **Retention**: bios/locations/avatars are currently kept "indefinite." The 2025 rule requires a written retention policy with specific timelines.

### 3.3 Text chat (DMs, group chats, game lobbies)

Three COPPA-relevant aspects:

1. **Disclosure by chat is "disclosure" under COPPA.** When a child sends PI in a message, the operator is deemed to have disclosed it publicly-in-identifiable-form. Historically FTC enforcement has hit chat features hard. **Strong content filtering for PI in messages (names, phone, address, email, Roblox usernames outside the link flow) is not optional — it's the standard of care.** Our moderation pipeline covers harmful content; extend it to PI.
2. **Message retention** — messages are currently soft-deleted only, kept indefinitely. 2025 rule requires specific retention timelines. A reasonable policy: e.g., 30–90 days for active conversations, hard-delete on user/parent request.
3. **Parental deletion right** — a parent asking for their child's data to be deleted must be honored. Current soft-delete preserves content, which is insufficient. Need hard-delete path (with audit log if required for safety/moderation, but that audit must itself have a retention limit).

### 3.4 Voice chat (LiveKit)

**Highest-risk modality.** The 2025 rule makes voiceprints PI. Real-time voice communication between children implicates several issues:

- **Audio is PI.** Every second of voice transiting LiveKit contains a child's voice — PI under § 312.2. If LiveKit (or we) records _any_ audio, even transiently, even for anti-abuse, it's covered.
- **The narrow audio exception does not apply** — that exception is for transcription-only, immediately-deleted, no-other-PI scenarios (e.g., voice search). Peer-to-peer conversation fails all four conditions.
- **Third-party disclosure.** LiveKit is a third-party processor. Under 2025 rule, we need a written processor agreement with security attestations, **and** parental consent that covers disclosure to LiveKit.
- **LiveKit self-hosted on DO**: helps reduce third-party exposure but does not eliminate DigitalOcean as an infra vendor — still needs processor terms.
- **If LiveKit recording is on for any reason** (moderation, abuse response, quality), that's high-risk PI storage. Verify server config; default should be **no recording, no transcription, no biometric processing**.
- **Voice activity detection / speaker ID / transcription** — if enabled for any feature (caption, moderation, AI assistant), treat as biometric processing → separate VPC.

### 3.5 Arcade / Games (Roblox, web, iframe)

- **Roblox integration** deep-links kids to Roblox with encrypted server credentials. Roblox has its own COPPA-compliant program (safe harbor) but is a third party. Link creates data sharing both directions (Roblox IDs back to us, user ID contextually to Roblox).
- **Game presence data** (KV `presence:user:{userId}` → `{gameId, robloxUserId}`) ties two persistent identifiers together. Persistent identifier collection is OK under the **internal operations exception** only if used solely to maintain/operate the service — profile-building, analytics, or behavioral advertising breaks the exception.
- **Third-party games** (iframe, web): if any loads third-party scripts, analytics, or ads, we've become a conduit. Safest posture: vet every embedded game for COPPA compliance and document it.

### 3.6 Friends / presence / notifications

- **Friend requests & acceptance** don't directly collect new PI, but they expose one child's identity (username + display name) to another. FTC has historically treated "friend finder" and public-profile features as chat-adjacent features needing heightened care.
- **Notifications table** includes `friend_request_received`, `voice_call_started`, `conversation_created` — these are operational and fine under internal operations, but retention policy still applies.
- **Online-status inference** from voice-token generation is a persistent identifier use — internal operations OK, but documented.

### 3.7 Third-party integrations

Each third party receiving PI is a separate disclosure under § 312.4(d) post-2025:

- **Timeback / AWS Cognito** — identity provider; school relationship presumably covers this if school-agent doctrine applies.
- **Timeback EduBridge / LWAI (Athena)** — student email sent for XP/gating lookups. Educational purpose; document it.
- **LiveKit** — see above; highest-risk.
- **Roblox public APIs** — username lookups, presence queries with Roblox user IDs. Disclosed in privacy policy.
- **Cloudflare (Pages, D1, KV, Workers)** — infra processor; standard DPA sufficient.
- **Gemini + OpenAI (moderation)** — chat text sent for classification. We already HMAC-hash user IDs in `generation_events` (good). Content itself goes out. Verify both providers offer no-training / zero-retention modes and cite them in the privacy policy. This is a third-party disclosure requiring consent under 2025 rule.

### 3.8 Admin / moderation

- **Impersonation route** (`/api/admin/impersonate`) — powerful. Confirm `ALLOW_IMPERSONATION` is **off in production**. If ever needed in production for support, requires audit logging of every use + user/parent disclosure that admins can assume identity.
- **Moderation evals** — we already HMAC user IDs and set 90-day content expiry in `generation_events`. **But the 90-day expiry is configured in schema, and the cron to enforce deletion is TODO.** A schema default does not delete rows — only a scheduled job does. Fix this before 2026-04-22.
- **`moderation_events.flagged_content`** also expires after 90 days in schema only; same cron gap.

### 3.9 Cookies / persistent identifiers

- Session cookie (`alpha_session`, 7-day) is a persistent identifier but used only for authentication → internal operations exception applies. Good.
- No third-party analytics / tracking detected. Excellent — keep it that way. PostHog/Sentry/GA would each add full third-party disclosure and VPC obligations.

### 3.10 External outbound

- **Roblox deep-link** passes encrypted server access codes, no PII in the URL itself. Safe.
- Any future outbound link (Discord, YouTube, etc.) should be evaluated individually. Each link is a data handoff.

---

## 4. Platform Growth — What to Keep in Mind

Things that will bite as the platform scales, none of which are problems today but each of which becomes one if we skip the architecture for it:

1. **Hard-delete plumbing.** Every data store (D1 tables, KV, LiveKit server, third-party AI providers, Roblox links, moderation logs) needs a documented delete path. Build a single `deleteUserData(userId)` service that fans out to every store _now_, before the data sprawl is painful. Parents will invoke this.
2. **Retention cron.** The 2025 rule requires active retention enforcement. One scheduled Worker that wakes daily and enforces per-table TTLs against a single `retention_policy` constants file.
3. **Age & parental-consent as first-class fields.** Add `users.date_of_birth` and a `parental_consents` table (parent_email, consent_scope, method, timestamp, revoked_at). Even if Timeback handles consent today, we'll want a copy of the record locally to prove compliance and to handle revocation.
4. **Consent scopes, not a single flag.** Store parental consent per modality (`chat`, `voice`, `friends`, `profile_photo`, `third_party_ai`, `third_party_roblox`). The 2025 rule _requires_ separate consent for third-party disclosures; modeling it as scopes makes granular revocation trivial.
5. **Privacy policy as a versioned artifact.** Every material change requires re-notice to parents (for under-13 users). Keep `privacy_policy_versions` and `parental_notice_log` tables. We'll want this audit trail the first time a parent or the FTC asks.
6. **Every new third party = consent update.** Before adding any analytics, ad, or AI vendor, route it through a "does this send child PI?" checklist. If yes: DPA, policy update, re-notice.
7. **State laws layer on top.** California (CCPA/CPRA for minors + SB 976 social media rules), New York (SHIELD + NY Child Data Protection Act 2025), Connecticut, Utah, Texas (SCOPE Act), Florida — all have distinct provisions that can be stricter than COPPA (e.g., extending protections to teens 13–16). Architect consent/data-access machinery so we can add additional gates without ripping apart the data model.
8. **GDPR-K** if we ever have EU users. Age of consent ranges 13–16 per member state; children under 16 by default need parental consent under GDPR Art. 8. Expands the architecture we need.
9. **Voice ML features** — if we later add transcription, caption generation, voice-based AI tutors, speaker identification, or emotion detection, each is biometric processing under the 2025 rule and requires separate VPC. Design voice data flow so these can be added consent-gated, not as default-on features.
10. **Homeschool vs. school context matters legally.** The **school-agent consent doctrine** the FTC left in informal guidance (not the 2025 codification — that was cut) covers collection "for the use and benefit of the school, and for no other commercial purpose." Social features (chat, voice, friends) may exceed "use and benefit of the school." Get explicit legal advice on whether Timeback enrollment consent covers our non-educational features, or whether we need a supplemental in-app parental consent step for social modalities.
11. **Safe Harbor certification**. Programs like **iKeepSafe** and **kidSAFE** offer FTC-approved certifications. Real costs, but gives us a defensible standard-of-care posture and a third party reviewing our practices. Worth considering once the compliance fundamentals are in place.
12. **Incident response playbook**. The 2025 security program expects this. Data breach notification for child data triggers state AG notifications plus potentially FTC reporting.

---

## 5. Immediate Gap List (today's codebase vs. 2026-04-22 deadline)

Ranked by risk, fix-order suggestion:

1. **Voice chat consent** — no VPC covers real-time voice. Either: (a) gate voice behind explicit parental consent captured separately from any existing school consent, (b) disable voice until consent flow ships, or (c) verify with counsel that existing Timeback/school-enrollment consent is broad enough. Do not ship to more users until resolved.
2. **Age / consent data model** — no `date_of_birth`, no `parental_consents` table. Add them.
3. **Written retention policy + enforcement cron** — schema has 90-day expiry for moderation tables but no enforcer. Most other tables have no retention at all.
4. **Hard-delete user path** — parental deletion rights are non-optional. Build the fan-out now.
5. **Written information security program** — document it. Designate an owner. Annual risk assessment scheduled.
6. **Privacy policy + direct notice** — must disclose every third party (LiveKit, Roblox APIs, Timeback, LWAI, Gemini, OpenAI, Cloudflare), retention timelines, and 2025-required content.
7. **Third-party processor agreements** — LiveKit, Gemini, OpenAI, Roblox, Timeback, LWAI, Cloudflare — confirm DPA / COPPA attestations on file for each.
8. **Separate consent for third-party disclosures** — 2025 requires this as a separable checkbox.
9. **PI content-filter for chat messages** — extend moderation to block apparent names, addresses, phone numbers, emails, outside-platform handles. Already flagging harmful content; add this category.
10. **Impersonation route** — confirm `ALLOW_IMPERSONATION` is unset in production; audit-log every use if ever enabled.

---

## 6. Strong Recommendation

Before implementing anything on this list, **get a privacy attorney** who specializes in edtech / COPPA to spend a few hours on two questions:

1. Does Alpha Schools' existing enrollment consent flow already constitute verifiable parental consent for the social features of this platform (chat, voice, friends), or does the platform need its own in-app VPC step?
2. Does the homeschool framing of the user base change the school-agent analysis? (There is real ambiguity here — "homeschool" sometimes means parent-led, sometimes means enrolled-in-a-virtual-school. The answer materially changes the architecture.)

Those two answers determine whether we build a full in-app VPC flow (large effort) or just layer consent-record caching on top of Timeback (small effort). Don't guess.

---

## Sources

- [FTC — Complying with COPPA: Frequently Asked Questions](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)
- [FTC — Finalizes Changes to Children's Privacy Rule (Jan 2025 press release)](https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-finalizes-changes-childrens-privacy-rule-limiting-companies-ability-monetize-kids-data)
- [Federal Register — Children's Online Privacy Protection Rule (2025-04-22 final rule)](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule)
- [eCFR — 16 CFR Part 312 (current COPPA Rule)](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312)
- [Securiti — FTC's 2025 COPPA Final Rule Amendments](https://securiti.ai/ftc-coppa-final-rule-amendments/)
- [White & Case — Unpacking the FTC's COPPA Amendments](https://www.whitecase.com/insight-alert/unpacking-ftcs-coppa-amendments-what-you-need-know)
- [Latham & Watkins — FTC Publishes Updates to COPPA Rule](https://www.lw.com/en/insights/ftc-publishes-updates-to-coppa-rule)
- [Loeb & Loeb — Children's Online Privacy in 2025: The Amended COPPA Rule](https://www.loeb.com/en/insights/publications/2025/05/childrens-online-privacy-in-2025-the-amended-coppa-rule)
- [Koley Jessen — COPPA Rule Update Now in Effect](https://www.koleyjessen.com/insights/publications/ftcs-strengthened-childrens-online-privacy-rules-now-in-effect)
- [FTC — Voice Recordings enforcement policy (2017)](https://www.ftc.gov/news-events/news/press-releases/2017/10/ftc-provides-additional-guidance-coppa-voice-recordings)
- [Fenwick — FTC's COPPA Guidance on Recording Children's Voices](https://www.fenwick.com/insights/publications/ftcs-new-coppa-guidance-on-recording-childrens-voices-five-tips-for-app-developers-and-toymakers-to-comply)
- [Public Interest Privacy Center — New COPPA Update: A Setback for Schools?](https://publicinterestprivacy.org/new-coppa-update/)
- [iKeepSafe — COPPA 101 for EdTech Companies](https://ikeepsafe.org/coppa-101/)
- [Hintze Law — Final COPPA Rule Amendments: Definitional Changes](https://hintzelaw.com/blog/2025/2/6/final-coppa-rule-amendments-definitional-changes)
- [Wilson Sonsini — New Federal Children's Privacy Requirements](https://www.wsgr.com/en/insights/new-federal-childrens-privacy-requirements-are-not-childs-play-ftc-amends-coppa-rule-imposing-new-obligations-on-child-directed-services.html)
- [Common Sense Education — What Is COPPA?](https://www.commonsense.org/education/articles/what-is-coppa)
- [Parent Coalition for Student Privacy — COPPA form for schools](https://studentprivacymatters.org/coppa-form-for-schools/)
