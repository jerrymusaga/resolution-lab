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
    ├── agent_evaluate
    └── agent_learn

A/B EXPERIMENTS
├── prompt_experiment_select
├── prompt_experiment_record
└── prompt_experiment_report

CUSTOM METRICS
├── MessageQualityMetric
├── StrategyAlignmentMetric
├── InterventionEffectivenessMetric
└── EngagementMetric

LLM-AS-JUDGE
├── analyze_user_sentiment
├── judge_goal_completion
└── agent_evaluate (self-assessment)
```

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
| ✅ Deep Opik | Nested traces, experiments, custom metrics |
| ✅ LLM-as-Judge | Self-evaluation of outputs |
| ✅ Novel Use Case | Expose experiment data TO users |
| ✅ Production Ready | Full-stack, polished UI |

---

## 📁 Key Files

```
backend/services/coach_agent.py    # 🤖 AI Agent (6-step loop)
backend/services/experiment_engine.py  # Multi-armed bandit
backend/services/opik_experiments.py   # A/B testing
frontend/src/app/agent/page.tsx    # Agent visualization
frontend/src/app/insights/page.tsx # User insights dashboard
```

---

Built with 🧪 for the **Comet "Commit to Change" AI Agents Hackathon**
