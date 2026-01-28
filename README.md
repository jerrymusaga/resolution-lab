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

---

## 🔍 Opik Integration (Deep)

```
TRACING
├── LiteLLM Callback ──────── All LLM calls auto-traced
├── @opik.track (12+) ─────── Decorated functions
└── Nested traces ─────────── Parent-child relationships

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

CUSTOM OPIK EVALUATORS (NEW!)
├── StrategyAlignmentEvaluator ─── Message matches intended strategy
├── MotivationEffectivenessEvaluator ─── Likely to motivate action
├── PersonalizationEvaluator ───── Feels tailored, not generic
├── ToneConsistencyEvaluator ───── Tone matches strategy style
├── InsightQualityEvaluator ────── Insight is actionable & data-grounded
└── ComprehensiveMessageEvaluator ─ Combines all with A-F grades

LLM-AS-JUDGE
├── analyze_user_sentiment
├── judge_goal_completion
└── agent_evaluate (hybrid: custom evaluators + LLM judge)

ENGAGEMENT ANALYTICS
├── api_voice_play ─────────── Track voice playback events
│   ├── voice_played (metric)
│   └── voice_auto_played (metric)
└── api_record_checkin ─────── Track micro-commitment usage
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
**After 30 Check-ins:** Agent exploits best strategy (80% of time)
**Struggling User:** Agent adapts, uses gentler approaches
**Insights Page:** User sees their personal motivation formula

See `USER_STORIES.md` for complete scenarios.

---

## 🏆 Why This Wins

| Criteria | Implementation |
|----------|----------------|
| ✅ True Agent | 6-step cognitive loop, not just LLM wrapper |
| ✅ Deep Opik | Nested traces, experiments, custom metrics, voice analytics |
| ✅ Custom Evaluators | 6 evaluators assess ALL AI outputs with grades (A-F) |
| ✅ Hybrid Evaluation | Custom evaluators (40%) + LLM-as-Judge (60%) |
| ✅ Novel Use Case | Expose experiment data TO users |
| ✅ Production Ready | Full-stack, polished UI with evaluator visualizations |
| ✅ Engagement Features | Voice TTS, streak calendar, micro-commitments, personalized greetings |
| ✅ Authentication | Supabase Auth with Google OAuth, protected routes |

---

## 📁 Key Files

```
backend/services/coach_agent.py        # 🤖 AI Agent (6-step loop)
backend/services/evaluators.py         # 🎯 Custom Opik Evaluators
backend/services/experiment_engine.py  # Multi-armed bandit
backend/services/intervention_generator.py  # Message generation + evaluation
backend/services/analysis_engine.py    # Insight generation + evaluation
backend/routers/interventions.py       # API endpoints including voice tracking

frontend/src/app/agent/page.tsx        # Agent visualization with voice + micro-commitment
frontend/src/app/experiment/page.tsx   # Experiment page with grade distribution
frontend/src/app/insights/page.tsx     # User insights with insight quality grades
frontend/src/app/dashboard/page.tsx    # Dashboard with streak calendar
frontend/src/components/StreakCalendar.tsx  # 📅 Visual check-in calendar
frontend/src/components/GoalCard.tsx   # 🔥 Goal cards with streak highlights
frontend/src/hooks/useTextToSpeech.ts  # 🔊 Text-to-speech hook
```

---

Built with 🧪 for the **Comet "Commit to Change" AI Agents Hackathon**
