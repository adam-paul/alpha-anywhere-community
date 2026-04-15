# Eval Strategy

This document defines how we evaluate AI-powered features in this codebase. It covers:

1. The two distinct problems any eval system must solve
2. Decision criteria for when each approach applies
3. How our eval stack is architected (moderation is the first surface)
4. Practices worth adopting from the broader eval ecosystem
5. How the package extends to non-moderation AI features
6. Known limitations and planned extensions

This is a living strategy doc. Update it as the AI surface grows and as we learn which approaches pay off. It originates from a 2026-04 port of AlphaLearn's `EVAL_STRATEGY.md` (preserved verbatim in this repo as `ALPHALEARN_EVAL_STRATEGY.md` for reference). Divergence from that baseline is expected and encouraged.

**Inherited assets.** The moderation surface seeds from AlphaLearn verbatim: 527 labeled corpus cases (358 optimize + 169 holdout), the two production prompts (`about_me.md`, `chat_message.md`), the OpenAI per-category thresholds, and the severity-weighted F1 + four-recall-floor constraint design. Iterating from a known-good baseline beats re-discovering it.

**Scope note.** The `@alpha/evals` package aims to be applicable to _all_ AI content evals eventually — imagen outputs, tutor responses, quiz generation, whatever we add. Moderation is the first integration, not the only one. This doc treats non-moderation features as first-class in the framework even while the runtime has only moderation wired today.

**Phased rollout (execution pointer).** Phase 0 package scaffold → Phase 1 chat moderation live → Phase 2 profile moderation → Phase 3 eval harness + seed corpus → Phase 4 autoresearch loop runnable → Phase 5 async queue (if latency bites) → Phase 6 production mining flywheel.

---

## 1. The Two Layers of Eval

Any AI feature eventually needs answers to two questions. They sound similar but are very different problems:

| Layer                            | The question                                          | Scoring function                                | What it produces                                                           |
| -------------------------------- | ----------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------- |
| **Layer 1: Output evaluation**   | "Is this specific output good?"                       | LLM-judge (interpretive) or deterministic check | A per-instance pass/fail signal, usable as a runtime gate or offline audit |
| **Layer 2: Prompt optimization** | "Is this prompt consistently producing good outputs?" | Aggregate metric over a labeled corpus          | A better prompt (or parameters)                                            |

Layer 2 is built _on top of_ Layer 1 — you cannot optimize a prompt without first being able to score its outputs. But the _shape_ of the work is very different, and so are the right tools.

### Why moderation is an unusual case

Moderation evals are Layer 1 + Layer 2 combined, with one critical property: **ground truth is objective.** Every corpus case has `expected_flagged: true/false`. The "judge" is literally `actual == expected` — no subjective LLM-as-judge step required. That makes the scoring function deterministic and cheap, which makes an autonomous optimization loop (the Karpathy Loop) viable. Most AI features don't have this luxury — more on that in §5.

---

## 2. When the Karpathy Loop Earns Its Keep

Before committing to build a Layer 2 prompt-optimization loop for _any_ AI feature, all three of these must be true:

1. **Ground truth is objective.** You can write labeled cases where correct/incorrect is unambiguous. If the answer is "it depends" or "reasonable people disagree," you don't have Layer 2 ground truth.
2. **The cost of a bad prompt is high.** Something real breaks when the prompt drifts — safety floor violated, compliance issue, user-visible quality collapse. If the downside is "slightly worse aesthetic," you don't need continuous optimization.
3. **The problem space evolves faster than humans can manually keep up.** New failure modes appear regularly (adversarial obfuscation, new PII patterns, evolving slang). If the problem is static, you can just hand-tune once and move on.

Moderation checks all three. That's why the loop exists.

For Layer 1 only (any of these apply, no Layer 2 needed):

1. Outputs are **subjective** — "good enough" is judgment-dependent, no simple ground truth.
2. The cost of an occasional bad output is **recoverable** — regenerate, let user reject, surface for review.
3. You need **runtime gating**, not offline optimization — score each output as it's generated and decide whether to ship it.
4. The feature is **new and unproven** — don't pre-build infrastructure for a problem you don't yet understand.

---

## 3. Our Eval Stack (Moderation is the First Surface)

### 3.0 Package architecture

The package is built as a first-class workspace package from day zero (`@alpha/evals`), not a directory of files in `src/lib/`. Structure:

```
packages/evals/
├── src/
│   ├── core/                         # Zero runtime deps; pure
│   │   ├── types.ts                  # Decision, Category, Subcategory, MergedResult
│   │   ├── merge.ts                  # either-can-veto merge logic
│   │   ├── severity.ts               # severity determination
│   │   ├── scoring.ts                # metrics + composite + hard constraints
│   │   └── config.ts                 # the "optimization surface" — temps, thresholds, weights
│   ├── prompts/                      # markdown + loader
│   │   ├── moderation/
│   │   │   ├── about_me.md
│   │   │   └── chat_message.md
│   │   └── loader.ts                 # version + cache
│   ├── providers/                    # Provider interface + impls
│   │   ├── provider.ts               # interface
│   │   ├── gemini.ts
│   │   └── openai.ts
│   ├── harness/                      # eval runner
│   │   ├── runEval.ts
│   │   ├── corpus.ts
│   │   └── stores.ts                 # RunStore, CorpusStore interfaces
│   └── autoresearch/
│       ├── program.md                # the agent playbook
│       └── loop.ts                   # git commit/reset keep-discard runner
├── adapters/
│   └── cloudflare/
│       ├── d1RunStore.ts
│       ├── d1FlagStore.ts
│       └── moderationQueueDO.ts      # optional async path
└── package.json                      # "@alpha/evals"
```

The core depends on nothing but the standard library. Providers take an HTTP client at construction. Stores are interfaces. The same package runs in a Worker, a Bun CLI, or a separate Node process — wherever. This is how we generalize beyond moderation: new surfaces implement `Provider` / `Scorer` / `Corpus`, not rewrite the harness.

The app consumes it through one entry point:

```ts
const evaluator = getEvaluator(platform.env);
const decision = await evaluator.moderate(text, 'chat_message');
if (decision.flagged) return error(400, decision.userMessage);
```

Everything else — scoring, the autoresearch loop, admin CRUD — uses the same package with different entry points (CLI, scheduled Worker, admin API).

### 3.1 Orchestration layer

Capsule summary of the moderation runtime and harness:

- **Corpus (D1 `eval_corpus_cases`)**: labeled test cases, DB-backed with JSON export for the agent. Split into `optimize` (~70%) and `holdout` (~30%).
- **Eval harness (`bun run eval:moderation`)**: runs every case through the production pipeline (Gemini + OpenAI, either-can-veto merge via `Promise.all`), computes precision/recall/F1 per category, produces a composite severity-weighted F1 score.
- **Hard constraints**: non-negotiable floors (detailed in §3.3). Any violation kills the experiment regardless of composite score.
- **Karpathy Loop**: autonomous agent modifies `prompts/moderation/*.md` or `core/config.ts`, runs the eval, keeps improvements as git commits, discards regressions via `git reset --hard HEAD~1`. Converges after 15 consecutive discards.
- **Holdout check**: after the loop completes, run against holdout set to detect overfitting.
- **Admin surface**: DB-backed corpus CRUD, run history, per-case drill-down, live debugger (routes under `/api/admin/evals/*`), Phase 6 roadmap for feedback flywheel.

**Today the loop is driven by a Claude Code session, not by an automated orchestrator.** The deterministic parts are the eval harness, the scoring module, and the `core/config.ts` boundary. The "agent" that hypothesizes changes, commits, and decides keep/discard is Claude given a loop prompt (`autoresearch/program.md`). Everything mechanical is built; the intelligence is delegated.

Three automation paths, in order of effort:

1. **Manual (you play the agent)** — best for the first few experiments. Gives calibrated intuition for what the problem shape actually is before automating it away.
2. **`claude -p` in a bash loop** — one-shot Claude Code invocations wrapped in a while-loop that counts consecutive discards. ~30 lines. Good enough to run overnight without babysitting.
3. **Cron-triggered Worker or dedicated Bun CLI (not built)** — a first-class repo artifact using the Claude Agent SDK that enforces the "only modify files under `prompts/` and `core/config.ts`" boundary. Writes every experiment (kept or discarded) to a new `eval_loop_runs` D1 table, viewable in the admin. Probably a day of work; worth building after 2–3 manual sessions have surfaced the real requirements.

**Why we haven't built option 3 yet.** Building the orchestrator now risks baking in assumptions that turn out to be wrong — e.g., how to handle run-to-run variance, when to feed the agent past attempts, how many parallel hypotheses to try. A few manual sessions are the cheapest way to learn what the orchestrator actually needs to do.

### 3.2 Metrics as dev heuristics: safety vs. user experience

Precision and recall measure different failure modes, and the distinction maps cleanly onto two separate product concerns:

- **Recall measures safety.** Low recall means harmful content reaches users. The failure is visible to admins reviewing the flag queue, incident reports, or — catastrophically — external stakeholders. Students don't notice, because nothing happened from their perspective.
- **Precision measures user experience.** Low precision means clean content gets wrongly blocked. The failure is visible to students immediately, surfaces in support tickets, and degrades engagement.

The two concerns require different levers:

| Working on...                              | Primary levers                                                                                                                                                                                                                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Recall** (missed bad content)            | Add must-flag patterns to the Gemini prompt. Lower per-category OpenAI thresholds. Expand corpus with more examples of the missed pattern. Optionally add cheap pre-filters (e.g., regex for phone-numbers-spelled-as-words) when a failure mode is easy to pattern-match and expensive to teach the LLM. |
| **Precision** (over-flagged clean content) | Add explicit allowlists ("do NOT flag...") to the Gemini prompt. Raise per-category OpenAI thresholds. Narrow over-specified rules. Inject more context so the classifier can distinguish benign framings (e.g., gaming combat vs. real threats).                                                         |

The Karpathy loop handles both simultaneously because the severity-weighted F1 it optimizes is the harmonic mean of precision and recall per category — an experiment that improves one but tanks the other fails. What the loop **can't** do natively is prioritize recall over precision (or vice versa) at a system level. If the product decides "we'd rather block too much than miss anything" (e.g., a platform for under-8s), you'd switch from F1 to F-beta in `scoring.ts` (F2 biases toward recall, F0.5 toward precision). That's a scoring change, not an optimization-surface change.

**Production triage heuristic.** When a moderation failure surfaces:

1. **Did we miss something we should have caught?** → recall problem → identify the category, add the case to the corpus, work on that category's signals.
2. **Did we block something we shouldn't have?** → precision problem → identify the triggering category, add the case to the corpus as clean, work on that category's allowlist or raise its threshold.

The source of the complaint tells you which bucket:

- Admin/review-queue complaints → recall problem.
- Student/support-ticket complaints → precision problem.

### 3.3 Hard constraints: four independent recall floors

AlphaLearn's initial constraint set was:

```python
{"self_harm_recall": 0.99, "pii_recall": 0.95, "clean_precision": 0.90}
```

Two subtle problems surfaced after the first optimization run:

1. **`clean_precision` is cross-category.** Its denominator — every case the system let through — spans the whole corpus, so it silently entangles with `harmful_recall`. The constraint was really enforcing "don't miss too much harmful content," expressed sideways. Every false negative in a flagged category simultaneously lowers `clean_precision`, which makes it a transformed view of the flagged recalls rather than an independent signal.
2. **Nothing constrained false positives on clean content.** `clean_precision` doesn't measure that, despite the name. Over-flagging clean cases was only weakly held in check by the composite F1's `clean_f1` term (weight 1.0), not by any floor.

The cleaner set uses four independent recall floors — each with its own denominator, each guarding a distinct failure mode, together covering the whole confusion matrix:

```ts
{
  self_harm_recall: 0.99,    // don't miss self-harm
  pii_recall:       0.95,    // don't miss PII
  harmful_recall:   0.92,    // don't miss harmful (replaces clean_precision)
  clean_recall:     0.85,    // don't over-flag clean content (new)
}
```

`overall_precision` (of everything we flagged, what fraction was truly harmful) is a useful **tracked KPI** for system-health dashboards — "when we block, how often are we right?" — but not a hard floor. It's largely downstream of the four recalls plus corpus composition, and adding it as a fifth constraint over-constrains the optimization space without adding new information.

**Enforcement note (Pareto improvement rule).** The agent's per-experiment decision is not simply "constraints_passed AND composite_improved" — that would be too strict when the baseline itself violates a constraint, because no single experiment could be accepted unless it jumped the violating metric to the threshold in one go. Instead, the decision is:

> KEEP iff `composite_score` strictly improved AND every hard-constraint value is `>=` the baseline's value for that constraint.

This allows incremental progress when the baseline violates a constraint (an experiment that moves `pii_recall` from 0.89 → 0.91 is accepted even though both fail the 0.95 floor) while forbidding any regression on any metric (an experiment that gains composite by sacrificing `clean_recall` is rejected).

The "never ship a constraint violation" guarantee moves from per-experiment to pre-merge: after the loop converges, re-check `constraints_passed=true` in the final state. If false, the loop hasn't actually reached a shippable state — continue experiments, expand the corpus, or re-calibrate thresholds before merging. This is documented in `autoresearch/program.md` under "Post-Convergence."

### 3.4 Async pattern

Moderation latency matters differently per surface. Two deployment shapes:

- **Synchronous inline** (default for first cut). `Promise.all([gemini, openai])` is ~300ms wall-clock. Tolerable for profile edits, borderline for chat send. Simple to implement; no extra infrastructure.
- **Durable Object queue + optimistic UI.** Message writes immediately to D1 with `moderation_status = 'pending'`, returns to client, WebSocket broadcasts when status flips to `clean` / `flagged`. Non-blocking, survives Worker restarts, handles spikes. Required only if synchronous latency proves user-hostile.

Build sync first, measure, escalate to DO queue only on evidence.

---

## 4. Practices We Adopt

Even without using a hosted eval platform, their discipline encodes patterns worth internalizing:

1. **Dimension-tuple synthetic data generation.** Two-step methodology:
   - Draft ~20 dimension-value tuples: `(channel: snap/discord/tiktok) × (obfuscation: plain/coded/emoji) × (context: bio/chat)`.
   - Convert each tuple to a 1–2 sentence scenario sketch.
   - Convert each sketch to a full trace.
   - Why two steps: single-step LLM generation produces repetitive, shallow variation. The scenario sketch forces diverse framing before the trace generation locks in wording.
   - **Action:** wire this into the corpus admin UI — have Claude generate N new adversarial cases along defined dimensions.

2. **Scoping-before-building discipline.** Force answers to two questions before writing any criterion:
   - "What does failure cost?" (drives weighting and strictness)
   - "How will results be used?" — gate, rank, revise loop, or monitor (changes what the eval actually measures)
   - **Rule:** don't spin up a new eval category without that scoping.

3. **Binary atomic criteria over holistic judgments.** One dimension per criterion, explicit fail conditions (not just pass intent). Avoid "is this good?" without concrete boundaries. The moderation corpus already does this by category — enforce it as we expand beyond moderation.

---

## 5. Extending Beyond Moderation

The package is scoped to cover _all_ AI content evals eventually, not just moderation. This section covers how non-moderation features fit in.

### 5.1 Default playbook for new AI features

For each new AI surface (tutor responses, imagen outputs, quiz generation, etc.), decide in this order:

1. **Is the input/output child-identifying?** If yes → custom or heavily gated. If no → hosted Layer 1 eval (Truesight-class) is on the table.
2. **Do all three Layer 2 criteria apply?** (objective ground truth + high failure cost + evolving problem — see §2) If yes → custom Karpathy Loop via our package. If no → Layer 1 only.
3. **Is this feature strategically core or experimental?** Core + stable = invest in custom tooling. Experimental = ship with a simple runtime gate, revisit if it matters.
4. **Default:** Layer 1 runtime gate, binary criteria, offline review queue. Build custom Layer 2 only when (1)–(3) demand it.

### 5.2 Composition pattern: LLM judge as a scoring function

The natural question once you have both pieces: **can we use an LLM judge as the scoring function inside a Karpathy Loop?** If the judge emits pass/fail for each output, "pass rate across a corpus of test inputs" becomes a single number to optimize, and the loop can drive it upward.

**Yes in principle, with specific guardrails.** Structurally identical to RLHF — reward models are calibrated judges standing in for ground truth. Battle-tested at scale.

**The trap: Goodhart's Law.** When a judge becomes an optimization target, it stops being a good measure of the thing you actually care about. LLM judges have exploitable quirks that optimizers discover quickly — length bias, keyword triggers, surface features over substance, adversarial collapse. You can end up with 99% judge pass rate and 40% human pass rate on the same outputs.

**Why moderation is immune.** `actual == expected` against a hand-labeled corpus is a string comparison. You cannot game a string comparison by prompt engineering. The moment you swap in an LLM judge, the metric becomes a proxy, and the optimizer's job becomes "exploit the proxy."

**Guardrails that make it viable** (standard RLHF discipline):

1. **Human-labeled holdout tripwire.** 50–100 outputs with human pass/fail, run every N experiments. If human pass rate diverges from judge pass rate, you're Goodharting and you stop.
2. **Judge ensemble diversity.** 2+ independent judges with different base models (e.g., GPT-4 + Claude + Gemini). Mirrors the Gemini+OpenAI either-can-veto pattern moderation already uses, applied at the judge layer.
3. **Diversity regularization.** `score = judge_pass_rate − λ * similarity_penalty` to prevent degenerate collapse into a single exploited mode.

**Phased adoption** — earn Phase 3 by doing Phase 1 and 2 first:

- **Phase 1: Runtime gate only.** Deploy the judge as a pass/fail check. No optimization loop. Regenerate or flag on fail. Builds intuition about judge behavior.
- **Phase 2: Collect a human-labeled holdout.** Over weeks, hand-label 100 outputs. This is the Goodhart tripwire for Phase 3. You cannot build Phase 3 without it.
- **Phase 3: Karpathy Loop with ensemble + holdout tripwire.** Only with a judge you trust and a human holdout to measure drift against.

**Skipping Phase 1 and 2 is how this pattern fails.** You'll converge on a gamed optimum, ship it, users will hate it, and you'll have no instrumentation to tell you why.

**The deeper point.** Once you move from string-comparison ground truth to LLM-judge-as-scorer, the quality of the judge becomes the bottleneck on everything. Moderation eval quality is bottlenecked on _corpus quality_. Judge-driven optimization is bottlenecked on _judge calibration_, which is harder to measure and easier to get wrong.

### 5.3 Shape of the extension

Adding a new AI surface to `@alpha/evals` should require:

- A new `Provider` impl (calls the generation model + the judge)
- A new prompt / set of prompts under `prompts/<surface>/`
- A new `Scorer` impl (judge-ensemble pass-rate + diversity penalty for Layer 2; single judge pass/fail for Layer 1)
- A corpus (text for most features; media-URL-column for imagen/audio)

The harness, the autoresearch loop, the storage adapters, the admin UI shell — all shared. If extending requires changing the harness, the abstraction is wrong.

---

## 6. Known Limitations & Planned Extensions

Deliberate scoping decisions. Some are permanent. Others are known gaps we'd revisit if production data shows them mattering. Documented here so trade-offs are explicit and future-us doesn't rediscover them as "bugs."

### 6.1 Single-message context (chat moderation)

**Current behavior:** the moderation entry point accepts a single string. Chat messages are classified in isolation — Gemini and OpenAI see only the message under consideration, not the surrounding conversation.

**The limitation:** this puts a hard ceiling on how well we can detect any pattern that is fundamentally multi-turn. The clearest example is grooming, which is a _trajectory_ — relationship-building, isolation, secrecy escalation, an off-platform pivot at the end. A skilled bad actor can stay within plausible single-message bounds at every individual step. We will never catch them by reading one message at a time, no matter how good the prompt or how large the corpus.

The same applies more weakly to other ambiguous cases: "yeah let's do it tomorrow at the park" is innocuous between two friends planning a soccer game and concerning between a stranger and a child after a coordinated isolation pattern. Single-message moderation cannot tell those apart.

**Why we accept it for now:**

- Human review is a meaningful safety net. Flagged content goes to admins, and the admin queue is itself the second line of defense. The cost of a missed grooming message at the _automated_ layer is not "child harm" — it's "the message reaches review with one fewer flag attached."
- The change is non-trivial. Adding context touches the production pipeline (signature change, prompt rewrite), the data model (corpus cases need `context_messages`), the labeling UI (admins now see surrounding messages), the corpus mining job (must capture the conversation window at flag time, not later, because COPPA expiration deletes neighbors), and COPPA review (the labeling UI now shows messages from students who weren't themselves flagged).
- The gap is grooming-shaped, and grooming is exactly the failure mode where human-in-the-loop is most appropriate anyway. A model giving high-confidence grooming verdicts on isolated messages would be more dangerous than the current under-detection — false positives in this category have real cost.

**What "fixing it" would look like, if we ever do:**

- `moderate()` grows an optional `context: ContextMessage[]` parameter. Chat callsites populate it; About Me callsites don't (bios are static and standalone — context is chat-specific).
- The `chat_message.md` prompt grows a `<conversation_history>` block above the target message, with explicit delimiters so the model knows which message it is being asked to judge.
- Corpus schema grows a nullable `context_messages` JSON column. Schema sketch: `[{"role": "self|other", "text": "...", "ts_offset_seconds": -120}, ...]`. Only populated for chat cases.
- Mining from production must capture the conversation window _at the moment of flagging_, not on a daily cron, because by mining time the surrounding messages may have been cleared by 90-day retention.
- The corpus admin and the Debugger need a way to enter and view context messages, not just a single textarea.
- Privacy review: pulling N messages of context to label one flag means N other students' messages are now exposed in the admin labeling UI. Think about who sees what and whether anonymization happens before or after.

**Decision rule for revisiting:** if admin review reveals a recurring pattern of "this message would have been obviously bad in context, but the model couldn't tell from the message alone," that's the signal. Until then, the human-review layer absorbs the gap.

### 6.2 Hand-authored corpus only (no production mining yet)

**Current behavior:** every corpus case is hand-authored or synthetically generated. None come from real production traffic. The Phase 6 feedback flywheel — mining flags, admin overrides, model disagreements, low-confidence calls into corpus candidates — is designed but not built.

**Why we accept it for now:** production mining requires production volume to be useful, and a trained reviewer eye for what counts as a high-value case. Neither exists yet. Hand-authoring (seeded with AlphaLearn's 527 cases) is the right move at this stage.

**When to build it:** after running the loop against a meaningfully large corpus and observing what failure patterns it can't reach. Those gaps tell you what to mine for. Building before that is guessing at requirements.

### 6.3 Modular by design

AlphaLearn's equivalent doc documents that their `apps/evals/` is _not_ extractable despite aspiring to be — wrong dependency direction (`eval_moderation` imports from `community.services`), hardcoded permission classes, project-coupled taxonomy in the corpus schema.

**We invert this from day zero.** The package (`@alpha/evals`) is a standalone workspace package. `core/` has zero runtime deps. Providers, scorers, stores, and permissions are interfaces with Cloudflare-specific implementations isolated in `adapters/cloudflare/`. Taxonomy is data-driven (each surface registers its own categories). The package could be lifted into another repo unchanged.

We pay the "configurable permission / pluggable provider" indirection tax upfront because:

- The port itself proves there are at least two consumers.
- Modular boundaries only get harder to introduce later.
- The grand vision is one eval package across all AI surfaces; no boundary = no generalization.

### 6.4 No image moderation

**Current behavior:** corpus contains text cases only. No imagen outputs, no image uploads.

**Why we accept it:** different problem shape (Layer 1 output evaluation for subjective content). Route through a judge + Phase 1 runtime gate per §5 when we add an image-producing feature.

**When to revisit:** when we ship an image-producing feature.

### 6.5 Voice moderation not in scope

This doc doesn't apply to voice moderation yet.

---

## 7. Summary

- **Two layers:** output evaluation (per-instance) vs. prompt optimization (system-level). Different problems, different tools.
- **Karpathy Loop earns its keep** only when ground truth is objective, stakes are high, and the problem evolves fast. Moderation is the only current feature that meets all three; not every future feature will.
- **Package-first architecture.** `@alpha/evals` is scoped as a general AI-content-eval framework; moderation is its first integration, not its purpose. New surfaces extend via `Provider` / `Scorer` / `Corpus`; the harness is shared.
- **Composition pattern (LLM judge → Karpathy Loop scoring function)** is viable for non-moderation features but dangerous. Requires human-holdout tripwire, judge ensemble, and diversity regularization to avoid Goodharting the proxy. Don't build until Phase 1/2 data is in hand.
- **The question is never "which tool is better"** — it's "which problem am I actually trying to solve?" Answer that first, the tool choice follows.
- **Steal good ideas regardless of platform choice:** dimension-tuple synthetic data, scoping-before-building, atomic binary criteria. Free wins.
