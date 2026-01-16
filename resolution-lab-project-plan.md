# Resolution Lab — Complete Hackathon Project Plan

## 🎯 Project Summary

**Name:** Resolution Lab  
**Tagline:** "Stop guessing what motivates you. Run experiments and know."  
**Category:** Productivity & Work Habits (or Personal Growth & Learning)  
**Target Prize:** Category ($5K) + Best Use of Opik ($5K) = **$10,000**

**Core Concept:** An AI coach that runs explicit behavioral experiments on users to discover what motivation strategies actually work for THEIR brain—and shows them the data transparently via Opik dashboards.

---

## 🏗️ Technical Architecture

### Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | Next.js 14 + TypeScript | Fast, Vercel deployment (sponsor), modern |
| **Backend** | FastAPI (Python) | Best Opik SDK support, async-native |
| **Database** | PostgreSQL + Supabase | Free tier, auth included, real-time |
| **LLM** | Google Gemini 1.5 Flash | Free tier generous, sponsor (Google credits) |
| **Observability** | **Opik** (Comet) | Core requirement, deep integration |
| **Deployment** | Vercel (frontend) + Railway (backend) | Free tiers, sponsor alignment |

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │
│  │ Goal Setup  │  │ Daily Check │  │ Personal Insights Dashboard │  │
│  │   Wizard    │  │     -ins    │  │   (Opik-powered charts)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         FASTAPI BACKEND                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Experiment       │  │ Intervention     │  │ Analysis         │  │
│  │ Engine           │  │ Generator        │  │ Engine           │  │
│  │ (Multi-arm       │  │ (LLM-powered     │  │ (Effectiveness   │  │
│  │  bandit logic)   │  │  message crafting)│  │  scoring)        │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│   PostgreSQL     │  │      OPIK        │  │     Google           │
│   (Supabase)     │  │                  │  │     Gemini           │
│                  │  │  • Traces        │  │                      │
│  • Users         │  │  • Experiments   │  │  • Message Gen       │
│  • Goals         │  │  • LLM-as-Judge  │  │  • Analysis          │
│  • Interventions │  │  • Dashboards    │  │  • Personalization   │
│  • Outcomes      │  │  • Metrics       │  │                      │
└──────────────────┘  └──────────────────┘  └──────────────────────┘
```

---

## 🔬 The Experiment System (Core Innovation)

### Intervention Strategies (Arms in Multi-Armed Bandit)

| Strategy ID | Name | Example Message |
|-------------|------|-----------------|
| `gentle_reminder` | Gentle Nudge | "Hey! Just a friendly reminder about your goal today 🌟" |
| `accountability` | Direct Accountability | "You committed to exercising today. Did you do it? Yes/No" |
| `streak_gamification` | Streak/Gamification | "🔥 Day 5 streak! Don't break the chain. Today's task awaits." |
| `social_comparison` | Social Proof | "73% of users with similar goals completed their task today." |
| `loss_aversion` | Loss Framing | "You'll lose your 5-day progress if you skip today." |
| `reward_preview` | Reward Preview | "Complete today's goal and you're 20% closer to your target!" |
| `identity_reinforcement` | Identity-Based | "You're becoming someone who exercises daily. Prove it today." |
| `micro_commitment` | Micro-Commitment | "Can you commit to just 5 minutes? That's all I ask." |

### Experiment Flow

```
Day 1-3:   User receives Strategy A (e.g., gentle_reminder)
           → Track: Did they complete goal? (binary outcome)
           → Track: Response time, engagement level
           
Day 4-6:   User receives Strategy B (e.g., accountability)
           → Same tracking
           
Day 7-9:   User receives Strategy C (e.g., streak_gamification)
           → Same tracking

Day 10+:   Bandit algorithm shifts to EXPLOIT mode
           → Primarily use winning strategy
           → Occasionally EXPLORE others (epsilon-greedy, ε=0.1)
```

### Effectiveness Scoring (Opik Metrics)

```python
# Custom Opik metric for intervention effectiveness
def intervention_effectiveness_score(
    intervention_type: str,
    user_completed_goal: bool,
    response_time_seconds: float,
    user_sentiment: str  # from LLM-as-judge
) -> float:
    """
    Composite score: 
    - 60% weight: Goal completion (binary)
    - 20% weight: Response speed (faster = better engagement)
    - 20% weight: User sentiment (positive reaction to intervention)
    """
    completion_score = 1.0 if user_completed_goal else 0.0
    speed_score = max(0, 1 - (response_time_seconds / 3600))  # Decay over 1hr
    sentiment_score = {"positive": 1.0, "neutral": 0.5, "negative": 0.0}[user_sentiment]
    
    return (0.6 * completion_score) + (0.2 * speed_score) + (0.2 * sentiment_score)
```

---

## 📊 Opik Integration Strategy (This Wins "Best Use of Opik")

### 1. Tracing Every Interaction

```python
import opik
from opik.integrations.litellm import track_litellm

opik.configure()  # Uses OPIK_API_KEY env var

@opik.track(name="generate_intervention")
def generate_intervention(user_id: str, goal: str, strategy: str) -> str:
    """Generate personalized intervention message"""
    # LLM call automatically traced
    response = litellm.completion(
        model="gemini/gemini-1.5-flash",
        messages=[
            {"role": "system", "content": INTERVENTION_SYSTEM_PROMPT},
            {"role": "user", "content": f"Goal: {goal}\nStrategy: {strategy}"}
        ]
    )
    return response.choices[0].message.content

@opik.track(name="evaluate_user_response")
def evaluate_user_response(user_message: str, goal: str) -> dict:
    """LLM-as-judge to evaluate if user completed goal"""
    # Traced automatically
    ...
```

### 2. Experiments & Datasets

```python
from opik import Opik
from opik.evaluation import evaluate
from opik.evaluation.metrics import base_metric

client = Opik()

# Create dataset of user interactions for evaluation
dataset = client.get_or_create_dataset(name="intervention_effectiveness")

# Add items from production logs
dataset.insert([
    {
        "user_id": "user_123",
        "goal": "Exercise 30 minutes",
        "strategy": "accountability",
        "intervention_message": "Did you exercise today?",
        "user_completed": True,
        "response_time_seconds": 1800
    },
    # ... more items
])

# Run experiment comparing strategies
experiment_result = evaluate(
    dataset=dataset,
    task=lambda x: generate_intervention(x["user_id"], x["goal"], x["strategy"]),
    scoring_metrics=[InterventionEffectiveness(), UserSentiment()],
    experiment_name="strategy_comparison_v1"
)
```

### 3. LLM-as-Judge for Sentiment Analysis

```python
from opik.evaluation.metrics import LLMJudge

# Custom judge to evaluate user's emotional response to interventions
user_sentiment_judge = LLMJudge(
    name="user_sentiment",
    model="gemini/gemini-1.5-flash",
    prompt_template="""
    Evaluate the user's emotional response to this motivational intervention.
    
    Intervention sent: {intervention_message}
    User's response: {user_response}
    
    Rate the user's sentiment as: positive, neutral, or negative
    Also rate if the intervention felt: helpful, annoying, or ignored
    
    Return JSON: {"sentiment": "...", "helpfulness": "..."}
    """
)
```

### 4. Online Evaluation Rules (Production Monitoring)

```python
# Set up online evaluation for production traces
from opik.evaluation.rules import OnlineEvaluationRule

# Automatically score every production intervention
rule = OnlineEvaluationRule(
    name="intervention_quality_monitor",
    filter="span.name == 'generate_intervention'",
    metrics=[
        Hallucination(),  # Ensure interventions are grounded
        Moderation(),     # No harmful content
        InterventionEffectiveness()  # Our custom metric
    ]
)
```

### 5. User-Facing Dashboard (The Secret Weapon)

**This is what makes us win:** We expose Opik experiment data TO THE USER as their personal insights dashboard.

```typescript
// Frontend component showing user's personal experiment results
interface PersonalInsights {
  bestStrategy: string;
  strategyEffectiveness: {
    strategy: string;
    completionRate: number;
    sampleSize: number;
  }[];
  recommendation: string;
}

// Fetch from our API which aggregates Opik experiment data
const insights = await fetch(`/api/users/${userId}/insights`);

// Display: "Direct accountability works 73% of the time for you, 
//           while gentle reminders only work 12% of the time."
```

### 6. Opik Agent Optimizer (Bonus Points)

```python
from opik_optimizer import MetaPromptOptimizer, ChatPrompt

# Use Opik to optimize our intervention prompts automatically
prompt = ChatPrompt(
    messages=[
        {"role": "system", "content": "{system_prompt}"},
        {"role": "user", "content": "Goal: {goal}, Strategy: {strategy}"}
    ]
)

optimizer = MetaPromptOptimizer(model="gemini/gemini-1.5-flash")

# Optimize intervention prompts based on effectiveness scores
result = optimizer.optimize_prompt(
    prompt=prompt,
    dataset=intervention_dataset,
    metric=intervention_effectiveness_metric,
    n_samples=100
)

# Deploy optimized prompt
OPTIMIZED_INTERVENTION_PROMPT = result.best_prompt
```

---

## 📅 2-Week Build Timeline

### Week 1: Core Infrastructure (Days 1-7)

#### Day 1-2: Project Setup & Database
- [ ] Initialize Next.js frontend with TypeScript
- [ ] Initialize FastAPI backend
- [ ] Set up Supabase project
- [ ] Create database schema:
  ```sql
  -- users, goals, interventions, outcomes, experiments
  ```
- [ ] Configure Opik account and project
- [ ] Set up environment variables
- [ ] Basic CI/CD with GitHub Actions

#### Day 3-4: Authentication & Goal System
- [ ] Supabase Auth integration
- [ ] Goal creation wizard UI
- [ ] Goal CRUD API endpoints
- [ ] Basic goal dashboard

#### Day 5-6: Intervention Engine (Core Feature)
- [ ] Implement intervention strategies (8 types)
- [ ] Multi-armed bandit algorithm (epsilon-greedy)
- [ ] LLM integration for message generation
- [ ] **Opik tracing on all LLM calls**
- [ ] Intervention delivery API

#### Day 7: User Response System
- [ ] Check-in UI (did you complete your goal?)
- [ ] Response tracking API
- [ ] Outcome logging to database
- [ ] **Log outcomes to Opik dataset**

### Week 2: Intelligence & Polish (Days 8-14)

#### Day 8-9: Analysis Engine
- [ ] Effectiveness calculation per strategy per user
- [ ] Personal insights aggregation API
- [ ] **Opik experiments for A/B comparisons**
- [ ] LLM-as-judge for sentiment analysis

#### Day 10-11: User Dashboard
- [ ] Personal insights visualization
- [ ] Strategy effectiveness charts
- [ ] "What works for you" recommendations
- [ ] Historical progress view

#### Day 12: Opik Deep Integration
- [ ] Online evaluation rules for production
- [ ] Custom Opik metrics (effectiveness score)
- [ ] **Opik Agent Optimizer for prompt tuning**
- [ ] Dashboard screenshots for judging

#### Day 13: Testing & Bug Fixes
- [ ] End-to-end testing
- [ ] Edge case handling
- [ ] Performance optimization
- [ ] Mobile responsiveness

#### Day 14: Demo Prep
- [ ] Seed demo data (run experiments on yourself)
- [ ] Record demo video walkthrough
- [ ] Prepare Opik dashboard screenshots
- [ ] Final deployment checks

### Week 3: Documentation & Pitch (Days 15-21)

#### Day 15-16: Technical Documentation
- [ ] README.md with setup instructions
- [ ] API documentation
- [ ] Architecture diagrams
- [ ] Opik integration guide

#### Day 17-18: Project Documentation
- [ ] Problem statement write-up
- [ ] Solution explanation
- [ ] Opik usage documentation (screenshots)
- [ ] Future roadmap

#### Day 19-20: Pitch Preparation
- [ ] Write pitch script (2-3 minutes)
- [ ] Create pitch deck (if required)
- [ ] Record demo video
- [ ] Practice pitch delivery

#### Day 21: Submission
- [ ] Final review
- [ ] Submit to hackathon platform
- [ ] Share on social (Twitter, LinkedIn)
- [ ] Celebrate 🎉

---

## 📁 Project Structure

```
resolution-lab/
├── frontend/                    # Next.js application
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   ├── dashboard/
│   │   │   ├── page.tsx        # Main dashboard
│   │   │   └── insights/
│   │   │       └── page.tsx    # Personal insights (Opik data)
│   │   ├── goals/
│   │   │   ├── new/page.tsx    # Goal creation wizard
│   │   │   └── [id]/page.tsx   # Goal detail
│   │   └── checkin/
│   │       └── page.tsx        # Daily check-in
│   ├── components/
│   │   ├── GoalCard.tsx
│   │   ├── InsightsChart.tsx
│   │   ├── InterventionMessage.tsx
│   │   └── StrategyComparison.tsx
│   └── lib/
│       ├── supabase.ts
│       └── api.ts
│
├── backend/                     # FastAPI application
│   ├── main.py                 # FastAPI app entry
│   ├── routers/
│   │   ├── goals.py
│   │   ├── interventions.py
│   │   ├── outcomes.py
│   │   └── insights.py
│   ├── services/
│   │   ├── experiment_engine.py    # Multi-armed bandit
│   │   ├── intervention_generator.py # LLM message gen
│   │   ├── analysis_engine.py      # Effectiveness calc
│   │   └── opik_integration.py     # Opik helpers
│   ├── models/
│   │   ├── schemas.py
│   │   └── database.py
│   └── utils/
│       ├── bandit.py           # Epsilon-greedy implementation
│       └── metrics.py          # Custom Opik metrics
│
├── opik/                        # Opik-specific configs
│   ├── datasets/               # Evaluation datasets
│   ├── metrics/                # Custom metric definitions
│   └── experiments/            # Experiment configs
│
├── docs/                        # Documentation
│   ├── README.md
│   ├── SETUP.md
│   ├── API.md
│   ├── OPIK_INTEGRATION.md
│   └── ARCHITECTURE.md
│
├── scripts/
│   ├── seed_demo_data.py
│   └── run_optimization.py
│
└── docker-compose.yml          # Local development
```

---

## 🗄️ Database Schema

```sql
-- Users table (Supabase Auth handles most of this)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    display_name TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    frequency TEXT NOT NULL, -- 'daily', 'weekly', 'custom'
    target_count INTEGER DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT DEFAULT 'active', -- 'active', 'completed', 'abandoned'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interventions sent to users
CREATE TABLE interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id),
    goal_id UUID REFERENCES goals(id),
    strategy TEXT NOT NULL, -- 'gentle_reminder', 'accountability', etc.
    message TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    opik_trace_id TEXT -- Link to Opik trace
);

-- User outcomes (did they complete the goal?)
CREATE TABLE outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id UUID REFERENCES interventions(id),
    user_id UUID REFERENCES user_profiles(id),
    goal_id UUID REFERENCES goals(id),
    completed BOOLEAN NOT NULL,
    response_time_seconds INTEGER, -- Time from intervention to response
    user_feedback TEXT, -- Optional user comment
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Experiment tracking (aggregated stats per user per strategy)
CREATE TABLE user_strategy_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id),
    strategy TEXT NOT NULL,
    total_interventions INTEGER DEFAULT 0,
    successful_completions INTEGER DEFAULT 0,
    avg_response_time_seconds FLOAT,
    effectiveness_score FLOAT, -- Calculated composite score
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, strategy)
);

-- Indexes for performance
CREATE INDEX idx_interventions_user ON interventions(user_id);
CREATE INDEX idx_outcomes_user ON outcomes(user_id);
CREATE INDEX idx_stats_user ON user_strategy_stats(user_id);
```

---

## 🔑 Environment Variables

```bash
# Frontend (.env.local)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000

# Backend (.env)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
DATABASE_URL=postgresql://...

# Opik (Critical!)
OPIK_API_KEY=your_opik_api_key
OPIK_WORKSPACE=your_workspace
OPIK_PROJECT_NAME=resolution-lab

# LLM
GOOGLE_API_KEY=your_gemini_api_key
# OR
OPENAI_API_KEY=your_openai_key

# Optional
REDIS_URL=redis://localhost:6379
```

---

## 📊 Demo Script for Judges

### Setup (Before Demo)
1. Run the app for 5-7 days on yourself
2. Accumulate real experiment data
3. Have Opik dashboard ready with real traces

### Demo Flow (3 minutes)

**[0:00-0:30] The Problem**
> "Every January, millions set resolutions. By February, most fail. Why? Because generic advice doesn't work—what motivates YOU is different from what motivates ME."

**[0:30-1:00] The Solution**
> "Resolution Lab doesn't guess. It runs experiments on YOU to discover your personal motivation formula."

*Show: Goal creation wizard*

**[1:00-1:45] The Magic**
> "Over the past week, Resolution Lab sent me 8 different types of interventions. Watch this..."

*Show: Personal insights dashboard*

> "Direct accountability got me to exercise 73% of the time. Gentle reminders? Only 12%. Now the AI knows what works for ME and adapts."

**[1:45-2:30] Opik Integration**
> "Every interaction is traced in Opik. Let me show you our experiment dashboard..."

*Show: Opik traces, experiments, LLM-as-judge scores*

> "We're using Opik not just for monitoring—it's the core product feature. Users see their own experiment data."

**[2:30-3:00] Closing**
> "Resolution Lab turns behavioral science into personal data. Stop guessing. Start knowing."

---

## 🎯 Judging Criteria Alignment

| Criteria | How We Score | Evidence |
|----------|--------------|----------|
| **Functionality** | Fully working app with auth, goals, interventions, insights | Live demo |
| **Real-world relevance** | Solves actual resolution failure problem with science | User stories |
| **Use of LLMs/Agents** | Personalized message generation, sentiment analysis, adaptive strategy | Code walkthrough |
| **Evaluation & Observability** | Deep Opik integration at every layer | Opik dashboard screenshots |
| **Best Use of Opik** | Opik IS the product—experiments shown to users | Unique differentiator |

---

## 🚀 Post-Hackathon Potential

If this wins or does well, natural extensions:
- Mobile app with push notifications
- Integration with Apple Health/Google Fit for automatic tracking
- Team/accountability partner features
- Enterprise version for workplace wellness programs
- Research partnerships with behavioral science labs

---

## 📞 Support & Resources

- **Opik Docs:** https://www.comet.com/docs/opik/
- **Opik GitHub:** https://github.com/comet-ml/opik
- **Hackathon Discord:** [Join for mentorship]
- **Gemini API:** https://ai.google.dev/
- **Supabase Docs:** https://supabase.com/docs

---

*Built for the "Commit to Change" Hackathon by Comet*
