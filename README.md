# Resolution Lab

> **An AI motivation coach that experiments on itself to get better at motivating YOU.**

[![Built for Comet Hackathon](https://img.shields.io/badge/Comet%20AI%20Agents-Hackathon%202025-blue)](https://comet.com)
[![Powered by Opik](https://img.shields.io/badge/Powered%20by-Opik-purple)](https://comet.com/opik)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.128-009688)](https://fastapi.tiangolo.com)

---

## The Problem

Generic motivation advice doesn't work. "Just set reminders" works for some people but gets ignored by others. "Track your streaks" motivates gamers but stresses perfectionists. What motivates your friend might actually *demotivate* you.

**There is no universal motivation formula** — but there might be a *personal* one.

## The Solution

Resolution Lab is an AI-powered behavioral science platform that runs **real experiments** on each user to discover their unique motivation formula.

Instead of guessing what works, the system:

1. **Tests 8 evidence-based motivation strategies** using AI-generated personalized messages
2. **Measures real outcomes** — did the user actually follow through?
3. **Learns and adapts** using a multi-armed bandit algorithm (epsilon-greedy)
4. **Continuously improves its own prompts** using Opik's auto-optimization pipeline
5. **Evaluates conversation quality** with LLM-as-Judge metrics tracked in Opik threads

Every interaction generates data. Every data point makes the next interaction better.

---

## How It Works

### The 8 Motivation Strategies

Each strategy is rooted in behavioral psychology:

| # | Strategy | Approach | Example |
|---|----------|----------|---------|
| 1 | **Gentle Reminder** | Warm, friendly nudges | "Hey! Just checking in on your goal today..." |
| 2 | **Direct Accountability** | Yes/no commitment framing | "Did you do it today? Be honest with yourself." |
| 3 | **Streak Gamification** | Progress chains and rewards | "Day 12 streak! Don't break the chain!" |
| 4 | **Social Comparison** | Peer benchmarking | "73% of users with similar goals completed today" |
| 5 | **Loss Aversion** | What you stand to lose | "Skip today and you lose your 5-day momentum..." |
| 6 | **Reward Preview** | Future benefit visualization | "Imagine how strong you'll feel in 30 days!" |
| 7 | **Identity Reinforcement** | Becoming-based framing | "You're becoming someone who prioritizes health" |
| 8 | **Micro-Commitment** | Lower the barrier | "Can you commit to just 2 minutes?" |

### The Multi-Armed Bandit

The system uses an **epsilon-greedy multi-armed bandit** to balance exploration vs. exploitation:

- **20% of the time**: Explore — try a random strategy to gather data
- **80% of the time**: Exploit — use the strategy with the highest observed success rate
- Each strategy needs **3+ data points** before the system trusts its effectiveness score
- Per-user state: your bandit learns *your* patterns, not global averages

When the system identifies a clear winner, users can **lock in their personal formula** (90% best strategy / 10% continued exploration).

### The AI Coach Agent — 6-Step Cognitive Loop

The full agent mode runs an autonomous reasoning loop, where **every step is traced in Opik** with parent-child relationships:

```
OBSERVE → THINK → PLAN → ACT → EVALUATE → LEARN
```

| Step | What Happens | Opik Trace |
|------|-------------|------------|
| **Observe** | Gather user history, streak data, emotional state, experiment results | `agent_observe` |
| **Think** | Chain-of-thought reasoning about motivation patterns | `agent_think` |
| **Plan** | Multi-armed bandit selects strategy; agent plans personalization | `agent_plan` |
| **Act** | Generate personalized motivation message via LLM | `agent_act` |
| **Evaluate** | Custom evaluators score message quality (strategy alignment, effectiveness, personalization, tone) | `agent_evaluate` |
| **Learn** | Record outcome, update bandit state, trigger optimization if threshold reached | `agent_learn` |

There's also a **Quick Stream mode** using the Vercel AI SDK (`useCompletion`) for instant, streamed motivation messages — same learning pipeline, faster delivery.

---

## Opik Integration — Deep & Production-Grade

This project demonstrates **comprehensive Opik integration** across tracing, evaluation, threads, feedback scores, and automatic prompt optimization.

### 1. Full Tracing Pipeline

Every LLM call is automatically traced via `litellm.callbacks = ["opik"]`. On top of that, 15+ functions are decorated with `@opik.track()` for fine-grained observability:

```
Agent Traces (Nested Parent-Child)
└── agent_full_loop (parent trace)
    ├── agent_observe
    ├── agent_think
    ├── agent_plan
    ├── agent_act
    ├── agent_evaluate    ← runs custom evaluators
    └── agent_learn       ← updates bandit + triggers optimization
```

### 2. Thread Evaluation — Conversation-Level Quality

**Every goal becomes an Opik thread.** All check-ins for a goal are grouped under the same `thread_id`, enabling conversation-level analysis:

```
Goal: "Drink 8 glasses of water daily"     thread_id: goal_abc123
│
├── Check-in 1: Strategy=gentle_reminder     Outcome: completed
├── Check-in 2: Strategy=streak_gamification Outcome: completed
├── Check-in 3: Strategy=loss_aversion       Outcome: missed
├── Check-in 4: Strategy=gentle_reminder     Outcome: completed
├── Check-in 5: Strategy=identity            Outcome: completed
│
└── AUTO-EVALUATION TRIGGERED (every 5 check-ins)
    ├── ConversationalCoherenceMetric → 0.85
    └── UserFrustrationMetric         → 0.12
    → Feedback scores attached to thread in Opik
```

After every 5 check-ins, the system automatically:
1. Closes the Opik thread (marks inactive)
2. Runs `evaluate_threads()` with LLM-as-Judge metrics
3. Attaches feedback scores visible in Opik's Thread view
4. Reopens the thread for continued tracking

### 3. Custom Opik Evaluators

Every AI-generated message is scored by custom evaluators:

| Evaluator | What It Measures |
|-----------|-----------------|
| **Strategy Alignment** | Does the message match the intended strategy's keywords and tone? |
| **Motivation Effectiveness** | Is this message likely to drive the user to action? |
| **Personalization** | Does it feel tailored to this specific user, or generic? |
| **Tone Consistency** | Does the emotional tone match what the strategy demands? |
| **Insight Quality** | Are generated insights actionable and data-grounded? |
| **Celebration Image** | Quality assessment of AI-generated celebration images |

**Hybrid scoring**: Custom evaluators (40%) + LLM-as-Judge (60%) = Overall letter grade (A–F)

### 4. Auto Prompt Optimization (Opik Agent Optimizer)

The system **automatically improves its own prompts** using `opik-optimizer`:

```
User checks in → Intervention counter increments
                  │
                  ├── Count < 3  → Continue collecting data
                  │
                  └── Count >= 3 → BACKGROUND OPTIMIZATION TRIGGERED
                                   │
                                   ├── Algorithm: MetaPromptOptimizer
                                   │   (LLM critiques current prompt,
                                   │    iteratively refines for better
                                   │    completion rates)
                                   │
                                   ├── Runs in ProcessPoolExecutor
                                   │   (separate process, non-blocking)
                                   │
                                   └── Results logged to Opik
                                       • Original score → Optimized score
                                       • New prompt saved and used going forward
```

Three optimization algorithms available:

| Algorithm | Method |
|-----------|--------|
| **MetaPromptOptimizer** | LLM self-critique and iterative refinement |
| **FewShotBayesianOptimizer** | Bayesian search for optimal few-shot examples |
| **EvolutionaryOptimizer** | Genetic mutation/crossover for novel prompt discovery |

### 5. Feedback Scores & Experiments

- **Intervention-level**: strategy alignment, effectiveness, personalization, tone (per message)
- **Thread-level**: conversational coherence, user frustration (per goal)
- **Engagement-level**: reminder interactions, response time, voice usage
- **Optimization-level**: prompt improvement percentage, before/after scores
- **A/B Experiments**: `prompt_experiment_select`, `prompt_experiment_record`, `prompt_experiment_report`

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          RESOLUTION LAB                                │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────┐     ┌──────────────┐     ┌────────────────────────┐ │
│  │   Next.js    │────▶│   FastAPI    │────▶│    AI Coach Agent      │ │
│  │   Frontend   │◀────│   Backend    │◀────│  (6-Step Cognitive     │ │
│  │  (Vercel)    │     │  (Railway)   │     │   Loop + Streaming)    │ │
│  └──────────────┘     └──────────────┘     └────────────────────────┘ │
│         │                    │                        │                │
│         │                    ▼                        ▼                │
│         │            ┌──────────────┐        ┌──────────────┐         │
│         │            │   Supabase   │        │   Gemini     │         │
│         │            │  (Postgres   │        │   (LiteLLM)  │         │
│         │            │   + Auth)    │        └──────────────┘         │
│         │            └──────────────┘                │                │
│         │                                            ▼                │
│         │                              ┌──────────────────────┐       │
│         └─────────────────────────────▶│        OPIK          │       │
│                  (View Traces)         │  Traces · Threads ·  │       │
│                                        │  Evaluators · Scores │       │
│                                        │  Auto-Optimization   │       │
│                                        └──────────────────────┘       │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript, TailwindCSS, Vercel AI SDK |
| **Backend** | FastAPI, Python, LiteLLM, asyncio |
| **LLM** | Google Gemini (via LiteLLM with Opik callback) |
| **Database** | Supabase (PostgreSQL + Row-Level Security + Auth) |
| **Auth** | Supabase Auth with Google OAuth |
| **Observability** | Opik — tracing, threads, evaluators, feedback scores |
| **Optimization** | opik-optimizer (MetaPrompt, FewShot Bayesian, Evolutionary) |
| **Image Generation** | Gemini 2.5 Flash (celebration images on check-in) |
| **Hosting** | Vercel (frontend) + Railway (backend) |

---

## Features

### Core Loop
- **Goal creation** — set personal goals with descriptions and target dates
- **Strategy testing** — multi-armed bandit selects and tests motivation strategies per check-in
- **Check-in flow** — simple yes/no + optional feedback after each motivation message
- **Formula discovery** — after enough data, the system reveals your personal motivation formula
- **Per-goal formulas** — different goals can have different winning strategies

### AI Coach
- **Full Agent mode** — 6-step cognitive loop with visible reasoning at each step
- **Quick Stream mode** — instant streamed messages via Vercel AI SDK
- **Voice playback** — text-to-speech using Web Speech API with voice selection
- **Micro-commitment fallback** — if user says "not yet", offers a smaller commitment

### Engagement
- **Streak calendar** — 35-day visual check-in history
- **Streak highlights** — goals with 3+ day streaks get visual badges
- **Celebration images** — AI-generated personalized images on check-in (12 goal categories)
- **In-app reminders** — smart notification banners for goals needing attention
- **Time-based greetings** — personalized by time of day

### Observability (Opik)
- **Automatic LLM tracing** — every Gemini call captured via LiteLLM callback
- **Nested agent traces** — parent-child relationships across 6 cognitive steps
- **Thread evaluation** — auto-triggered every 5 check-ins with coherence + frustration metrics
- **Custom evaluators** — 6 evaluators scoring every AI output with letter grades
- **Auto prompt optimization** — background optimization after 3 interventions per strategy
- **Feedback scores** — engagement, coherence, frustration, optimization improvement

---

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- A [Supabase](https://supabase.com) project (free tier works)
- A [Google AI Studio](https://aistudio.google.com/apikey) API key (for Gemini)
- A [Comet/Opik](https://www.comet.com/account-settings/apiKeys) API key

## Quick Start

### 1. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `backend/supabase_schema.sql` — this creates all tables, RLS policies, and triggers
3. Go to **Authentication > Providers** and enable **Google OAuth** (you'll need a Google Cloud OAuth client ID)
4. Copy your project URL, anon key, and service key from **Settings > API**

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create your `.env` file:

```bash
cp .env.example .env
```

Fill in the values:

```env
# Supabase (from Settings > API in your Supabase dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Opik (from comet.com/account-settings/apiKeys)
OPIK_API_KEY=your-opik-api-key
OPIK_WORKSPACE=your-workspace-name
OPIK_PROJECT_NAME=resolution-lab

# Google Gemini (from aistudio.google.com/apikey)
GOOGLE_API_KEY=your-google-api-key
```

Start the server:

```bash
uvicorn main:app --reload
```

### 3. Frontend

```bash
cd frontend
npm install
```

Create your `.env.local` file:

```bash
cp .env.local.example .env.local
```

Fill in the values:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Supabase (same project as backend)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google Gemini key for streaming mode (from aistudio.google.com/apikey)
GOOGLE_STREAMING_API_KEY=your-google-api-key
```

Start the dev server:

```bash
npm run dev
```

### 4. Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| Opik Dashboard | https://comet.com/opik |

---

## Project Structure

```
resolution-lab/
├── backend/
│   ├── main.py                              # FastAPI app, Opik + LiteLLM config
│   ├── config.py                            # Environment settings
│   ├── models/
│   │   ├── schemas.py                       # 8 strategies, goals, interventions (Pydantic)
│   │   └── database.py                      # Database models
│   ├── routers/
│   │   ├── interventions.py                 # Message generation, check-in, auto-optimization trigger
│   │   ├── agent.py                         # AI Coach agent + optimization endpoints
│   │   ├── goals.py                         # Goal CRUD
│   │   ├── insights.py                      # Formula discovery + strategy analytics
│   │   ├── auth.py                          # Authentication
│   │   └── opik_stats.py                    # Opik metrics API
│   └── services/
│       ├── coach_agent.py                   # 6-step cognitive loop
│       ├── experiment_engine.py             # Epsilon-greedy multi-armed bandit
│       ├── intervention_generator.py        # LLM message generation + evaluation
│       ├── evaluators.py                    # Custom Opik evaluators (6 metrics)
│       ├── thread_evaluator.py              # Opik thread lifecycle + auto-evaluation
│       ├── auto_optimizer.py                # Background prompt optimization (ProcessPoolExecutor)
│       ├── prompt_optimizer.py              # opik-optimizer integration (3 algorithms)
│       ├── celebration_image_generator.py   # Gemini image generation
│       ├── analysis_engine.py               # Sentiment analysis + recommendations
│       ├── reminder_service.py              # In-app reminder scheduling
│       ├── user_context_builder.py          # Personalization context
│       └── database.py                      # Supabase operations
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx                     # Landing page
│       │   ├── dashboard/page.tsx           # Dashboard with goals + streaks
│       │   ├── agent/page.tsx               # AI Coach (full agent + streaming)
│       │   ├── goals/page.tsx               # Goal management
│       │   ├── insights/page.tsx            # Formula discovery + analytics
│       │   └── experiment/page.tsx          # Experiment simulation
│       ├── components/
│       │   ├── Header.tsx                   # Navigation
│       │   ├── GoalCard.tsx                 # Goal cards with formula UI
│       │   ├── CheckInModal.tsx             # Check-in with celebration images
│       │   ├── StreakCalendar.tsx            # 35-day visual calendar
│       │   └── ReminderBanner.tsx           # Smart notification banners
│       ├── contexts/AuthContext.tsx          # Global auth state
│       ├── hooks/useTextToSpeech.ts         # Web Speech API
│       └── lib/api.ts                       # API client
└── README.md
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/agent/run` | Run full 6-step AI Coach agent |
| `POST` | `/api/interventions/generate` | Generate motivation message (bandit selects strategy) |
| `POST` | `/api/interventions/{id}/record-outcome` | Submit check-in result |
| `POST` | `/api/interventions/{id}/celebration` | Generate celebration image |
| `GET` | `/api/goals` | List user goals |
| `POST` | `/api/goals` | Create goal |
| `GET` | `/api/insights` | Get personal motivation formula + strategy stats |
| `GET` | `/api/agent/optimization/auto-status` | View auto-optimization status |
| `POST` | `/api/agent/optimization/reset-counts` | Reset optimization counters |
| `GET` | `/api/opik/stats` | Opik experiment statistics |

Full interactive docs at `/docs` (Swagger UI).

---

## What Makes This Different

| Aspect | Resolution Lab | Typical AI Coach |
|--------|---------------|-----------------|
| **Strategy selection** | Multi-armed bandit with real outcome data | Fixed prompts or random |
| **Learning** | Per-user effectiveness tracking across 8 strategies | No personalization loop |
| **Self-improvement** | Auto prompt optimization via opik-optimizer | Static prompts |
| **Observability** | Full Opik pipeline — traces, threads, evaluators, feedback | Basic logging |
| **Evaluation** | Hybrid: custom evaluators + LLM-as-Judge + thread-level metrics | None |
| **Transparency** | User sees their experiment data and formula | Black box |
| **Agent architecture** | 6-step cognitive loop with visible reasoning | Single LLM call |

The core insight: **the system doesn't just coach you — it runs a scientific experiment on which coaching approach works best for you, and gets better at it over time.**

---

## Hackathon Categories

- **Best Use of Opik** — Deep integration: tracing, threads, thread evaluation, custom evaluators, feedback scores, auto prompt optimization
- **Productivity & Work Habits** — AI coach that helps users build and maintain habits through personalized behavioral experiments

---

Built for the **Comet "Commit to Change" AI Agents Hackathon**
