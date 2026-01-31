# 📖 Resolution Lab - User Stories & Scenarios

A comprehensive guide to how Resolution Lab works from the user's perspective.

---

## Table of Contents

1. [New User Onboarding](#1-new-user-onboarding)
2. [Creating a Goal](#2-creating-a-goal)
3. [Daily Check-in Flow](#3-daily-check-in-flow)
4. [Exploring the AI Agent](#4-exploring-the-ai-agent)
5. [Viewing Personal Insights](#5-viewing-personal-insights)
6. [Goal Management](#6-goal-management)
7. [Running a Simulation Demo](#7-running-a-simulation-demo)
8. [Long-term Usage Patterns](#8-long-term-usage-patterns)
9. [Edge Cases & Error Handling](#9-edge-cases--error-handling)
10. [Custom Opik Evaluators - Technical Deep Dive](#custom-opik-evaluators---technical-deep-dive)
11. [Voice Motivation Feature](#11-voice-motivation-feature)
12. [Micro-Commitment Fallback](#12-micro-commitment-fallback)
13. [Streak Calendar & Highlights](#13-streak-calendar--highlights)
14. [Personalized Greetings](#14-personalized-greetings)
15. [Thread Evaluation (Opik)](#15-thread-evaluation-opik)
16. [Per-Goal Formula](#16-per-goal-formula)
17. [In-App Reminders](#17-in-app-reminders)

---

## 1. New User Onboarding

### Scenario 1.1: First Visit to Resolution Lab

**User:** Sarah, a 28-year-old professional who has tried many habit tracking apps but always abandons them.

**Journey:**

```
LANDING PAGE
─────────────────────────────────────────────────
Sarah lands on the homepage and sees:

"Discover What Actually Motivates You"

She reads the value proposition:
• "Generic motivation advice doesn't work"
• "We run experiments to find YOUR formula"
• "8 motivation strategies tested on YOU"

She clicks "Get Started Free"
         │
         ▼
DASHBOARD (Empty State)
─────────────────────────────────────────────────
Sarah sees an empty dashboard with:

📊 Active Goals: 0
🧪 Experiments Run: 0
📈 Best Strategy: Exploring...

A prominent card says:
"Create your first goal to start experimenting"

[+ New Goal] button highlighted
```

**What Sarah experiences:**
- Clean, simple interface (not overwhelming)
- Clear call-to-action
- Understanding that this is different from typical habit apps

---

## 2. Creating a Goal

### Scenario 2.1: Creating a Fitness Goal

**User:** Sarah wants to exercise more regularly.

**Journey:**

```
CREATE NEW GOAL PAGE
─────────────────────────────────────────────────
What's your goal?
┌─────────────────────────────────────────────┐
│ Exercise for 30 minutes                     │
└─────────────────────────────────────────────┘

Quick suggestions:
[Exercise 30 min] [Read 20 min] [Meditate]
[Journal] [Learn something] [Drink water]

Sarah clicks "Exercise 30 min" → auto-fills

How often?
[Daily ✓] [Weekly] [Custom]

┌─────────────────────────────────────────────┐
│ 💡 HOW IT WORKS                             │
│                                             │
│ • We'll send different motivation messages  │
│ • You tell us if you completed (yes/no)    │
│ • We learn what works best for YOU         │
│ • View your insights in the dashboard      │
└─────────────────────────────────────────────┘

[Cancel]  [Create Goal]
```

**What happens behind the scenes:**
1. Goal saved with unique ID
2. User's experiment state initialized
3. All 8 strategies marked as "unexplored"
4. Ready for first check-in

---

## 3. Daily Check-in Flow

### Scenario 3.1: First Check-in (Exploration Phase)

**User:** Sarah opens the app next morning.

```
DASHBOARD
─────────────────────────────────────────────────
Your Goals:
┌─────────────────────────────────────────────┐
│ 🎯 Exercise for 30 minutes                  │
│ 🔥 Streak: 0 days                           │
│                                             │
│ [Check In Now]                              │
└─────────────────────────────────────────────┘

Sarah clicks "Check In Now"
         │
         ▼
AI GENERATES INTERVENTION (Behind the scenes)
─────────────────────────────────────────────────
1. Agent OBSERVES: First check-in, no history
2. Agent THINKS: "Need to explore all strategies"
3. Agent PLANS: Selects "streak_gamification" (random)
4. Agent ACTS: Generates personalized message
5. Agent EVALUATES: Quality score 0.82
6. Agent LEARNS: Logs to Opik
         │
         ▼
CHECK-IN MODAL
─────────────────────────────────────────────────
          ✨ Daily Check-In
       Exercise for 30 minutes

┌─────────────────────────────────────────────┐
│                                             │
│ "Day 1 of your fitness journey! Every      │
│  champion started right here. One workout  │
│  today and you're building a streak that   │
│  could change your life. 🔥"               │
│                                             │
│  Strategy: Streak Gamification             │
└─────────────────────────────────────────────┘

       Did you complete your goal?

    ┌──────────┐      ┌──────────┐
    │   ✅     │      │    ❌    │
    │  Yes!    │      │ Not yet  │
    │ I did it │      │Maybe later│
    └──────────┘      └──────────┘

    [Add a note (optional)]
```

### Scenario 3.2: Sarah Completes Her Goal

**User:** Sarah did exercise! She clicks "Yes!"

**What happens:**

```
BEHIND THE SCENES
─────────────────────────────────────────────────
1. RECORD OUTCOME:
   - intervention_id: abc123
   - completed: TRUE
   - response_time: 3.2 seconds
   - strategy: streak_gamification

2. UPDATE BANDIT STATS:
   - streak_gamification.total_pulls += 1
   - streak_gamification.successes += 1
   - streak_gamification.completion_rate = 1.0 (100%)

3. CALCULATE EFFECTIVENESS:
   - completion_score: 1.0 (completed)
   - speed_score: 0.9 (responded quickly)
   - sentiment_score: 0.8 (positive feedback)
   - EFFECTIVENESS: 0.6×1.0 + 0.2×0.9 + 0.2×0.8 = 0.94

4. LOG TO OPIK:
   - Trace: record_outcome
   - Tags: [check-in, success, streak_gamification]
```

### Scenario 3.3: Sarah Doesn't Complete Her Goal

**User:** Day 3, Sarah clicks "Not yet"

**What happens:**
```
MICRO-COMMITMENT RESCUE (NEW!)
─────────────────────────────────────────────────
Instead of immediately recording failure,
the system offers a gentler option:

┌─────────────────────────────────────────────┐
│              ⏰                              │
│   How about just 2 minutes?                 │
│                                             │
│   Sometimes starting is the hardest part.   │
│   Can you commit to just 2 minutes?         │
│                                             │
│   [🚀 I'll try 2 minutes!]  [Not today]     │
└─────────────────────────────────────────────┘

If Sarah clicks "I'll try 2 minutes!":
→ Check-in recorded as COMPLETED
→ Streak continues
→ Algorithm learns micro-commitment rescue works

If Sarah clicks "Not today":
→ Strategy used gets a "failure" recorded
→ Completion rate decreases
→ System still learns (failure is data too!)
→ No guilt-tripping: "Every day is a new opportunity"
```

### Scenario 3.4: Providing Optional Feedback

**User:** Sarah adds a note: "The streak message felt pressuring, not motivating"

```
SENTIMENT ANALYSIS (Behind the scenes)
─────────────────────────────────────────────────
LLM analyzes feedback:
"The streak message felt pressuring, not motivating"

Result:
{
  "sentiment": "negative",
  "helpfulness_rating": 0.3,
  "confidence": 0.85
}

This LOWERS the effectiveness score for streak_gamification
even though she completed the goal!

The algorithm learns: "Streaks work but she doesn't like them"
```

---

## 4. Exploring the AI Agent

### Scenario 4.1: Viewing Agent Reasoning

**User:** Sarah is curious how the AI decides what messages to send.

```
AI AGENT PAGE (/agent)
─────────────────────────────────────────────────
🧠 AI Coach Agent
Watch the agent think, plan, and act

Your Goal: [Exercise for 30 minutes]

[▶ Run Agent]
         │
         ▼ (Sarah clicks Run Agent)
         │
AGENT STEPS VISUALIZATION
─────────────────────────────────────────────────

✅ Step 1: OBSERVE
└─ Gathering context & data

✅ Step 2: THINK
┌─────────────────────────────────────────────┐
│ Observation: "User has 12 data points       │
│              across 5 strategies"           │
│                                             │
│ Analysis: "Identity reinforcement shows 80% │
│           completion vs 45% for loss        │
│           aversion"                         │
│                                             │
│ Hypothesis: "User responds to positive      │
│             self-image rather than fear"    │
│                                             │
│ Confidence: ████████░░ 78%                  │
└─────────────────────────────────────────────┘

✅ Step 3: PLAN
┌─────────────────────────────────────────────┐
│ Chosen Strategy: identity_reinforcement     │
│                                             │
│ Reasoning: "Based on experiment data,       │
│ identity-based messages have the highest    │
│ success rate for this user."                │
│                                             │
│ Expected Effectiveness: 78%                 │
└─────────────────────────────────────────────┘

✅ Step 4: ACT
┌─────────────────────────────────────────────┐
│ "You're becoming someone who prioritizes    │
│  their health. That's not just a goal -     │
│  that's who you are now. Today's workout    │
│  is just you being you. 💪"                 │
│                                             │
│ Tone: inspiring                             │
└─────────────────────────────────────────────┘

✅ Step 5: EVALUATE
┌─────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────┐ │
│ │           GRADE: B                      │ │
│ │        (Custom Opik Evaluators)         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Custom Evaluator Scores:                    │
│ ├─ Strategy Alignment:   85%               │
│ ├─ Motivation Power:     78%               │
│ ├─ Personalization:      72%               │
│ └─ Tone Consistency:     80%               │
│                                             │
│ LLM Judge Scores:                           │
│ ├─ Quality:              82%               │
│ └─ Relevance:            88%               │
│                                             │
│ Overall (Hybrid):        81%               │
│ (40% custom + 60% LLM judge)               │
│                                             │
│ Suggestions:                                │
│ • Could reference specific past achievements│
└─────────────────────────────────────────────┘

✅ Step 6: LEARN
└─ Learning signals logged to Opik

✓ All steps traced in Opik with nested relationships
✓ Custom evaluators grade every message A-F
```

**What Sarah learns:**
- The AI actually reasons about her data
- It's not random - there's logic behind each message
- She can see WHY a strategy was chosen
- Message quality is graded (A-F) for transparency
- Transparency builds trust

---

## 5. Viewing Personal Insights

### Scenario 5.1: After 2 Weeks of Use

**User:** Sarah has done 20+ check-ins and wants to see her results.

```
INSIGHTS PAGE (/insights)
─────────────────────────────────────────────────
📊 YOUR INSIGHTS
Personal experiment results

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│    23    │ │   7/8    │ │   72%    │ │Optimizing│
│Data Pts  │ │Strategies│ │ Success  │ │  Phase   │
│          │ │ Tested   │ │  Rate    │ │          │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

┌─────────────────────────────────────────────────┐
│ 💡 YOUR PERSONAL INSIGHT            Grade: [A]  │
│                                                 │
│ "You respond best to Identity Reinforcement     │
│  messages (82% success rate). You're motivated  │
│  by WHO you're becoming, not by streaks or      │
│  fear of loss. Consider framing your goals as   │
│  identity statements: 'I am someone who         │
│  exercises' rather than 'I should exercise'"    │
│                                                 │
│ ─────────────────────────────────────────────── │
│ Custom Opik Evaluator Scores:                   │
│ Actionability: 92%  Data-grounded: 88%          │
│ Personalization: 85%  Clarity: 90%              │
└─────────────────────────────────────────────────┘

STRATEGY COMPARISON CHART
─────────────────────────────────────────────────
Identity Reinforcement  ████████████████████░  82%  🏆
Micro Commitment        ███████████████████░░  76%
Gentle Reminder         ████████████████░░░░░  65%
Accountability          ██████████████░░░░░░░  58%
Reward Preview          ████████████░░░░░░░░░  50%
Streak Gamification     ███████████░░░░░░░░░░  45%
Social Comparison       ██████████░░░░░░░░░░░  42%
Loss Aversion           ████████░░░░░░░░░░░░░  35%  📉

* Based on 23 data points across 7 strategies
```

**What Sarah realizes:**
- Loss aversion DEMOTIVATES her (35% vs 82%)
- She's motivated by positive identity, not fear
- This is a real insight about her psychology!

---

## 6. Goal Management

### Scenario 6.1: Pausing a Goal

**User:** Sarah is going on vacation and wants to pause her goal.

```
GOAL ACTIONS
─────────────────────────────────────────────────
Sarah opens the goal menu (⋮) and sees:

┌─────────────────┐
│ ⏸️ Pause Goal    │ ← Sarah clicks this
│ ✅ Mark Complete │
│ 🗑️ Delete Goal   │
└─────────────────┘

Goal status changes to "paused"
Experiment data is preserved
No check-ins expected while paused
```

### Scenario 6.2: Resuming a Goal

```
PAUSED GOAL CARD
─────────────────────────────────────────────────
┌─────────────────────────────────────────────┐
│ 🎯 Exercise for 30 minutes       ⏸️ Paused  │
│                                             │
│ 🔥 Streak: 7 days (before pause)            │
│ 📊 Data points: 23                          │
│                                             │
│ [▶ Resume Goal]                             │
└─────────────────────────────────────────────┘

Sarah clicks "Resume" - streak resets but 
experiment data continues from where she left off
```

### Scenario 6.3: Completing a Goal

```
GOAL COMPLETED 🎉
─────────────────────────────────────────────────
🎉 Congratulations!

Goal: Exercise for 30 minutes
Duration: 30 days
Completion Rate: 76%
Best Strategy: Identity Reinforcement

Key Insight:
"You're 2.3x more likely to complete when receiving
 identity-based messages vs loss aversion messages"

[Create New Goal]  [View Full Insights]
```

---

## 7. Running a Simulation Demo

### Scenario 7.1: First-time User Exploring

**User:** Mike visits but doesn't want to commit yet.

```
EXPERIMENT PAGE (/experiment)
─────────────────────────────────────────────────
🧪 Experiment Simulator
See how the algorithm learns - no commitment needed

Goal: [Exercise for 30 minutes]
Number of check-ins: [30]

[▶ Run Simulation]
         │
         ▼
SIMULATION RESULTS
─────────────────────────────────────────────────
✅ Simulation Complete!

Check-ins Simulated: 30
Strategies Tested: 8
Best Strategy Found: micro_commitment (78%)
Experiment Phase: Optimizing 🎯

┌─────────────────────────────────────────────────┐
│ 🎯 CUSTOM OPIK EVALUATORS                       │
│ Every message evaluated for quality!            │
│                                                 │
│ Average Quality Score: 72%  [Good]              │
│ ████████████████████░░░░░░░                     │
│                                                 │
│ Grade Distribution:                             │
│ A: ██ 3   B: ████████ 12   C: ██████ 10        │
│ D: ██ 4   F: █ 1                                │
│                                                 │
│ Dimensions Evaluated:                           │
│ • Strategy Alignment - Message matches strategy │
│ • Motivation Power - Likely to motivate action  │
│ • Personalization - Feels tailored, not generic │
│ • Tone Consistency - Tone matches strategy      │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ micro_commitment     [B] ████████████████  78% │
│ identity_reinforcement [A] ██████████████░░ 72% │
│ gentle_reminder      [C] ████████████░░░░  65% │
│ ...                                         │
└─────────────────────────────────────────────┘

💡 This is simulated data. Create a real goal to
   discover YOUR personal motivation formula!

[Create Real Goal]  [Run Another Simulation]
```

---

## 8. Long-term Usage Patterns

### Scenario 8.1: Weekly User (Week 1-4)

```
Week 1 (Exploration Phase):
• 7 check-ins
• All 8 strategies tested at least once
• No clear winner yet
• Phase: 🔬 Exploring
• Insight: "Still gathering data..."

Week 2-3 (Transition Phase):
• 14 more check-ins (21 total)
• Patterns emerging
• Identity reinforcement pulling ahead (75%)
• Loss aversion falling behind (40%)
• Phase: 🔬 Exploring → 🎯 Optimizing
• Insight: "Early results suggest you respond to..."

Week 4+ (Optimization Phase):
• 28+ check-ins
• 80% of messages use top 2 strategies
• 20% still exploring (might find something better!)
• Phase: 🎯 Optimizing
• Insight: "Your motivation formula: Identity (82%) + 
           Micro-commitment (76%) works best for you"
```

### Scenario 8.2: Multiple Goals, Same User

```
CROSS-GOAL INSIGHTS
─────────────────────────────────────────────────
Sarah has 3 goals with different patterns:

🏋️ Exercise:
   Best: Identity Reinforcement (82%)
   Worst: Loss Aversion (35%)

📚 Reading:
   Best: Gentle Reminder (78%)
   Worst: Accountability (40%)

🧘 Meditation:
   Best: Micro Commitment (85%)
   Worst: Streak Gamification (30%)

💡 CROSS-GOAL INSIGHT:
"You consistently respond poorly to pressure-based
 strategies (loss aversion, accountability, streaks).
 You thrive with positive, low-pressure approaches."
```

---

## 9. Edge Cases & Error Handling

### Scenario 9.1: Backend Not Running

```
⚠️ Connection Error

Failed to connect to backend. Make sure the server
is running on localhost:8000

[Retry] [Go to Setup Guide]
```

### Scenario 9.2: LLM API Failure

```
FALLBACK MESSAGE
─────────────────────────────────────────────────
If Gemini API fails, system uses pre-written fallbacks:

Strategy: gentle_reminder
Fallback: "Hey! Just a friendly reminder about your 
          goal. No pressure, just checking in! 🌟"

User experience continues uninterrupted
Error logged to Opik for monitoring
```

### Scenario 9.3: Insufficient Data

```
🔬 Still Collecting Data

We need at least 10-20 check-ins to find reliable
patterns in what motivates you.

Current: 3 data points
Recommended: 20+ data points

[Do a Check-in] [Try Simulation Demo]
```

---

## Summary: The Complete User Journey

```
DISCOVERY
└─► Landing page → "This is different from other apps"

ONBOARDING
└─► Create first goal → Simple, guided experience

DAILY USE
└─► Check-ins → AI generates personalized messages
    └─► Yes/No response → Algorithm learns
        └─► Optional feedback → Sentiment analysis

EXPLORATION (Week 1-2)
└─► All strategies tested → Data collection phase

INSIGHTS (Week 2+)
└─► View personal results → "Identity works 82% for you!"
    └─► Understand your psychology

OPTIMIZATION (Week 3+)
└─► Algorithm uses best strategies 80% of time
    └─► Continues exploring 20% to improve

LONG-TERM VALUE
└─► Multiple goals → Cross-goal insights
    └─► "You consistently respond to positive messaging"
```

---

## Key Differentiators for Users

1. **Transparency**: Users SEE why each message was chosen
2. **Science-based**: Real multi-armed bandit, not random
3. **Personal insights**: Data about YOUR psychology
4. **No guilt**: Failures are data, not judgment (with micro-commitment rescue!)
5. **Adaptive**: System improves over time for each user
6. **Quality Assurance**: Every AI output graded A-F by custom Opik evaluators
7. **Multi-sensory**: Listen to motivation with text-to-speech voice feature
8. **Visual Progress**: Streak calendar and goal highlights keep you motivated
9. **Personalized Experience**: Time-based greetings and context-aware messaging

---

## Custom Opik Evaluators - Technical Deep Dive

Resolution Lab uses 6 custom Opik evaluators to assess ALL AI-generated content:

### Message Evaluators (Used in Agent & Experiment pages)

| Evaluator | What it Measures | How it Works |
|-----------|------------------|--------------|
| **Strategy Alignment** | Does message match intended strategy? | Keyword/phrase matching for strategy-specific language |
| **Motivation Effectiveness** | Will this actually motivate action? | Checks for call-to-action, emotional engagement, self-efficacy |
| **Personalization** | Is it tailored or generic? | Detects generic phrases vs. goal-specific references |
| **Tone Consistency** | Does tone match strategy? | Validates tone markers match expected strategy style |

### Insight Evaluator (Used in Insights page)

| Evaluator | What it Measures | How it Works |
|-----------|------------------|--------------|
| **Insight Quality** | Is recommendation actionable & data-grounded? | Checks actionability, data references, personalization, clarity |

### Hybrid Evaluation (Agent Page)

The AI Agent uses a **hybrid evaluation approach**:
- **40% weight**: Custom Opik evaluators (fast, deterministic)
- **60% weight**: LLM-as-Judge (nuanced, contextual)
- **Result**: Overall score + Letter grade (A-F)

This demonstrates production-ready evaluation patterns that go beyond basic tracing.

---

## 11. Voice Motivation Feature

### Scenario 11.1: Listening to Motivation Message

**User:** Sarah gets her motivation message and wants to hear it spoken aloud.

```
MOTIVATION MESSAGE WITH VOICE
─────────────────────────────────────────────────
          ✨ Your Personalized Motivation

┌─────────────────────────────────────────────┐
│                                             │
│ "You're becoming someone who prioritizes    │
│  their health. That's not just a goal -     │
│  that's who you are now. Today's workout    │
│  is just you being you. 💪"                 │
│                                             │
│ 💪 identity_reinforcement  [🔊 Listen] [⚙️] │
└─────────────────────────────────────────────┘

Sarah clicks "Listen" button
         │
         ▼
Browser speaks the message using Web Speech API
Button changes to [⏹ Stop] while speaking
```

### Scenario 11.2: Enabling Auto-Play Voice

**User:** Sarah wants to hear every message automatically.

```
VOICE SETTINGS PANEL
─────────────────────────────────────────────────
Sarah clicks the ⚙️ settings icon:

┌─────────────────────────────────────────────┐
│ Voice Settings                          [✕] │
│                                             │
│ 🔊 Auto-play voice              [====○    ] │
│                                    ON       │
│ ─────────────────────────────────────────── │
│ Voice                                       │
│ ┌─────────────────────────────────────────┐ │
│ │ Samantha (en-US)                      ▼ │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘

When enabled:
• New motivation messages auto-play on arrival
• Preference saved to localStorage
• Voice usage tracked in Opik for analytics
```

**What happens behind the scenes:**
```
OPIK ANALYTICS (api_voice_play trace)
─────────────────────────────────────────────────
Metrics logged:
• voice_played: 1
• voice_auto_played: 1 (if auto-play) or 0 (if manual)

Metadata:
• intervention_id: abc123
• user_id: user-xyz
• strategy: identity_reinforcement
• auto_played: true

This allows analysis of:
→ Do users who enable voice have higher check-in rates?
→ Which strategies are listened to most?
→ Auto-play vs manual engagement patterns
```

---

## 12. Micro-Commitment Fallback

### Scenario 12.1: User Says "Not Yet"

**User:** Sarah receives motivation but clicks "Not yet" - she's feeling overwhelmed.

```
CHECK-IN RESPONSE
─────────────────────────────────────────────────
"Did this motivation help you take action?"

Sarah clicks "Not yet"
         │
         ▼
MICRO-COMMITMENT PROMPT APPEARS
─────────────────────────────────────────────────
┌─────────────────────────────────────────────┐
│              ⏰                              │
│                                             │
│   How about just 2 minutes?                 │
│                                             │
│   Sometimes starting is the hardest part.   │
│   Can you commit to just 2 minutes?         │
│   That's all it takes to build momentum.    │
│                                             │
│   [🚀 I'll try 2 minutes!]  [Not today]     │
└─────────────────────────────────────────────┘
```

### Scenario 12.2: Sarah Accepts Micro-Commitment

```
Sarah clicks "I'll try 2 minutes!"
         │
         ▼
BEHIND THE SCENES
─────────────────────────────────────────────────
1. Check-in recorded with:
   - completed: true
   - user_feedback: "micro_commitment"

2. Streak continues (not broken!)

3. Algorithm learns:
   "When user initially says no, micro-commitment
    rescue works → increases micro_commitment
    strategy effectiveness"

4. Success message shown:
   ✓ "Great job! Your progress has been recorded."
```

### Scenario 12.3: Sarah Declines Micro-Commitment

```
Sarah clicks "Not today"
         │
         ▼
BEHIND THE SCENES
─────────────────────────────────────────────────
1. Check-in recorded with:
   - completed: false
   - user_feedback: "micro_commitment" (declined)

2. No guilt messaging shown:
   "No worries! Every day is a new opportunity."

3. Algorithm still learns from this data point
```

**Why this matters:**
- Reduces "all or nothing" thinking
- Gives users a graceful way to maintain progress
- Data shows if micro-commitment rescues improve outcomes

---

## 13. Streak Calendar & Highlights

### Scenario 13.1: Viewing Streak Calendar on Dashboard

**User:** Sarah opens the dashboard and sees her check-in history.

```
DASHBOARD WITH STREAK CALENDAR
─────────────────────────────────────────────────
☀️ Good afternoon, Sarah!
Keep the momentum going.

🔥 3-day streak! Keep it going!

┌─────────────────────────────────────────────┐
│ 📅 Check-in Calendar                        │
│                                             │
│ 🔥 Current Streak: 3 days                   │
│ 🏆 Longest Streak: 7 days                   │
│                                             │
│     S   M   T   W   T   F   S               │
│    ┌───┬───┬───┬───┬───┬───┬───┐           │
│    │ ⬜ │ 🟩 │ 🟩 │ 🟥 │ 🟩 │ 🟩 │ ⬜ │           │
│    ├───┼───┼───┼───┼───┼───┼───┤           │
│    │ ⬜ │ 🟩 │ 🟩 │ 🟩 │ 🟩 │ 🟩 │ 🟩 │           │
│    ├───┼───┼───┼───┼───┼───┼───┤           │
│    │ 🟩 │ 🟥 │ 🟩 │ 🟩 │ 🟩 │ ⬜ │ ⬜ │           │
│    └───┴───┴───┴───┴───┴───┴───┘           │
│                                             │
│ Legend: 🟩 Completed  🟥 Missed  ⬜ No data  │
└─────────────────────────────────────────────┘
```

### Scenario 13.2: Goal Card with Streak Highlight

**User:** Sarah sees her goal cards with prominent streak highlights.

```
GOAL CARDS WITH STREAK HIGHLIGHTS
─────────────────────────────────────────────────
┌─────────────────────────────────────────────┐
│ 🎯 Exercise for 30 minutes                  │
│                                             │
│ 🔥 Streak: 7 days | ✅ 85% completion       │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 🔥🔥🔥 7 days on fire!                   │ │
│ │ You're unstoppable! Keep going!         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [Check In] [View Details]                   │
└─────────────────────────────────────────────┘

Streak highlight styles:
• 3-6 days: Orange highlight "🔥 Keep it going!"
• 7+ days: Gradient highlight "🔥🔥🔥 On fire!"
```

---

## 14. Personalized Greetings

### Scenario 14.1: Time-Based Greetings

**User:** Sarah opens the AI Coach at different times of day.

```
MORNING (Before 12pm)
─────────────────────────────────────────────────
🌅 Good morning, Sarah!
Start your day with purpose.

🔥 3-day streak! Keep it going!

AFTERNOON (12pm - 5pm)
─────────────────────────────────────────────────
☀️ Good afternoon, Sarah!
Keep the momentum going.

EVENING (5pm - 9pm)
─────────────────────────────────────────────────
🌆 Good evening, Sarah!
Finish strong today.

LATE NIGHT (After 9pm)
─────────────────────────────────────────────────
🌙 Working late, Sarah!
Every step counts.
```

### Scenario 14.2: Goal-Specific Streak Messages

**User:** Sarah has different streak levels for different goals.

```
AI COACH PAGE - GOAL SELECTION
─────────────────────────────────────────────────
🌅 Good morning, Sarah!
Start your day with purpose.

What do you need motivation for?

┌─────────────────────────────────────────────┐
│ [✓] 🎯 Exercise for 30 minutes              │
│     🔥 7 day streak                         │
├─────────────────────────────────────────────┤
│     🎯 Read for 20 minutes                  │
│     🔥 3 day streak                         │
├─────────────────────────────────────────────┤
│     🎯 Meditate                             │
│     🔥 0 day streak                         │
└─────────────────────────────────────────────┘

When Sarah selects a goal, the streak message updates:

Selected: Exercise (7-day streak)
→ "🔥 7-day streak! You're unstoppable!"

Selected: Read (3-day streak)
→ "🔥 3-day streak! Keep it going!"

Selected: Meditate (0-day streak)
→ No streak message shown
```

---

## Summary: Complete Feature Set

```
CORE FEATURES
├── 🤖 AI Coach Agent (6-step cognitive loop)
├── 🧪 Multi-armed bandit experiment
├── 📊 Personal insights & analytics
└── 🎯 Goal management

ENGAGEMENT FEATURES (NEW!)
├── 🔊 Voice Motivation
│   ├── Listen button on every message
│   ├── Auto-play preference
│   ├── Voice selection
│   └── Opik analytics tracking
│
├── 🎯 Micro-Commitment Fallback
│   ├── "Just 2 minutes" rescue prompt
│   ├── Preserves streaks on acceptance
│   └── Tracks effectiveness in algorithm
│
├── 📅 Streak Calendar
│   ├── 35-day visual history
│   ├── Color-coded days
│   └── Current & longest streak display
│
├── 🔥 Per-Goal Streak Highlights
│   ├── Prominent banners for 3+ days
│   └── Extra celebration for 7+ days
│
└── ⏰ Personalized Greetings
    ├── Time-based messaging
    ├── User name personalization
    └── Goal-specific streak context

QUALITY ASSURANCE
├── 🔒 Protected routes (authentication required)
├── 📈 Custom Opik evaluators (A-F grades)
└── 🔍 Full observability in Opik
```

---

---

## 15. Thread Evaluation (Opik)

### Scenario 15.1: Automatic Thread Evaluation After 5 Check-ins

**User:** Sarah has been checking in on her "Exercise 30 min" goal consistently.

```
CHECK-IN #5 - AUTO EVALUATION TRIGGER
─────────────────────────────────────────────────────────────────
Sarah completes her 5th check-in
         │
         ▼
BEHIND THE SCENES (Backend)
─────────────────────────────────────────────────────────────────
1. Check-in recorded as usual (outcome: completed)

2. System detects: checkin_count = 5 (threshold reached!)
   └─→ Triggers thread evaluation automatically

3. Thread Evaluation Process:
   ┌─────────────────────────────────────────────────────────┐
   │ Step 1: Close thread (mark goal thread as "inactive")  │
   │         status = "inactive" for goal_id: abc123        │
   │                                                         │
   │ Step 2: Fetch all traces for this thread               │
   │         SELECT * FROM traces WHERE thread_id = abc123  │
   │                                                         │
   │ Step 3: Run Opik evaluate_threads() with:              │
   │         • ConversationalCoherenceMetric                │
   │         • UserFrustrationMetric                        │
   │                                                         │
   │ Step 4: Attach feedback scores to thread               │
   │         coherence: 0.85, frustration: 0.12             │
   │                                                         │
   │ Step 5: Reopen thread (resume tracking)                │
   │         status = "active" for goal_id: abc123          │
   └─────────────────────────────────────────────────────────┘

4. Logs printed:
   📊 Reached 5 check-ins - triggering thread evaluation
   🧵 Evaluating thread for goal abc123
   ✅ Thread evaluation complete: coherence=0.85, frustration=0.12
```

### Scenario 15.2: Viewing Thread Scores in Opik Dashboard

**User:** A developer/judge opens the Opik dashboard to see thread evaluations.

```
OPIK DASHBOARD - THREADS VIEW
─────────────────────────────────────────────────────────────────
Thread: goal_abc123 (Exercise 30 min)
Status: Active
Traces: 5

Feedback Scores:
┌─────────────────────────────────────────────────────────────┐
│  📊 CONVERSATIONAL COHERENCE                                 │
│  Score: 0.85 / 1.0                                          │
│  ████████████████████████████████░░░░░░                     │
│                                                             │
│  Interpretation: The conversation flow is coherent.         │
│  Messages maintain context and build on previous check-ins. │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  😤 USER FRUSTRATION                                         │
│  Score: 0.12 / 1.0 (Lower is better)                        │
│  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                       │
│                                                             │
│  Interpretation: User shows minimal frustration.             │
│  Strategies are working well for this goal.                 │
└─────────────────────────────────────────────────────────────┘

Thread Timeline:
├─ Check-in 1: streak_gamification → completed ✓
├─ Check-in 2: gentle_reminder → completed ✓
├─ Check-in 3: identity_reinforcement → completed ✓
├─ Check-in 4: loss_aversion → NOT completed ✗
├─ Check-in 5: identity_reinforcement → completed ✓
└─ [EVALUATION TRIGGERED] scores attached
```

### Scenario 15.3: Thread Evaluation for Struggling User

**User:** Mike has been struggling with his "Meditate" goal - many missed check-ins.

```
THREAD EVALUATION - HIGH FRUSTRATION DETECTED
─────────────────────────────────────────────────────────────────
Thread: goal_xyz789 (Meditate 10 min)
Status: Active
Traces: 10 (2nd evaluation cycle)

Feedback Scores:
┌─────────────────────────────────────────────────────────────┐
│  📊 CONVERSATIONAL COHERENCE                                 │
│  Score: 0.62 / 1.0                                          │
│  ████████████████████░░░░░░░░░░░░░░░░                       │
│                                                             │
│  Lower coherence - messaging may not be resonating          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  😤 USER FRUSTRATION                                         │
│  Score: 0.67 / 1.0 (HIGH!)                                  │
│  ██████████████████████████████████████░░░░                 │
│                                                             │
│  ⚠️ Warning: High frustration detected!                     │
│  Consider adjusting strategy for this goal.                 │
└─────────────────────────────────────────────────────────────┘

Thread Timeline:
├─ Check-in 1: accountability → NOT completed ✗
├─ Check-in 2: loss_aversion → NOT completed ✗
├─ Check-in 3: streak_gamification → NOT completed ✗
├─ Check-in 4: gentle_reminder → completed ✓
├─ Check-in 5: micro_commitment → completed ✓
├─ [EVALUATION #1] coherence=0.45, frustration=0.78
├─ Check-in 6: gentle_reminder → completed ✓
├─ ...
└─ [EVALUATION #2] coherence=0.62, frustration=0.67 (improving!)
```

**Key Insight for Judges:**
- Thread evaluation happens automatically every 5 check-ins
- Feedback scores are attached to threads in Opik
- High frustration scores can identify struggling users early
- System learns to avoid strategies that increase frustration

---

## 16. Per-Goal Formula

### Scenario 16.1: Discovering Different Formulas for Different Goals

**User:** Sarah has multiple goals and notices different strategies work for each.

```
GOALS PAGE - FORMULA STATUS
─────────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Exercise for 30 minutes                      [Active]    │
│                                                             │
│ 🔥 Streak: 12 days | ✅ Total: 28 | 📊 Rate: 82%            │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🧪 Best: Streak Gamification                            │ │
│ │ 28 check-ins analyzed                                   │ │
│ │                                    [Apply Formula]      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Check In Now]                                          ⋮   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🎯 Read 20 pages                                 [Active]   │
│                                                             │
│ 🔥 Streak: 5 days | ✅ Total: 20 | 📊 Rate: 76%             │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✨ Formula: Gentle Reminder                              │ │
│ │ AI optimized for this goal                              │ │
│ │                                              [Reset]    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Check In Now]                                          ⋮   │
└─────────────────────────────────────────────────────────────┘
```

### Scenario 16.2: Applying a Per-Goal Formula

**User:** Sarah clicks "Apply Formula" on her Exercise goal.

```
APPLYING FORMULA
─────────────────────────────────────────────────────────────────
Sarah clicks [Apply Formula] on Exercise goal
         │
         ▼
BEHIND THE SCENES
─────────────────────────────────────────────────────────────────
1. API Call: POST /api/insights/goals/{goal_id}/formula/apply
   └─→ user_id: sarah123, goal_id: exercise_abc

2. Database Update:
   UPDATE goals SET
     formula_applied = true,
     preferred_strategy = 'streak_gamification'
   WHERE id = 'exercise_abc'

3. Strategy Selection Changes:

   BEFORE (Exploration Mode):
   ┌─────────────────────────────────────────────────────────┐
   │ Each check-in: Multi-armed bandit selects strategy      │
   │ • 20% exploration (try all strategies)                  │
   │ • 80% exploitation (use what's working)                 │
   └─────────────────────────────────────────────────────────┘

   AFTER (Formula Applied):
   ┌─────────────────────────────────────────────────────────┐
   │ Each check-in: Priority given to preferred strategy     │
   │ • 90% preferred strategy (streak_gamification)          │
   │ • 10% exploration (still learning!)                     │
   └─────────────────────────────────────────────────────────┘

4. UI Updates:
   └─→ Shows: ✨ Formula: Streak Gamification
             AI optimized for this goal
             [Reset] button
```

### Scenario 16.3: Different Formulas for Different Goals

**User:** Sarah has applied different formulas to each of her goals.

```
SARAH'S PERSONALIZED FORMULAS
─────────────────────────────────────────────────────────────────

🏋️ EXERCISE 30 MIN
   Formula: ✨ Streak Gamification
   Why it works: "Day 15! Don't break the chain!"
   → Sarah responds to competitive, game-like messaging

📚 READ 20 PAGES
   Formula: ✨ Gentle Reminder
   Why it works: "Just a friendly nudge about your reading..."
   → Sarah prefers low-pressure approach for reading

🧘 MEDITATE 10 MIN
   Formula: ✨ Micro-Commitment
   Why it works: "Just 2 minutes? That's all you need..."
   → Meditation needs to feel less daunting

💧 DRINK 8 GLASSES
   Formula: Not applied yet (still exploring)
   Best so far: Identity Reinforcement (68%)
   → [Apply Formula] button visible

KEY INSIGHT:
Different goals need different motivation strategies!
Exercise benefits from gamification, but that same
approach would stress Sarah out for meditation.
```

### Scenario 16.4: Resetting a Formula

**User:** Sarah's reading has plateaued and she wants to try different strategies again.

```
RESETTING FORMULA
─────────────────────────────────────────────────────────────────
Sarah clicks [Reset] on her Reading goal
         │
         ▼
CONFIRMATION
─────────────────────────────────────────────────────────────────
Formula cleared. The AI will resume testing different
strategies to find a better approach.
         │
         ▼
RESULT
─────────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Read 20 pages                                 [Active]   │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🧪 Best: Gentle Reminder                                │ │
│ │ 20 check-ins analyzed                                   │ │
│ │                                    [Apply Formula]      │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

System returns to exploration mode for this goal.
```

---

## 17. In-App Reminders

### Scenario 17.1: Seeing the Reminder Banner

**User:** Sarah opens the Goals page and hasn't checked in on some goals today.

```
GOALS PAGE WITH REMINDER BANNER
─────────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────┐
│ 🔔 Goals need your attention                                │
│ You have 2 active goals ready for check-in                  │
│                                                             │
│ [Check In Now]                              [✕ Dismiss]     │
└─────────────────────────────────────────────────────────────┘

Your Goals:
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Exercise for 30 minutes                      [Active]    │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

### Scenario 17.2: Clicking the Reminder - Full Opik Tracing

**User:** Sarah clicks "Check In Now" on the reminder banner.

```
REMINDER INTERACTION - OPIK TRACED
─────────────────────────────────────────────────────────────────
Sarah clicks [Check In Now]
         │
         ▼
BEHIND THE SCENES - FULL OPIK TRACING
─────────────────────────────────────────────────────────────────
1. Track Reminder Interaction API called:
   POST /api/reminders/interaction
   {
     "user_id": "sarah123",
     "action": "click",
     "goal_count": 2,
     "time_to_action": 3500  // ms since banner appeared
   }

2. Opik Trace Created:
   ┌─────────────────────────────────────────────────────────┐
   │ Trace: track_reminder_interaction                       │
   │ ├─ input: {action: "click", goal_count: 2}              │
   │ ├─ output: {success: true, score: 0.9}                  │
   │ └─ tags: ["reminder", "engagement", "click"]            │
   └─────────────────────────────────────────────────────────┘

3. Feedback Scores Attached:
   ┌─────────────────────────────────────────────────────────┐
   │ reminder_engagement: 0.9 (high - clicked quickly)       │
   │ reminder_response_time: 3.5 (seconds to action)         │
   │ reminder_urgency: 4 (2 goals needed attention)          │
   └─────────────────────────────────────────────────────────┘

4. User navigated to check-in flow
```

### Scenario 17.3: Dismissing the Reminder

**User:** Sarah is busy and dismisses the reminder.

```
REMINDER DISMISSED - STILL TRACKED
─────────────────────────────────────────────────────────────────
Sarah clicks [✕ Dismiss]
         │
         ▼
OPIK TRACE
─────────────────────────────────────────────────────────────────
1. Track Reminder Interaction:
   {
     "action": "dismiss",
     "goal_count": 2,
     "time_to_action": 8200  // took longer to decide
   }

2. Feedback Scores:
   reminder_engagement: 0.3 (low - dismissed)
   reminder_response_time: 8.2 (seconds)
   reminder_urgency: 4

3. Banner disappears, stored in localStorage to avoid spam
```

### Scenario 17.4: Analyzing Reminder Effectiveness in Opik

**User:** Developer views reminder analytics in Opik dashboard.

```
OPIK DASHBOARD - REMINDER ANALYTICS
─────────────────────────────────────────────────────────────────

📊 REMINDER ENGAGEMENT OVER TIME
─────────────────────────────────────────────────────────────────
Average Scores (Last 7 days):
• reminder_engagement: 0.72 (72% interact positively)
• reminder_response_time: 4.2 seconds average
• reminder_urgency: 3.1 average (most users have 2-3 goals)

Breakdown by Action:
┌────────────┬─────────┬────────────────────────────────────┐
│ Action     │ Count   │ Avg Response Time                   │
├────────────┼─────────┼────────────────────────────────────┤
│ click      │ 156     │ 3.2s  ████████████░░░░░░░░░        │
│ view       │ 210     │ N/A   (just viewed, no action)     │
│ dismiss    │ 54      │ 7.8s  █████████████████████░░░░    │
└────────────┴─────────┴────────────────────────────────────┘

INSIGHT:
Users who click do so within 3 seconds.
Dismissals take longer (user weighing decision).
High engagement rate suggests reminders are valuable.
```

---

## Summary: Complete Feature Set (Updated)

```
CORE FEATURES
├── 🤖 AI Coach Agent (6-step cognitive loop)
├── 🧪 Multi-armed bandit experiment
├── 📊 Personal insights & analytics
└── 🎯 Goal management

OPIK INTEGRATION (⭐ HACKATHON HIGHLIGHT)
├── 🧵 Thread Evaluation
│   ├── Each goal = 1 thread in Opik
│   ├── Auto-evaluates every 5 check-ins
│   ├── ConversationalCoherence metric
│   ├── UserFrustration metric
│   └── Feedback scores visible in Thread view
│
├── 📈 Feedback Scores
│   ├── reminder_engagement (in-app reminders)
│   ├── reminder_response_time (time to action)
│   ├── reminder_urgency (goal count)
│   └── Thread evaluation scores
│
└── 🔍 Full Tracing
    ├── Nested parent-child traces
    ├── Custom evaluators (A-F grades)
    └── LLM-as-Judge hybrid evaluation

ENGAGEMENT FEATURES
├── 🔊 Voice Motivation (TTS)
├── 🎯 Micro-Commitment Fallback
├── 📅 Streak Calendar
├── 🔥 Per-Goal Streak Highlights
├── ⏰ Personalized Greetings
├── 🔔 In-App Reminders (Opik traced)
└── 🧪 Per-Goal Formula
    ├── Each goal has its own best strategy
    ├── 90/10 split when formula applied
    └── Easy reset to exploration mode

QUALITY ASSURANCE
├── 🔒 Protected routes (authentication required)
├── 📈 Custom Opik evaluators (A-F grades)
├── 🧵 Thread evaluation (auto every 5 check-ins)
└── 🔍 Full observability in Opik
```

---

*This document covers all major user scenarios for Resolution Lab.*
