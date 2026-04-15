# Eval Strategy: When to Build, When to Buy, When to Both

This document defines AlphaLearn's strategy for evaluating AI-powered features. It covers:

1. The two distinct problems any eval system must solve
2. Decision criteria for when each approach applies
3. How our custom Karpathy Loop infrastructure fits in
4. Comparison against Truesight (representative hosted eval platform)
5. Per-feature recommendations for current and future AI systems
6. Composition pattern: using an LLM judge as the scoring function for a Karpathy Loop
7. Open questions for hosted eval vendors
8. Summary

This is a living strategy doc. Update it as the AI surface grows and as we learn which approaches pay off.

---

## 1. The Two Layers of Eval

Any AI feature eventually needs answers to two questions. They sound similar but are very different problems:

| Layer                            | The question                                          | Scoring function                                | What it produces                                                           |
| -------------------------------- | ----------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------- |
| **Layer 1: Output evaluation**   | "Is this specific output good?"                       | LLM-judge (interpretive) or deterministic check | A per-instance pass/fail signal, usable as a runtime gate or offline audit |
| **Layer 2: Prompt optimization** | "Is this prompt consistently producing good outputs?" | Aggregate metric over a labeled corpus          | A better prompt (or parameters)                                            |

Layer 2 is built _on top of_ Layer 1 — you cannot optimize a prompt without first being able to score its outputs. But the _shape_ of the work is very different, and so are the right tools.

### Why moderation is an unusual case

Our moderation eval is Layer 1 + Layer 2 combined, but with one critical property: **ground truth is objective.** Every corpus case has `expected_flagged: true/false`. The "judge" is literally `actual == expected` — no subjective LLM-as-judge step required. That makes the scoring function deterministic and cheap, which makes an autonomous optimization loop (the Karpathy Loop) viable. Most AI features don't have this luxury.

### Why avatar generation is a typical case

There is no `expected_avatar.png`. You cannot write ground truth for "a happy blue frog wearing a hat" and then check `actual == expected`. Any Layer 1 scoring has to go through a judge — human or LLM — applying subjective criteria. Layer 1 is the hard part for avatars, not the easy part. Layer 2 on top of avatars would require a calibrated judge as a dependency, which is itself a research project.

**Most future AI features will look like avatar generation, not like moderation.**

---

## 2. Decision Criteria

Use this checklist before committing to build a new eval system for any AI feature.

### When to build Layer 2 (prompt-optimization loop) yourself

All three must be true:

1. **Ground truth is objective.** You can write labeled cases where correct/incorrect is unambiguous. If the answer is "it depends" or "reasonable people disagree," you don't have Layer 2 ground truth.
2. **The cost of a bad prompt is high.** Something real breaks when the prompt drifts — safety floor violated, compliance issue, user-visible quality collapse. If the downside is "slightly worse aesthetic," you don't need continuous optimization.
3. **The problem space evolves faster than humans can manually keep up.** New failure modes appear regularly (adversarial obfuscation, new PII patterns, evolving slang). If the problem is static, you can just hand-tune once and move on.

Moderation checks all three. That's why the Karpathy Loop exists.

### When to use Layer 1 only (hosted or homegrown)

Any of these apply:

1. Outputs are **subjective** — "good enough" is judgment-dependent, no simple ground truth.
2. The cost of an occasional bad output is **recoverable** — regenerate, let user reject, surface for review.
3. You need **runtime gating**, not offline optimization — "score each output as it's generated and decide whether to ship it."
4. The feature is **new and unproven** — don't pre-build infrastructure for a problem you don't yet understand.

Avatar generation, quiz generation, feedback comments, AI tutor responses — these all default to Layer 1 only.

### When to buy vs. build Layer 1

**Buy (Truesight or similar)** when:

- The data being evaluated is **not** child-identifying (avatar prompts = fine; raw child bios = not fine)
- You want **fast time-to-first-eval** (days, not weeks)
- You need **human-in-the-loop review workflows** you haven't built yet
- The interpretive judge work matters more than the infrastructure work
- Criteria are **atomic and binary** (one dimension per eval, explicit fail conditions)

**Build** when:

- **COPPA / child-identifying content** is in the eval input (nearly all of moderation, some of chat)
- You need **tight integration** with existing production infrastructure (e.g., our dual-call moderation pipeline)
- You need **custom scoring semantics** (severity-weighted F1, hard constraint floors, corpus/holdout split)
- The feature is **strategically core** enough that external dependency risk matters

---

## 3. Our Custom Stack (Karpathy Loop)

We built a custom Layer 2 system for moderation. Capsule summary:

- **Corpus (`EvalCorpusCase`)**: labeled test cases, DB-backed with JSON export for the agent. Split into `optimize` (70%) and `holdout` (30%).
- **Eval harness (`eval_moderation` command)**: runs every case through the production moderation pipeline (Gemini + OpenAI, either-can-veto merge), computes precision/recall/F1 per category, produces a composite severity-weighted F1 score.
- **Hard constraints**: four independent recall floors (`self_harm_recall ≥ 0.99`, `pii_recall ≥ 0.95`, `harmful_recall ≥ 0.92`, `clean_recall ≥ 0.85`). Any violation kills the experiment regardless of composite score. The three flagged-category recalls enforce "don't miss bad content" (safety); `clean_recall` enforces "don't over-flag good content" (UX). See [§ Hard constraints](#hard-constraints-four-independent-failure-modes) for the rationale, including why an earlier version used `clean_precision` and why it was replaced.
- **Karpathy Loop**: autonomous agent modifies `about_me.txt`, `chat_message.txt`, or `optimization_surface.py`, runs the eval, keeps improvements as git commits, discards regressions via `git reset --hard HEAD~1`. Converges after 15 consecutive discards.
- **Holdout check**: after the loop completes, run against `holdout.json` to detect overfitting.
- **Admin dashboard**: DB-backed corpus CRUD, run history, per-case drill-down, live debugger, Phase 2 roadmap for feedback flywheel.

Runtime logging and quality monitoring: [GENERATION_EVENT_SPEC.md](./GENERATION_EVENT_SPEC.md).
FAQ and mental models: [eval-faq.md](./eval-faq.md).
Visual system diagrams: [eval-system-diagram.html](./eval-system-diagram.html).

### What the Karpathy Loop does NOT solve

- **Subjective outputs**: cannot optimize what cannot be scored objectively.
- **Low-cost features**: overkill for anything where a bad output is merely "meh."
- **Cold-start features**: cannot optimize a prompt that has no corpus yet.
- **Multimodal judgment**: we haven't built image/audio scoring; Truesight has native support.

### Orchestration layer (current state and roadmap)

**Today the loop is driven by a Claude Code session, not by an automated orchestrator.** The deterministic parts of the pipeline are the eval harness (`eval_moderation` command), the scoring engine, and the optimization surface boundary. The "agent" that hypothesizes changes, commits, and decides keep/discard is a general-purpose LLM given a loop prompt. Everything mechanical is built; the intelligence is delegated.

Three automation paths, in order of effort:

1. **Manual (you play the agent)** — best for the first few experiments. Gives you calibrated intuition for what the problem shape actually is before automating it away.
2. **`claude -p` in a bash loop** — one-shot Claude Code invocations wrapped in a while-loop that counts consecutive discards. Uses the Claude Max subscription on the machine (no API credits). ~30 lines of bash. Good enough to run the loop overnight without babysitting.
3. **`karpathy_loop` management command (not built)** — a Django command using the Claude Agent SDK that runs the loop as a first-class repo artifact. Intercepts tool calls to enforce the "only modify optimization surface files" boundary. Writes every experiment (kept or discarded) to a new `KarpathyLoopRun` model, viewable in the admin dashboard. Accepts either a Max-subscription credential or an `ANTHROPIC_API_KEY`, so it works for both solo and team/CI use. Probably a day of work; worth building after 2–3 manual sessions have surfaced the real requirements.

**Why we haven't built option 3 yet.** Building the orchestrator now risks baking in assumptions that turn out to be wrong — e.g., how to handle run-to-run variance, when to feed the agent past attempts, how many parallel hypotheses to try. A few manual sessions are the cheapest way to learn what the orchestrator actually needs to do.

**Modularity note.** All three paths need _some_ credential on the machine. The orchestrator code itself is independent of which (Max OAuth vs. API key); only the credential source differs. Plan for the production/team setup to use an API key, and the solo/exploratory setup to use Max. Nothing in the pipeline design couples to either.

### Metrics as dev heuristics: safety vs. user experience

Precision and recall measure different failure modes, and the distinction maps cleanly onto two separate product concerns:

- **Recall measures safety.** Low recall means harmful content reaches users. The failure is visible to admins reviewing the flag queue, incident reports, or — catastrophically — external stakeholders. Students don't notice, because nothing happened from their perspective.
- **Precision measures user experience.** Low precision means clean content gets wrongly blocked. The failure is visible to students immediately, surfaces in support tickets, and degrades engagement.

The two concerns require different levers:

| Working on...                              | Primary levers                                                                                                                                                                                                                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Recall** (missed bad content)            | Add must-flag patterns to the Gemini prompt. Lower per-category OpenAI thresholds. Expand corpus with more examples of the missed pattern. Optionally add cheap pre-filters (e.g., regex for phone-numbers-spelled-as-words) when a failure mode is easy to pattern-match and expensive to teach the LLM. |
| **Precision** (over-flagged clean content) | Add explicit allowlists ("do NOT flag...") to the Gemini prompt. Raise per-category OpenAI thresholds. Narrow over-specified rules. Inject more context so the classifier can distinguish benign framings (e.g., gaming combat vs. real threats).                                                         |

The Karpathy loop handles both simultaneously because the severity-weighted F1 it optimizes is the harmonic mean of precision and recall per category — an experiment that improves one but tanks the other fails. What the loop **can't** do natively is prioritize recall over precision (or vice versa) at a system level. If your product decides "we'd rather block too much than miss anything" (e.g., a platform for under-8s), you'd switch from F1 to F-beta in `scoring.py` (F2 biases toward recall, F0.5 toward precision). That's a scoring-engine change, not an optimization-surface change.

**Production triage heuristic.** When a moderation failure surfaces:

1. **Did we miss something we should have caught?** → recall problem → identify the category, add the case to the corpus, work on that category's signals.
2. **Did we block something we shouldn't have?** → precision problem → identify the triggering category, add the case to the corpus as clean, work on that category's allowlist or raise its threshold.

The source of the complaint tells you which bucket:

- Admin/review-queue complaints → recall problem.
- Student/support-ticket complaints → precision problem.

### Hard constraints: four independent failure modes

The current set is:

```python
{
    "self_harm_recall": 0.99,   # don't miss self-harm
    "pii_recall":       0.95,   # don't miss PII
    "harmful_recall":   0.92,   # don't miss harmful
    "clean_recall":     0.85,   # don't over-flag clean content
}
```

Each constraint has its own denominator (no cross-category coupling), each guards a distinct failure mode, and together they cover the whole confusion matrix: three recall floors catch false negatives across the flagged categories (safety), and `clean_recall` catches false positives on clean content (UX).

**An earlier version** used `{"self_harm_recall": 0.99, "pii_recall": 0.95, "clean_precision": 0.90}`. Two subtle problems surfaced after the first optimization run:

1. **`clean_precision` is cross-category.** Its denominator — every case the system let through — spans the whole corpus, so it silently entangled with `harmful_recall`. The constraint was really enforcing "don't miss too much harmful content," expressed sideways. Every false negative in a flagged category simultaneously lowers `clean_precision`, making it a transformed view of the flagged recalls rather than an independent signal.
2. **Nothing constrained false positives on clean content.** `clean_precision` doesn't measure that, despite the name. Over-flagging clean cases was only weakly held in check by the composite F1's `clean_f1` term (weight 1.0), not by any floor.

Replacing `clean_precision` with `harmful_recall` + `clean_recall` fixed both: `harmful_recall` directly expresses what `clean_precision` was indirectly enforcing, and `clean_recall` adds the previously-missing false-positive floor.

`overall_precision` (of everything we flagged, what fraction was truly harmful) is a useful **tracked KPI** for system-health dashboards — "when we block, how often are we right?" — but not a hard floor. It's largely downstream of the four recalls plus corpus composition, and adding it as a fifth constraint over-constrains the optimization space without adding new information. `clean_precision` remains computed and reported for the same reason — useful as a diagnostic, not a gate.

**Enforcement note (Pareto improvement rule).** The agent's per-experiment decision is not simply "constraints_passed AND composite_improved" — that would be too strict when the baseline itself violates a constraint, because no single experiment could be accepted unless it jumped the violating metric to the threshold in one go. Instead, the decision is:

> KEEP iff `composite_score` strictly improved AND every hard-constraint value is `>=` the baseline's value for that constraint.

This allows incremental progress when the baseline violates a constraint (an experiment that moves `pii_recall` from 0.89 → 0.91 is accepted even though both fail the 0.95 floor) while forbidding any regression on any metric (an experiment that gains composite by sacrificing `clean_recall` is rejected).

The "never ship a constraint violation" guarantee moves from per-experiment to pre-merge: after the loop converges, re-check `constraints_passed=true` in the final state. If false, the loop hasn't actually reached a shippable state — continue experiments, expand the corpus, or re-calibrate thresholds before merging. This is documented in `program.md` under "Post-Convergence."

---

## 4. Comparison: Custom Stack vs. Truesight

Truesight (goodeyelabs.com) is a representative hosted eval platform — SaaS-first (tiers ~$19–$199/mo), MCP + agent-skill driven, OAuth or platform API key auth, data stored in their cloud. Their mental model: upload traces → define binary pass/fail criteria → deploy as a **live HTTP endpoint** → `run_eval(id, inputs)` to score in production → human-review flagged cases → promote back into dataset.

### Feature matrix

| Capability                                     | Our stack                     | Truesight                          |
| ---------------------------------------------- | ----------------------------- | ---------------------------------- |
| Labeled corpus management                      | ✅ `EvalCorpusCase` + CRUD UI | ✅ datasets                        |
| Per-case metrics (P/R/F1)                      | ✅                            | ⚠️ binary pass/fail only           |
| Multi-category scoring                         | ✅ severity-weighted F1       | ❌ one criterion per eval          |
| Hard constraint gates (floors)                 | ✅                            | ❌                                 |
| Holdout / overfitting check                    | ✅                            | ❌                                 |
| Git-as-experiment-tracking                     | ✅                            | ❌                                 |
| Autonomous prompt optimization (Karpathy Loop) | ✅ core design                | ❌ not their model                 |
| Live runtime eval endpoint                     | ❌ (we inline-call models)    | ✅ first-class                     |
| Multimodal (image/audio) eval                  | ❌                            | ✅ native `media_url_column`       |
| Human-in-the-loop review queue                 | 🚧 planned Phase 2            | ✅ first-class                     |
| Synthetic data generation                      | ❌ manual                     | ✅ `generate-synthetic-data` skill |
| Error analysis / failure clustering            | ❌                            | ✅ `error-analysis` skill          |
| Child-identifying content handling (COPPA)     | ✅ in-house, 90-day deletion  | ❓ unlisted, likely problematic    |
| Time to ship a new eval                        | days–weeks                    | hours                              |

### Fundamental architectural divergence

**Truesight is a judge-building platform. We built a prompt-optimization platform.** They overlap on corpus management but close fundamentally different loops:

- **Truesight's loop:** "Is this output good?" → deploy a calibrated judge → score traces → human reviews uncertain ones → judge improves.
- **Our loop:** "Is the prompt itself good?" → run corpus through it → score against ground truth → agent modifies the prompt → git-kept-or-discarded → prompt improves.

Truesight has no concept of an autonomous agent that rewrites `about_me.txt` overnight based on misclassifications. It evaluates outputs. We evaluate _and iterate on the producer._

### Good ideas worth stealing from Truesight

Regardless of whether we use their platform, their skill repo encodes useful discipline worth internalizing:

1. **Dimension-tuple synthetic data generation** (from their `generate-synthetic-data` skill). Two-step methodology:
   - Draft ~20 dimension-value tuples in a table: `(channel: snap/discord/tiktok) × (obfuscation: plain/coded/emoji) × (context: bio/chat)`.
   - Convert each tuple to a 1–2 sentence scenario sketch.
   - Convert each sketch to a full trace.
   - Why two steps: single-step LLM generation produces repetitive, shallow variation. The scenario sketch forces diverse framing before the trace generation locks in wording.
   - **Action:** bolt this into an "Add cases" admin flow — have Claude generate 50 new adversarial PII cases along defined dimensions.

2. **Scoping-before-building discipline** (from their `create-evaluation` skill). Force answers to two questions before writing any criterion:
   - "What does failure cost?" (drives weighting and strictness)
   - "How will results be used?" — gate, rank, revise loop, or monitor (changes what the eval actually measures)
   - **Rule:** don't spin up a new eval category without that scoping.

3. **Binary atomic criteria over holistic judgments.** One dimension per criterion, explicit fail conditions (not just pass intent). Avoid "is this good?" without concrete boundaries. Our corpus already does this by category — enforce it as we expand.

---

## 5. Per-Feature Recommendations

### Moderation (current)

**Custom Karpathy Loop stack. Do not migrate.**

- Reason 1: child-identifying content precludes sending to any third-party SaaS without a COPPA story.
- Reason 2: hard constraints and severity-weighted F1 are custom semantics Truesight does not support.
- Reason 3: adversarial evolution (new obfuscation patterns, new slang) makes continuous prompt iteration valuable.
- Reason 4: objective ground truth makes the autonomous loop actually viable.

All three gating criteria for building Layer 2 are met. No exit ramp.

### Avatar generation (active)

**Truesight is a plausible fit. Try before committing.**

- Layer 1 is what matters — per-instance quality gate ("does this avatar match the description? is it age-appropriate? no realistic human faces?").
- Criteria are interpretive and atomic — ideal Truesight shape.
- Multimodal native — they handle image inputs out of the box, which we'd have to build.
- Data privacy risk is **much lower** than moderation — avatar _prompts_ are generated descriptors, not child-identifying text. The _outputs_ are generated images. (Verify with counsel before shipping, but directionally clean.)
- Not worth building a Karpathy Loop for: lower stakes, subjective, prompt drift unlikely to be expensive.

**Recommended action:** spin up a free Truesight account, run their `create-evaluation` skill against 20 real avatar traces, evaluate whether the calibrated judge is consistent enough. Decision within an afternoon. If it works, deploy as a runtime gate (generate → score → regenerate or flag on fail).

### Future AI features — default playbook

For each new AI feature (quiz generation, feedback comments, AI tutor responses, etc.), decide in this order:

1. **Is the input/output child-identifying?** If yes → custom or heavily gated. If no → Truesight-class SaaS is on the table.
2. **Do all three Layer 2 criteria apply?** (objective ground truth + high failure cost + evolving problem) If yes → custom Karpathy Loop. If no → Layer 1 only.
3. **Is this feature strategically core or experimental?** Core + stable = invest in custom tooling. Experimental = ship with a buy solution, revisit if it matters.
4. **Default:** Layer 1 hosted eval (Truesight-style), binary criteria, runtime gate + offline review queue. Build custom Layer 2 only when (1)-(3) demand it.

---

## 6. Composition Pattern: LLM Judge as a Karpathy Loop Scoring Function

A natural question arises once you have both pieces: **can we use a Truesight-style LLM judge as the scoring function inside a Karpathy Loop?** If the judge emits pass/fail for each avatar, then "pass rate across a corpus of test prompts" becomes a single number to optimize, and the Karpathy Loop can drive it upward the same way it drives moderation composite scores.

The answer is **yes in principle, with specific guardrails, and not before you've done your homework.** This section explains the pattern, the failure mode, and the concrete architecture if you ever build it.

### The attractive part

Mechanically, the composition is straightforward:

```
score = pass_rate(judge, corpus_of_test_prompts)
```

Swap `actual == expected` for `judge.evaluate(output)` and everything else in the Karpathy Loop stays the same. The agent mutates the generation prompt, generates a batch, judges each output, aggregates, keeps or discards. This is structurally identical to RLHF, DPO, and constitutional AI — reward models _are_ calibrated judges standing in for ground truth, and the industry has been optimizing against them at scale for years. The pattern is battle-tested.

### The trap: Goodhart's Law

**When a judge becomes an optimization target, it stops being a good measure of the thing you actually care about.** This is Goodhart's Law, and it is the single most common failure mode in LLM-judge-driven optimization.

The thing you care about is "does the user like the avatar?" The judge is a proxy for that. Under normal conditions the proxy is decent — maybe 85% agreement with human judgment. That's fine for _runtime gating_: you catch most problems, miss a few, life goes on.

But once you turn on the Karpathy Loop and optimize against the proxy, the loop's job is to find prompts that maximize the proxy score, regardless of whether those prompts produce outputs humans actually like. LLM judges have exploitable quirks that optimizers discover quickly:

- **Length bias.** Many LLM judges score longer/more detailed outputs higher. The optimizer learns to produce verbose prompts that generate overly ornate avatars.
- **Keyword triggers.** If the judge's rubric mentions "age-appropriate," injecting the phrase "age-appropriate and friendly" into the generation prompt nudges the judge without actually improving the output.
- **Surface features over substance.** Certain color palettes or framings score consistently higher; the optimizer narrows the aesthetic until all avatars look samey, even if users find the result boring.
- **Adversarial collapse.** Worst case: the optimizer finds a degenerate prompt that exploits the judge's specific weaknesses and scores near-perfect while producing outputs real users hate.

This is not hypothetical. "Reward hacking" is a well-documented failure mode in RL literature, and it's the standard outcome of naive judge-driven optimization. You can end up with 99% judge pass rate and 40% human pass rate on the same outputs.

### Why moderation is immune

Moderation's scoring function is `actual == expected`, where `expected` is a human-assigned label on a fixed corpus. The "judge" is a string comparison. **You cannot game a string comparison by prompt engineering** — the only way to improve the score is to actually produce the correct classification. Goodhart doesn't apply because the metric isn't a proxy for anything; it _is_ the thing.

The moment you swap in an LLM judge, the metric becomes a proxy, and the optimizer's job becomes "exploit the proxy." That's a fundamentally different game, and it requires different safeguards.

### Guardrails that make it viable

Three techniques, all standard in the RLHF literature, prevent proxy drift:

**1. Human-labeled holdout tripwire.** Maintain a small set (50–100) of outputs with _human_ pass/fail labels, not judge labels. Run it periodically — every N experiments, or before accepting any new prompt as the baseline. If the human pass rate diverges from the judge pass rate, **you are Goodharting**, and you stop the loop. This is structurally identical to the moderation holdout set but serves a different purpose: moderation's holdout catches overfitting to the optimize set; this holdout catches overfitting to the _judge_.

**2. Judge ensemble diversity.** Use 2+ independent judges with different prompts and different base models (e.g., GPT-4o + Claude + Gemini), and require all to pass. An optimizer can exploit one judge's quirks but has a much harder time exploiting multiple judges with different biases simultaneously. This mirrors what our moderation stack already does with Gemini + OpenAI either-can-veto, but applied at the judge layer instead of the classifier layer.

**3. Diversity regularization.** Penalize the optimizer for producing similar outputs across different inputs. If 20 generated outputs for 20 different prompts all converge to the same aesthetic, that's a red flag. Add a diversity term: `score = judge_pass_rate - λ * similarity_penalty`. This prevents degenerate collapse into a single exploited mode.

### Reference architecture

If we ever build this, here's the shape:

```
prompt template (the thing being optimized)
    ↓
generator (Gemini / Imagen / whatever the feature uses)
    ↓
batch of N outputs against diverse test inputs
    ↓
judge ensemble (primary judge + secondary judge with different base model)
    ↓
pass_rate − λ * diversity_penalty = composite score
    ↓
Karpathy Loop: keep/discard prompt modification
    ↓
every K experiments: run human-labeled holdout; abort if judge/human rates diverge
```

The Karpathy Loop infrastructure we already have can host this pattern with minimal changes. The real engineering is in the judge ensemble, the human holdout harness, and the divergence-detection logic.

### When this pattern is worth building

Not every feature justifies the guardrail engineering. The ROI shows up when _all_ of the following apply:

1. **The feature is strategically core** — quality matters enough to sustain continuous iteration.
2. **Objective ground truth is genuinely unavailable** — if you could write `expected_*` labels instead, do that.
3. **Prompt quality is a moving target** — the problem evolves fast enough that one-time hand-tuning won't hold.
4. **The downside of "meh" outputs is high** — users notice, engagement drops, etc.

Features where the pattern is likely worth it:

- **AI tutor responses.** High stakes, high variance, improvements compound across millions of interactions, no objective ground truth.
- **Generated lesson content.** Quality is a competitive moat, ground truth is hard to define, users will notice degradation.
- **Quiz question generation.** Hybrid — correctness can be validated deterministically for some question types (math, facts), LLM-judge is needed for others (open-ended, age-appropriateness).

Features where it is NOT worth it:

- **Avatar generation.** Baseline quality is probably "good enough"; marginal improvement doesn't compound into competitive advantage; simpler runtime gating covers the downside.
- **One-off AI features** that aren't strategic.

### Phased adoption path (using avatars as the example)

Even for features that _might_ eventually warrant this pattern, don't jump straight to the loop. Earn the right to Phase 3 by doing Phase 1 and 2 first:

**Phase 1: Runtime gate only.** Deploy the judge (Truesight-style) as a runtime pass/fail check on each generated output. No optimization loop. Regenerate or flag on fail. Ships in days. Builds intuition about how the judge behaves, what kinds of failures slip through, how often humans would agree.

**Phase 2: Collect a human-labeled holdout set.** While Phase 1 runs, log every (output, judge score, user reaction) tuple. Over weeks, hand-label 100 outputs with real human pass/fail. This is the Goodhart tripwire for Phase 3. You cannot build Phase 3 without it.

**Phase 3: Karpathy Loop with judge ensemble and holdout tripwire.** Only now, with a judge you trust and a human holdout set you can measure drift against, wire the judge into a Karpathy Loop. Run experiments, periodically re-check against human holdout, halt if judge/human pass rates diverge.

**Skipping Phase 1 and 2 is how this pattern fails.** You'll converge on a gamed optimum, ship it, users will hate it, and you'll have no instrumentation to tell you why.

### The deeper point

Once you move from string-comparison ground truth to LLM-judge-as-scorer, **the quality of the judge becomes the bottleneck on everything**. Moderation eval quality is bottlenecked on corpus quality — better cases, better eval. Judge-driven optimization is bottlenecked on _judge calibration_, which is harder to measure and easier to get wrong.

Truesight's "label 2–3 seed traces to calibrate the judge" is a reasonable answer for _runtime gating_ — it only needs to be better than no judge. It is **not** a sufficient answer for _optimization-target_ usage, which requires the judge to be robust against adversarial gaming. That's a much higher bar, and it's the bar you have to clear before you can safely wrap any hosted eval platform's judge in a Karpathy Loop.

---

## 7. Open Questions for Truesight

Before seriously considering Truesight for _any_ feature touching user content (even avatars), confirm with them directly (hello@goodeyelabs.com):

1. **COPPA / children's data policy.** Do they have a DPA? Is there published guidance on handling data from under-13 users? Any compliance certifications?
2. **Data residency.** Where is data stored? Is there an EU/US split? Can we delete on demand within 90 days to match our `GenerationEvent` guarantees?
3. **Training data usage.** Confirmed "never used to train models" — get this in writing in an MSA, not just on the marketing page.
4. **SLA and uptime.** If we deploy a Truesight endpoint as a runtime gate, what happens when their service is down? Do we fail-open (ship bad output) or fail-closed (block generation)?

These answers determine whether Truesight is usable beyond the lowest-sensitivity features.

---

## 8. Known Limitations & Planned Extensions

The current moderation pipeline ships with deliberate scoping decisions. Some are permanent. Others are known gaps we'd revisit if production data shows them mattering. Documenting them here so the trade-offs are explicit and so future-us doesn't rediscover them as "bugs."

### 8.1 Single-message context (chat moderation)

**Current behavior:** `ContentModerationService.moderate_text()` accepts a single string. Chat messages are classified in isolation — Gemini and OpenAI see only the message under consideration, not the surrounding conversation.

**The limitation:** This puts a hard ceiling on how well we can detect any pattern that is fundamentally multi-turn. The clearest example is grooming, which is a _trajectory_ — relationship-building, isolation, secrecy escalation, an off-platform pivot at the end. A skilled bad actor can stay within plausible single-message bounds at every individual step. We will never catch them by reading one message at a time, no matter how good the prompt or how large the corpus.

The same applies more weakly to other ambiguous cases: "yeah let's do it tomorrow at the park" is innocuous between two friends planning a soccer game and concerning between a stranger and a child after a coordinated isolation pattern. Single-message moderation cannot tell those apart.

**Why we accept it for now:**

- Human review is a meaningful safety net. We don't need single-pass moderation to be perfect because flagged content goes to admins, and the admin queue is itself the second line of defense. The cost of a missed grooming message at the _automated_ layer is not "child harm" — it's "the message reaches review with one fewer flag attached."
- The change is non-trivial. Adding context touches the production pipeline (signature change, prompt rewrite), the data model (`EvalCorpusCase` needs `context_messages`), the labeling UI (admins now see surrounding messages), the corpus mining job (must capture the conversation window at flag time, not later, because COPPA expiration deletes neighbors), and COPPA review (the labeling UI is now showing messages from students who weren't themselves flagged).
- The gap is grooming-shaped, and grooming is exactly the failure mode where human-in-the-loop is most appropriate anyway. A model giving high-confidence grooming verdicts on isolated messages would be more dangerous than the current under-detection — false positives in this category have real cost.

**What "fixing it" would look like, if we ever do:**

- `moderate_text()` grows an optional `context: list[ContextMessage] | None` parameter. Chat callsites populate it; About Me callsites don't (bios are static and standalone — context is chat-specific).
- The `chat_message.txt` Gemini prompt grows a `<conversation_history>` block above the target message, with explicit delimiters so the model knows which message it is being asked to judge. Wrong delimiter design would let models judge the wrong message or hallucinate boundaries.
- `EvalCorpusCase` grows a nullable `context_messages` JSONField. Schema sketch: `[{"role": "self|other", "text": "...", "ts_offset_seconds": -120}, ...]`. Only populated for chat cases.
- Mining from production must capture the conversation window _at the moment of flagging_, not on a daily cron job, because by mining time the surrounding messages may have been cleared by 90-day retention. This is an argument for the at-event signal-capture path over the daily-miner path for chat cases.
- The corpus admin and the Debugger tab need a way to enter and view context messages, not just a single textarea.
- Privacy review: pulling N messages of context to label one flag means N other students' messages are now exposed in the admin labeling UI. Think carefully about who can see what, and whether anonymization happens before or after the reviewer sees the case.

**Decision rule for revisiting:** If admin review reveals a recurring pattern of "this message would have been obviously bad in context, but the model couldn't tell from the message alone," that's the signal to build it. Until then, the human-review layer absorbs the gap.

### 8.2 Hand-authored corpus only (no production mining yet)

**Current behavior:** Every corpus case is hand-authored or synthetically generated. None come from real production traffic. The Phase 2 feedback flywheel — mining flags, admin overrides, model disagreements, and low-confidence calls into corpus candidates — is designed but not built.

**Why we accept it for now:** Production mining requires production volume to be useful, and a trained reviewer eye for what counts as a high-value case. Neither exists yet. Hand-authoring is the right move at this stage of the corpus.

**When to build it:** After running the Karpathy Loop against a meaningfully large hand-authored corpus and observing what failure patterns it can't reach. Those gaps tell you what to mine for. Building Phase 2 before that is guessing at requirements.

### 8.3 Evals app is project-coupled (not yet extractable)

**Current behavior:** The original aspiration was for the `apps/evals/` Django app to be a standalone classifier-evaluation framework that could be lifted out of AlphaLearn and reused on a different host project. Today it isn't. Several real dependencies tie it to this codebase:

- `apps/evals/views.py` imports `IsAlphaAdminUser` from `apps.core.permissions` and uses it as the permission class on every endpoint. A different host project would have a different admin permission system.
- `apps/evals/views.py` and `apps/evals/management/commands/eval_moderation.py` both import `apps.community.services.content_moderation` to actually run classifications. The eval harness can't run without `community`. The dependency points the wrong direction — the harness depends on the feature, when a generic harness would have the feature depend on the harness.
- `GenerationEvent` lives in `apps/evals/models.py` but is consumed by `apps/community/{services,views,serializers}`. Bidirectional coupling at the model layer.
- The corpus schema (`VALID_CATEGORIES`, `VALID_SUBCATEGORIES`) is hardcoded in `apps/evals/corpus/schema.py` for moderation taxonomy specifically. A different host project would have different categories.
- All management commands rely on the full AlphaLearn settings tree to load.

**Why we accept it:** Premature extractability is the same trap as premature optimization — you build the wrong abstractions before you know which ones matter. We don't have a second project that needs this framework yet, and trying to design for one we don't have would lock in guesses. Extractability is also not free at runtime: every "configurable permission class" or "pluggable classifier service" adds an indirection that makes the in-project version harder to read.

**What "actually extractable" would look like, if we ever do it:**

- Move the classifier service into the evals app (or a third standalone app), and have `community` consume it from there. Reverses the current dependency direction.
- Replace `IsAlphaAdminUser` in eval views with a settings-injected permission (e.g. `EVAL_ADMIN_PERMISSION = "apps.core.permissions.IsAlphaAdminUser"`), so a different host project can swap it.
- Move `GenerationEvent` into a generic logging app that doesn't know about avatars or About Me bios.
- Make the corpus taxonomy (`VALID_CATEGORIES` / `VALID_SUBCATEGORIES`) data-driven — loaded from a configurable source, not hardcoded — so different host projects can ship different category sets.
- Decouple the management commands from project-specific settings (probably by accepting a settings module path as a CLI arg).

**Decision rule for revisiting:** Only when there's a real second consumer of this framework — another internal project, an open-source release, or a customer ask. Until then, treat the evals app as "AlphaLearn's eval system that happens to be cleanly organized," not "a generic eval framework."

### 8.4 No image moderation in the corpus

**Current behavior:** The corpus only contains text cases. Avatar generation outputs and any future image-upload moderation are not represented.

**Why we accept it:** Different problem (Layer 1 output evaluation, not Layer 2 prompt optimization), almost certainly handled by a hosted eval platform per the recommendations in §5, not by extending this corpus.

**When to revisit:** Only if a strategic decision is made to bring avatar evals in-house, which would require a much stronger reason than currently exists.

---

## 9. Summary

- **Two layers:** output evaluation (per-instance) vs. prompt optimization (system-level). Different problems, different tools.
- **Karpathy Loop earns its keep** only when ground truth is objective, stakes are high, and the problem evolves fast. Moderation is the only current feature that meets all three.
- **Hosted eval platforms (Truesight et al.)** are the right default for Layer 1 on non-COPPA-sensitive features. Use them for avatar gen and future AI features unless a specific reason pushes toward custom.
- **The question is never "which tool is better"** — it's "which problem am I actually trying to solve?" Answer that first, the tool choice follows.
- **Composition pattern (LLM judge → Karpathy Loop scoring function)** is viable but dangerous. Requires human-holdout tripwire, judge ensemble, and diversity regularization to avoid Goodharting the proxy. Don't build until the feature is strategically core and Phase 1/2 data is in hand.
- **Steal good ideas regardless of platform choice:** dimension-tuple synthetic data, scoping-before-building, atomic binary criteria. These are free wins.
