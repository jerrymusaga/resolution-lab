# Resolution Lab - 3-Minute Demo Script

> **Format:** Speaker lines in quotes. Stage directions in [brackets]. Timing markers on the left.

---

## PRE-DEMO SETUP

Before you start:
- App open on the **Landing Page** (logged out)
- Opik dashboard open in a second browser tab (your project traces view)
- Have at least 1 active goal with 10+ check-ins already done (so insights/formula are available)
- Practice the flow 5 times until transitions are seamless

---

## THE SCRIPT

### 0:00 – THE HOOK (20 seconds)

"Every January, 80% of New Year's resolutions fail by February. And it's not because people are lazy — it's because motivation is personal. What fires me up might bore you. What stresses you out might drive someone else.

The problem? Every motivation app treats everyone the same. We built Resolution Lab to fix that."

---

### 0:20 – THE CONCEPT (20 seconds)

[Stay on landing page. Point to the 8-strategy grid as you speak.]

"Resolution Lab runs real behavioral experiments on YOU. We have 8 scientifically-grounded motivation strategies — from gentle reminders to loss aversion to identity reinforcement.

Instead of guessing which one works, we use a multi-armed bandit algorithm to test them all, measure your responses, and converge on YOUR personal motivation formula. And every single step is traced and evaluated through Opik."

---

### 0:40 – LIVE DEMO: THE AI COACH (60 seconds)

[Click "Sign In" → you're already logged in → navigate to **AI Coach** page]

"Let me show you the engine. I have a goal: 'Exercise for 30 minutes daily.'

I'll hit **Get Motivation** and watch what happens."

[Click "Get Motivation" with Full Agent mode selected. The 6-step loop animates.]

"The AI Coach runs a full cognitive loop — six steps, all traced individually in Opik:

**OBSERVE** — it pulls my check-in history, streaks, and patterns.
**THINK** — chain-of-thought reasoning about my current motivation state.
**PLAN** — the bandit algorithm selects a strategy. Right now it chose *streak gamification* because that's been working for me lately.
**ACT** — it generates a personalized message using that strategy.
**EVALUATE** — an LLM-as-judge scores the message on quality, relevance, personalization, and strategy alignment.
**LEARN** — the reward signal feeds back into the bandit."

[Expand one or two step cards to show the reasoning. Point to the evaluation scores.]

"Every step you see here is a nested trace in Opik. Let me check in."

[Click "Yes, I did it!" — celebration appears with generated image]

"The outcome — 'completed' — updates the strategy arm. The bandit now knows streak gamification worked again for me. Over time, it exploits what works and explores what it hasn't tried."

---

### 1:40 – THE PAYOFF: FORMULA DISCOVERY (30 seconds)

[Navigate to **Insights** page. The formula reveal section should be visible.]

"After enough experiments, the system converges. Here's what it found for me."

[Point to the big reveal section — best strategy, success rate, vs. worst strategy]

"*Identity reinforcement* is my top strategy — 78% success rate. That's 34% better than my worst. The radar chart shows my full motivation profile across all 8 strategies.

This is my personal motivation formula. I can lock it in — and from that point, 90% of my messages use my best strategy while 10% keep exploring."

[Point to the AI Insight Quality grade and evaluation breakdown]

"Even this recommendation was evaluated by Opik — actionability, personalization, clarity — all scored."

---

### 2:10 – OPIK DEPTH: THE DIFFERENTIATOR (35 seconds)

[Switch to the **Opik dashboard** tab]

"Here's where it gets serious. This isn't surface-level tracing.

**Every LLM call** — message generation, sentiment analysis, recommendations — is traced with full input/output.

**Nested traces** — the 6-step agent loop shows as parent-child spans. You can drill into exactly how the AI reasoned.

**Custom evaluators** — we built 6 LLM-as-judge evaluators: strategy alignment, motivation effectiveness, personalization depth, tone consistency, insight quality, and image quality. These run automatically on every interaction.

**Thread evaluation** — entire conversation histories per goal are evaluated for coherence and user frustration.

**And the closed loop** — Opik's Agent Optimizer watches evaluation scores and automatically rewrites prompts for underperforming strategies. The system literally improves itself."

[Show a specific trace with evaluator scores if time allows]

---

### 2:45 – THE CLOSE (15 seconds)

"Resolution Lab doesn't just use Opik for logging. Opik IS the feedback loop. It's how we evaluate, how we experiment, and how we improve.

Generic motivation fails because it ignores individuality. We built a system that learns what works — for each person, for each goal — and proves it with data.

That's Resolution Lab. Your motivation, your formula, your data."

---

## DEMO FLOW SUMMARY

```
Landing Page (0:00)  →  explain problem + 8 strategies
        ↓
AI Coach Page (0:40)  →  run full agent loop live, show 6 steps, check in
        ↓
Insights Page (1:40)  →  show formula discovery, charts, evaluation grades
        ↓
Opik Dashboard (2:10) →  nested traces, evaluators, auto-optimization
        ↓
Close (2:45)          →  vision statement
```

---

## JUDGE Q&A PREP (Likely Questions)

**Q: How does the bandit algorithm work?**
A: Epsilon-greedy with 20% exploration. Each strategy is an "arm." We track pulls, rewards, and success rate. After each strategy has 3+ samples, we shift to exploitation — picking the best 80% of the time. Users can lock in their formula once it converges.

**Q: How do the custom evaluators work?**
A: LLM-as-judge pattern. We send the generated message + context to a separate Gemini call with a rubric. It scores 0-1 on dimensions like personalization, strategy alignment, and tone. These scores feed into Opik as feedback and trigger prompt optimization when they drop.

**Q: What happens when a strategy underperforms?**
A: The auto-optimizer monitors evaluation scores. When a strategy hits 10+ interventions, it triggers Opik's Agent Optimizer to rewrite the prompt. The new prompt is A/B tested via Opik Experiments. The system self-improves without manual intervention.

**Q: Is this real or simulated data?**
A: Both. Real users generate real data through check-ins. We also have a simulation mode that runs synthetic experiments to demonstrate convergence — useful for demos and for users who want to preview the system before committing.

**Q: Why 8 strategies?**
A: They map to established behavioral psychology frameworks — nudge theory, loss aversion (Kahneman), identity-based habits (James Clear), gamification loops. We chose 8 to balance exploration breadth with convergence speed.

**Q: How is Opik different from just using logging?**
A: Three ways. First, evaluators — we score every output automatically, not just log it. Second, experiments — we A/B test prompt variants systematically. Third, the optimizer — evaluation data feeds back into prompt improvement. It's a closed loop, not a write-only log.
