# 🧪 Resolution Lab

> **Discover Your Personal Motivation Formula Through AI-Powered Behavioral Experiments**

[![Built for Comet Hackathon](https://img.shields.io/badge/Built%20for-Comet%20AI%20Agents%20Hackathon-blue)](https://comet.com)
[![Powered by Opik](https://img.shields.io/badge/Powered%20by-Opik-purple)](https://comet.com/opik)

---

## 🎯 The Problem

**Generic motivation advice doesn't work.**

- "Just set reminders" → Works for some, ignored by others
- "Track your streaks" → Motivates gamers, stresses perfectionists  
- "Think about your goals" → Inspires some, overwhelms others

**Everyone is different.** What motivates your friend might actually *demotivate* you.

---

## 💡 Our Solution

**Resolution Lab runs real behavioral experiments on YOU** to discover your personal motivation formula.

Instead of guessing, we:
1. **Test 8 different motivation strategies** using AI-generated personalized messages
2. **Track what actually works** through simple yes/no check-ins
3. **Learn and adapt** using a multi-armed bandit algorithm
4. **Show you the data** - your personal experiment results, not just generic advice

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           RESOLUTION LAB                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐     ┌──────────────┐     ┌─────────────────────────┐  │
│  │   Next.js   │────▶│   FastAPI    │────▶│      AI Coach Agent     │  │
│  │   Frontend  │◀────│   Backend    │◀────│  (Autonomous Reasoning) │  │
│  └─────────────┘     └──────────────┘     └─────────────────────────┘  │
│        │                    │                         │                 │
│        │                    ▼                         ▼                 │
│        │             ┌──────────────┐         ┌─────────────┐          │
│        │             │   Supabase   │         │   Gemini    │          │
│        │             │   Database   │         │   1.5 Flash │          │
│        │             └──────────────┘         └─────────────┘          │
│        │                                             │                  │
│        │                    └────────────┬───────────┘                  │
│        │                                 ▼                              │
│        │                    ┌─────────────────────────┐                 │
│        └───────────────────▶│         OPIK            │                 │
│           (View Traces)     │  (Full Observability)   │                 │
│                             └─────────────────────────┘                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### AI Coach Agent - 6-Step Cognitive Loop

```
    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ OBSERVE  │───▶│  THINK   │───▶│   PLAN   │───▶│   ACT    │
    │          │    │          │    │          │    │          │
    │ Gather   │    │ Chain-of │    │ Multi-   │    │ Generate │
    │ Context  │    │ Thought  │    │ Armed    │    │ Message  │
    │          │    │ Reasoning│    │ Bandit   │    │          │
    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                          │
                                                          ▼
                                    ┌──────────┐    ┌──────────┐
                                    │  LEARN   │◀───│ EVALUATE │
                                    │          │    │          │
                                    │ Update   │    │ LLM-as-  │
                                    │ Model    │    │ Judge    │
                                    └──────────┘    └──────────┘
                                    
              ⬆️ Every step is traced in Opik with nested parent-child traces
```

### Multi-Armed Bandit - 8 Motivation Strategies

| Strategy | Description | Example |
|----------|-------------|---------|
| 🌟 Gentle Reminder | Warm, friendly nudges | "Hey! Just checking in..." |
| ✅ Accountability | Direct yes/no check-ins | "Did you do it today?" |
| 🔥 Streak Gamification | Progress and streaks | "Day 12 streak! Don't break it!" |
| 👥 Social Comparison | What others are doing | "73% of users completed today" |
| ⚠️ Loss Aversion | What you might lose | "You'll lose your progress..." |
| 🎁 Reward Preview | Future benefits | "Imagine how you'll feel!" |
| 💪 Identity Reinforcement | Who you're becoming | "You're someone who exercises" |
| 🎯 Micro-Commitment | Small first steps | "Just 5 minutes?" |

Algorithm: **ε-greedy** (20% exploration, 80% exploitation)

---

## ✨ Engagement Features

### 🔊 Voice Motivation (Text-to-Speech)
Listen to your motivation messages! Uses the Browser Web Speech API for free, instant voice playback.

- **Listen Button**: Click to hear any motivation message spoken aloud
- **Auto-play**: Enable to automatically hear messages when they arrive
- **Voice Selection**: Choose from available English voices
- **Analytics**: Voice usage tracked in Opik for engagement analysis

### 📅 Streak Calendar
Visual calendar showing your check-in history over the past 35 days.

- **Color-coded days**: Green (completed), Red (missed), Gray (no activity)
- **Streak tracking**: Current and longest streak calculations
- **Dashboard integration**: See your consistency at a glance

### 🎯 Micro-Commitment Fallback
When you click "Not yet", the system offers a gentler option:

```
"How about just 2 minutes?"
Sometimes starting is the hardest part. Can you commit to just 2 minutes?
That's all it takes to build momentum.

[I'll try 2 minutes!] [Not today]
```

### ⏰ Time-Based Greetings
Personalized greetings based on time of day:

| Time | Greeting | Message |
|------|----------|---------|
| 🌅 Morning | "Good morning, [Name]!" | "Start your day with purpose" |
| ☀️ Afternoon | "Good afternoon, [Name]!" | "Keep the momentum going" |
| 🌆 Evening | "Good evening, [Name]!" | "Finish strong today" |
| 🌙 Night | "Working late, [Name]!" | "Every step counts" |

### 🔥 Per-Goal Streak Highlights
Goals with 3+ day streaks get prominent visual highlights:

- **3-6 day streaks**: Orange highlight with flame icon
- **7+ day streaks**: Gradient highlight with "On fire!" badge

### 🔔 In-App Reminders (Opik Traced)
Smart notification banners remind users when goals need attention:

- **Priority-based**: Goals without recent check-ins shown first
- **Full Opik tracing**: Every view, click, and dismiss is tracked
- **Engagement scoring**: `reminder_engagement`, `reminder_response_time`, `reminder_urgency`
- **Non-intrusive**: Dismissible banner that respects user flow

### 🧪 Per-Goal Formula
**Each goal can have its own "motivation formula"** - the strategy that works best for that specific goal:

```
GOAL: "Exercise 30 min"          GOAL: "Read 20 pages"
├── Best Strategy: streak_gamification   ├── Best Strategy: gentle_reminder
├── Completion Rate: 82%                 ├── Completion Rate: 76%
└── [Apply Formula ✓]                    └── [Apply Formula ✓]
```

- **Goal-specific optimization**: Exercise might need gamification, reading might need gentle nudges
- **90/10 split when applied**: 90% uses preferred strategy, 10% still explores
- **Easy reset**: Clear formula to return to experimentation mode

### 🎨 Nano Banana Celebration Images
**AI-generated personalized celebration images** when users complete check-ins, powered by Google's Gemini `gemini-2.5-flash-image` (Nano Banana).

```
USER CHECKS IN "Exercise 30 min" ✓
         │
         ▼
┌─────────────────────────────────────────┐
│     GOAL CATEGORY DETECTION             │
│     "Exercise" → FITNESS category       │
│     Confidence: 0.95                    │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│     PERSONALIZED VISUAL ELEMENTS        │
│     • Imagery: dumbbells, finish line   │
│     • Colors: energetic orange, blue    │
│     • Style: watercolor painting        │
│     • Background: mountain landscape    │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│     NANO BANANA GENERATES IMAGE         │
│     Unique celebration image with       │
│     fitness-themed visuals!             │
└─────────────────────────────────────────┘
```

**12 Goal Categories** with unique visual styles:
| Category | Visual Theme | Colors |
|----------|--------------|--------|
| 🏃 Fitness | Running figures, dumbbells, mountains | Orange, red, blue |
| 📚 Reading | Books, cozy nooks, floating letters | Amber, burgundy, green |
| 🧠 Learning | Lightbulbs, graduation caps, puzzles | Yellow, royal blue |
| 🧘 Meditation | Lotus flowers, zen stones, mandalas | Lavender, serene blue |
| 🥗 Nutrition | Fresh vegetables, fruit bowls | Fresh green, orange |
| 🎨 Creativity | Paint splashes, musical notes | Rainbow, magenta |
| 📋 Productivity | Checkmarks, rising graphs, rockets | Navy, success green |
| 👥 Social | Connected hearts, handshakes | Coral, friendly orange |
| 💰 Finance | Piggy banks, money trees, coins | Gold, money green |
| 😴 Sleep | Crescent moon, peaceful clouds | Midnight blue, lavender |
| 🎮 Hobby | Game controllers, garden plants | Teal, playful yellow |
| ⭐ General | Trophies, confetti, fireworks | Gold, royal purple |

**Streak Milestone Images**: Epic celebrations at 3, 7, 14, 30, 50, and 100-day streaks!

### 🤖 Auto Prompt Optimization (Opik Agent Optimizer)
**Automatic prompt improvement** using Opik's optimization algorithms. The system learns from user interactions and automatically improves motivation message prompts.

```
HOW IT WORKS
─────────────────────────────────────────────────────────────────────────

                    USER CHECK-INS
                         │
                         ▼
┌─────────────────────────────────────────┐
│         INTERVENTION COUNTER            │
│   Strategy: "gentle_reminder"           │
│   Count: 14/15 → 15/15 ✓ THRESHOLD!     │
└─────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────┐
│    BACKGROUND OPTIMIZATION TRIGGERED    │
│    (Non-blocking, runs in thread)       │
│                                         │
│    Algorithm: MetaPromptOptimizer       │
│    • LLM critiques current prompt       │
│    • Iteratively refines for better     │
│      completion rates                   │
└─────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────┐
│         RESULTS LOGGED TO OPIK          │
│    • Original score: 0.65               │
│    • Optimized score: 0.78              │
│    • Improvement: +20%                  │
│    • New prompt saved & used            │
└─────────────────────────────────────────┘
```

**Three Optimization Algorithms:**
| Algorithm | Description | Best For |
|-----------|-------------|----------|
| MetaPromptOptimizer | LLM critiques and iteratively refines prompts | General prompt improvement |
| FewShotBayesianOptimizer | Finds optimal examples to include in prompts | Example selection |
| EvolutionaryOptimizer | Genetic algorithm (mutation/crossover) evolution | Novel prompt discovery |

**Configuration:**
- **Threshold**: Triggers after 15 new interventions per strategy
- **Storage**: Persistent state in `backend/data/optimization_state.json`
- **API Endpoints**:
  - `GET /api/agent/optimization/auto-status` - View optimization status
  - `POST /api/agent/optimization/reset-counts` - Reset for testing

---

## 🔍 Opik Integration (Deep)

Resolution Lab showcases **production-grade Opik integration** with threads, traces, feedback scores, and automated evaluation.

### 🧵 Thread Evaluation - The Star Feature

**Every goal is a conversation thread in Opik.** When users check in on their goals, all interactions are grouped into a thread, enabling:

```
THREAD ARCHITECTURE
─────────────────────────────────────────────────────────────────────────
                         GOAL: "Exercise 30 min"
                              thread_id: goal_abc123
                                    │
        ┌───────────────┬───────────┼───────────┬───────────────┐
        ▼               ▼           ▼           ▼               ▼
   [Check-in 1]    [Check-in 2] [Check-in 3] [Check-in 4]   [Check-in 5]
   Strategy: A     Strategy: B  Strategy: A  Strategy: C    Strategy: A
   Outcome: ✓      Outcome: ✗   Outcome: ✓   Outcome: ✓     Outcome: ✓
        │               │           │           │               │
        └───────────────┴───────────┴───────────┴───────────────┘
                                    │
                                    ▼
                         🔄 AUTO-EVALUATION TRIGGER
                           (Every 5 check-ins)
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
        ConversationalCoherence           UserFrustrationMetric
              Metric                      (Detects struggling users)
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
                         FEEDBACK SCORES → Opik Thread View
                         • Coherence: 0.85
                         • Frustration: 0.12
```

**Key Innovation:** After every 5 check-ins, the system automatically:
1. Closes the thread (marks as inactive)
2. Runs `evaluate_threads()` with custom metrics
3. Attaches feedback scores visible in Opik's Thread view
4. Reopens for continued tracking

```python
# Auto-triggered every 5 check-ins (interventions.py:82)
if checkin_count % 5 == 0:
    evaluator.evaluate_goal_thread(goal_id=goal_id, close_first=True)
```

### 📊 Full Tracing Architecture

```
TRACING
├── LiteLLM Callback ──────── All LLM calls auto-traced
├── @opik.track (15+) ─────── Decorated functions
├── Nested traces ─────────── Parent-child relationships
└── Thread grouping ───────── goal_id as thread_id

THREAD FEATURES (⭐ HACKATHON HIGHLIGHT)
├── Thread Creation ─────────── Each goal = 1 thread
├── Thread Lifecycle ────────── Active → Inactive → Evaluated
├── Thread Evaluation ───────── evaluate_threads() with custom metrics
├── Feedback Scores ─────────── ConversationalCoherence, UserFrustration
└── Auto-Trigger ────────────── Every 5 check-ins

AGENT TRACES (Nested)
└── agent_full_loop (parent)
    ├── agent_observe
    ├── agent_think
    ├── agent_plan
    ├── agent_act
    ├── agent_evaluate ← Uses custom evaluators!
    └── agent_learn

A/B EXPERIMENTS
├── prompt_experiment_select
├── prompt_experiment_record
└── prompt_experiment_report

CUSTOM OPIK EVALUATORS
├── StrategyAlignmentEvaluator ─── Message matches intended strategy
├── MotivationEffectivenessEvaluator ─── Likely to motivate action
├── PersonalizationEvaluator ───── Feels tailored, not generic
├── ToneConsistencyEvaluator ───── Tone matches strategy style
├── InsightQualityEvaluator ────── Insight is actionable & data-grounded
├── ComprehensiveMessageEvaluator ─ Combines all with A-F grades
└── CelebrationImageEvaluator ──── Image quality assessment

FEEDBACK SCORES
├── reminder_engagement ────── In-app reminder interaction score
├── reminder_response_time ─── Time to action (seconds)
├── reminder_urgency ───────── Urgency level (1-5)
├── thread evaluation scores ─ Coherence, frustration metrics
└── optimization_improvement ─ Prompt improvement percentage

LLM-AS-JUDGE
├── analyze_user_sentiment
├── judge_goal_completion
└── agent_evaluate (hybrid: custom evaluators + LLM judge)

AUTO OPTIMIZATION (Opik Agent Optimizer)
├── auto_optimize_strategy ──── Background optimization run
├── optimize_strategy_prompt ─── MetaPrompt optimization
├── optimize_with_few_shot ───── Bayesian few-shot selection
└── evolve_prompts ───────────── Evolutionary optimization

NANO BANANA IMAGE GENERATION
├── generate_checkin_image ───── Main image generation
├── evaluate_celebration_image ─ Image quality evaluation
└── Goal category detection ──── Fitness, reading, etc.

ENGAGEMENT ANALYTICS
├── api_voice_play ─────────── Track voice playback events
├── api_record_checkin ─────── Track micro-commitment usage
└── track_reminder_interaction ─ In-app notification analytics
```

### Custom Opik Evaluators - App-Wide Quality Assessment

Every AI-generated output is now evaluated by custom Opik evaluators:

| Evaluator | What it Measures | Used In |
|-----------|------------------|---------|
| Strategy Alignment | Does message match intended strategy keywords/tone? | Agent, Experiment |
| Motivation Effectiveness | Will this actually motivate action? | Agent, Experiment |
| Personalization | Is it tailored or generic? | Agent, Experiment |
| Tone Consistency | Does tone match strategy expectations? | Agent, Experiment |
| Insight Quality | Is the insight actionable & data-grounded? | Insights page |

**Hybrid Evaluation (Agent)**: Custom evaluators (40%) + LLM-as-Judge (60%) = Overall score with letter grades (A-F)

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Edit .env with your API keys
cp .env.example .env
# Add: OPIK_API_KEY, GOOGLE_API_KEY

uvicorn main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Access
- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs
- Opik: https://comet.com/opik

---

## 🎬 Demo Scenarios

**New User:** Agent explores all strategies, learns preferences
**After 5 Check-ins:** Thread auto-evaluated, feedback scores visible in Opik
**After 30 Check-ins:** Agent exploits best strategy (80% of time)
**Per-Goal Formula:** User applies "Exercise = gamification", "Reading = gentle reminder"
**In-App Reminders:** User sees banner for goals needing attention, interaction tracked
**Insights Page:** User sees their personal motivation formula per goal

See `USER_STORIES.md` for complete scenarios.

---

## 🏆 Why This Wins

| Criteria | Implementation |
|----------|----------------|
| ✅ True Agent | 6-step cognitive loop, not just LLM wrapper |
| ⭐ **Thread Evaluation** | **Auto-evaluates conversations every 5 check-ins with feedback scores** |
| ✅ Deep Opik | Nested traces, threads, experiments, custom metrics, feedback scores |
| ✅ Custom Evaluators | 6 evaluators assess ALL AI outputs with grades (A-F) |
| ✅ Feedback Scores | reminder_engagement, coherence, frustration metrics |
| ✅ Hybrid Evaluation | Custom evaluators (40%) + LLM-as-Judge (60%) |
| ⭐ **Auto Optimization** | **Opik Agent Optimizer auto-improves prompts after 15 interventions** |
| ⭐ **Nano Banana Images** | **Personalized celebration images via Gemini 2.5 Flash Image** |
| ✅ Novel Use Case | Expose experiment data TO users via per-goal formulas |
| ✅ Production Ready | Full-stack, polished UI with evaluator visualizations |
| ✅ Engagement Features | Voice TTS, streak calendar, micro-commitments, in-app reminders |
| ✅ Authentication | Supabase Auth with Google OAuth, protected routes |

---

## 📁 Key Files

```
backend/services/coach_agent.py        # 🤖 AI Agent (6-step loop)
backend/services/thread_evaluator.py   # ⭐ Opik Thread Evaluation (auto every 5 check-ins)
backend/services/reminder_service.py   # 🔔 In-app reminders with Opik tracing
backend/services/evaluators.py         # 🎯 Custom Opik Evaluators
backend/services/experiment_engine.py  # Multi-armed bandit + per-goal formula
backend/services/intervention_generator.py  # Message generation + evaluation
backend/services/analysis_engine.py    # Insight generation + evaluation
backend/services/celebration_image_generator.py  # 🎨 Nano Banana celebration images
backend/services/auto_optimizer.py     # 🤖 Auto prompt optimization with Opik
backend/services/prompt_optimizer.py   # Opik Agent Optimizer integration
backend/routers/interventions.py       # API endpoints (triggers thread eval + auto-optimization)
backend/routers/insights.py            # Per-goal formula endpoints
backend/routers/agent.py               # Agent + optimization endpoints

frontend/src/app/agent/page.tsx        # Agent visualization with voice + micro-commitment
frontend/src/app/experiment/page.tsx   # Experiment page with grade distribution
frontend/src/app/insights/page.tsx     # User insights with insight quality grades
frontend/src/app/dashboard/page.tsx    # Dashboard with streak calendar
frontend/src/components/StreakCalendar.tsx  # 📅 Visual check-in calendar
frontend/src/components/GoalCard.tsx   # 🔥 Goal cards with per-goal formula UI
frontend/src/components/CheckInModal.tsx    # ✨ Check-in with celebration images
frontend/src/components/ReminderBanner.tsx  # 🔔 In-app reminder notification
frontend/src/hooks/useTextToSpeech.ts  # 🔊 Text-to-speech hook
```

---

Built with 🧪 for the **Comet "Commit to Change" AI Agents Hackathon**
