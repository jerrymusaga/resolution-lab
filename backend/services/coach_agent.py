"""
Resolution Lab - AI Coach Agent

An autonomous agent that observes, thinks, plans, acts, and learns.
Every step is traced in Opik for full observability.

This is the KEY DIFFERENTIATOR for the hackathon - it shows:
1. True agentic behavior (not just an LLM wrapper)
2. Deep Opik integration with nested traces
3. Use of Opik Experiments for A/B testing
4. LLM-as-judge evaluation
"""

import opik
from opik import track
from opik.evaluation import metrics
import litellm
from typing import Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from enum import Enum
import json
import random

from models.schemas import InterventionStrategy, STRATEGY_DESCRIPTIONS
from services.experiment_engine import experiment_engine
from services.evaluators import comprehensive_evaluator


class AgentThought(BaseModel):
    """Structured thought from the agent's reasoning"""
    observation: str
    analysis: str
    hypothesis: str
    confidence: float  # 0-1


class AgentPlan(BaseModel):
    """The agent's planned action"""
    chosen_strategy: InterventionStrategy
    reasoning: str
    expected_effectiveness: float
    alternative_strategies: list[InterventionStrategy]
    personalization_notes: str


class AgentAction(BaseModel):
    """The agent's executed action"""
    message: str
    strategy_used: InterventionStrategy
    tone: str
    estimated_impact: float


class AgentEvaluation(BaseModel):
    """Self-evaluation of the agent's output"""
    quality_score: float  # 0-1
    relevance_score: float  # 0-1
    personalization_score: float  # 0-1
    overall_score: float  # 0-1
    improvement_suggestions: list[str]
    # Custom evaluator scores (new)
    strategy_alignment_score: Optional[float] = None
    motivation_effectiveness_score: Optional[float] = None
    tone_consistency_score: Optional[float] = None
    evaluator_grade: Optional[str] = None  # A, B, C, D, F


class CoachAgentResponse(BaseModel):
    """Complete response from the AI Coach Agent"""
    thought: AgentThought
    plan: AgentPlan
    action: AgentAction
    evaluation: AgentEvaluation
    opik_trace_id: Optional[str] = None


class AICoachAgent:
    """
    Autonomous AI Coach Agent that runs a full reasoning loop.
    
    The agent follows a cognitive architecture:
    OBSERVE → THINK → PLAN → ACT → EVALUATE → LEARN
    
    Every step is traced in Opik for full observability.
    """
    
    def __init__(self, model: str = "gemini/gemini-1.5-flash"):
        self.model = model
        self.agent_name = "ResolutionCoach"
        self.agent_version = "1.0.0"
    
    @track(name="agent_full_loop", tags=["agent", "coach"])
    async def run(
        self,
        user_id: str,
        goal_title: str,
        goal_description: str = "",
        user_history: Optional[dict] = None
    ) -> CoachAgentResponse:
        """
        Run the complete agent loop.
        
        This is the main entry point - it orchestrates all agent steps
        and creates a parent trace in Opik that contains all child traces.
        """
        
        # Get user's experiment data
        insights = experiment_engine.get_user_insights(user_id)
        
        # Step 1: OBSERVE - Gather and structure observations
        observation = await self._observe(user_id, goal_title, insights, user_history)
        
        # Step 2: THINK - Reason about the observations
        thought = await self._think(observation, goal_title, insights)
        
        # Step 3: PLAN - Decide on strategy
        plan = await self._plan(thought, goal_title, goal_description, insights)
        
        # Step 4: ACT - Generate the intervention
        action = await self._act(plan, goal_title, goal_description, thought)
        
        # Step 5: EVALUATE - Self-assess the output
        evaluation = await self._evaluate(action, plan, goal_title)
        
        # Step 6: LEARN - Update internal models (logged for Opik)
        await self._learn(user_id, plan.chosen_strategy, evaluation)
        
        return CoachAgentResponse(
            thought=thought,
            plan=plan,
            action=action,
            evaluation=evaluation
        )
    
    @track(name="agent_observe", tags=["agent", "observe"])
    async def _observe(
        self,
        user_id: str,
        goal_title: str,
        insights: dict,
        user_history: Optional[dict]
    ) -> dict:
        """
        OBSERVE: Gather and structure all relevant information.
        
        This step collects:
        - User's historical performance
        - Strategy effectiveness data
        - Recent patterns
        - Contextual factors
        """
        
        # Structure the observation
        observation = {
            "user_id": user_id,
            "goal": goal_title,
            "timestamp": datetime.utcnow().isoformat(),
            "experiment_phase": insights.get("experiment_phase", "exploring"),
            "total_data_points": insights.get("total_interventions", 0),
            "strategies_tested": insights.get("strategies_tested", 0),
            "best_strategy": insights.get("best_strategy"),
            "worst_strategy": insights.get("worst_strategy"),
            "overall_completion_rate": insights.get("overall_completion_rate", 0),
            "strategy_performance": {
                stat["strategy"]: {
                    "completion_rate": stat["completion_rate"],
                    "effectiveness": stat["effectiveness_score"],
                    "sample_size": stat["total_interventions"]
                }
                for stat in insights.get("strategy_stats", [])
            },
            "user_history": user_history or {},
            "context": {
                "day_of_week": datetime.utcnow().strftime("%A"),
                "time_of_day": self._get_time_of_day(),
                "is_weekend": datetime.utcnow().weekday() >= 5
            }
        }
        
        # Log observation to Opik
        opik.track_current().log_output(observation)
        
        return observation
    
    @track(name="agent_think", tags=["agent", "think", "reasoning"])
    async def _think(
        self,
        observation: dict,
        goal_title: str,
        insights: dict
    ) -> AgentThought:
        """
        THINK: Reason about the observations using LLM.
        
        This step performs Chain-of-Thought reasoning to:
        - Analyze patterns in user behavior
        - Form hypotheses about what motivates this user
        - Consider contextual factors
        """
        
        prompt = f"""You are an AI coach analyzing a user's motivation patterns.

OBSERVATIONS:
- Goal: {goal_title}
- Experiment phase: {observation['experiment_phase']}
- Data points collected: {observation['total_data_points']}
- Overall success rate: {observation['overall_completion_rate']:.1%}
- Best performing strategy: {observation['best_strategy'] or 'Not yet determined'}
- Worst performing strategy: {observation['worst_strategy'] or 'Not yet determined'}
- Day: {observation['context']['day_of_week']}
- Time: {observation['context']['time_of_day']}

STRATEGY PERFORMANCE:
{json.dumps(observation['strategy_performance'], indent=2)}

Think step by step:
1. What patterns do you observe in this user's responses?
2. What might explain why certain strategies work better?
3. What hypothesis can you form about this user's motivation style?

Respond in JSON format:
{{
    "observation": "What you notice about the data",
    "analysis": "Your interpretation of the patterns",
    "hypothesis": "Your theory about what motivates this user",
    "confidence": 0.0-1.0
}}"""

        try:
            response = await litellm.acompletion(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.7
            )
            
            result = json.loads(response.choices[0].message.content)
            thought = AgentThought(**result)
            
        except Exception as e:
            # Fallback reasoning
            thought = AgentThought(
                observation=f"User has {observation['total_data_points']} data points across {observation['strategies_tested']} strategies",
                analysis=f"Best strategy so far: {observation['best_strategy'] or 'Still exploring'}",
                hypothesis="Need more data to form reliable hypothesis" if observation['total_data_points'] < 10 else "User responds well to their best strategy",
                confidence=min(observation['total_data_points'] / 20, 0.9)
            )
        
        # Log thought process to Opik
        opik.track_current().log_output(thought.model_dump())
        
        return thought
    
    @track(name="agent_plan", tags=["agent", "plan", "strategy"])
    async def _plan(
        self,
        thought: AgentThought,
        goal_title: str,
        goal_description: str,
        insights: dict
    ) -> AgentPlan:
        """
        PLAN: Decide on the intervention strategy.
        
        Uses the multi-armed bandit algorithm informed by reasoning.
        """
        
        # Get strategy from bandit algorithm
        strategy_result = experiment_engine.select_strategy(
            user_id="planning",  # Placeholder for planning phase
            goal_id="planning"
        )
        chosen_strategy = InterventionStrategy(strategy_result["strategy"])
        
        # Generate planning reasoning with LLM
        prompt = f"""You are planning a motivation intervention.

USER ANALYSIS:
{thought.model_dump_json(indent=2)}

GOAL: {goal_title}
{f"DESCRIPTION: {goal_description}" if goal_description else ""}

ALGORITHM SUGGESTION: {chosen_strategy.value}

Available strategies and their descriptions:
{json.dumps({s.value: STRATEGY_DESCRIPTIONS[s] for s in InterventionStrategy}, indent=2)}

Create a plan. Respond in JSON:
{{
    "chosen_strategy": "{chosen_strategy.value}",
    "reasoning": "Why this strategy fits this user and moment",
    "expected_effectiveness": 0.0-1.0,
    "alternative_strategies": ["strategy1", "strategy2"],
    "personalization_notes": "Specific things to include in the message"
}}"""

        try:
            response = await litellm.acompletion(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.7
            )
            
            result = json.loads(response.choices[0].message.content)
            # Ensure chosen_strategy matches what we selected
            result["chosen_strategy"] = chosen_strategy.value
            result["alternative_strategies"] = [
                s for s in result.get("alternative_strategies", [])
                if s in [st.value for st in InterventionStrategy]
            ][:2]
            
            plan = AgentPlan(
                chosen_strategy=InterventionStrategy(result["chosen_strategy"]),
                reasoning=result.get("reasoning", "Based on experiment data"),
                expected_effectiveness=float(result.get("expected_effectiveness", 0.5)),
                alternative_strategies=[InterventionStrategy(s) for s in result.get("alternative_strategies", [])],
                personalization_notes=result.get("personalization_notes", "")
            )
            
        except Exception as e:
            plan = AgentPlan(
                chosen_strategy=chosen_strategy,
                reasoning=f"Selected based on multi-armed bandit algorithm ({strategy_result.get('reason', 'exploration')})",
                expected_effectiveness=0.5,
                alternative_strategies=[],
                personalization_notes="Focus on the goal and user's progress"
            )
        
        # Log plan to Opik
        opik.track_current().log_output(plan.model_dump())
        
        return plan
    
    @track(name="agent_act", tags=["agent", "act", "generation"])
    async def _act(
        self,
        plan: AgentPlan,
        goal_title: str,
        goal_description: str,
        thought: AgentThought
    ) -> AgentAction:
        """
        ACT: Generate the intervention message.
        
        Creates a personalized message based on the plan.
        """
        
        strategy_desc = STRATEGY_DESCRIPTIONS.get(
            plan.chosen_strategy,
            "A helpful motivation message"
        )
        
        prompt = f"""Generate a motivation message for someone working on their goal.

GOAL: {goal_title}
{f"DESCRIPTION: {goal_description}" if goal_description else ""}

STRATEGY: {plan.chosen_strategy.value}
STRATEGY DESCRIPTION: {strategy_desc}

PERSONALIZATION NOTES: {plan.personalization_notes}

USER INSIGHT: {thought.hypothesis}

Guidelines:
- Keep it to 2-3 sentences max
- Be warm and encouraging
- Match the strategy's approach
- Make it feel personal, not generic
- Don't be preachy or condescending

Respond in JSON:
{{
    "message": "Your motivation message here",
    "tone": "The emotional tone (encouraging/direct/playful/etc)",
    "estimated_impact": 0.0-1.0
}}"""

        try:
            response = await litellm.acompletion(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.8
            )
            
            result = json.loads(response.choices[0].message.content)
            action = AgentAction(
                message=result.get("message", "Time to work on your goal! You've got this."),
                strategy_used=plan.chosen_strategy,
                tone=result.get("tone", "encouraging"),
                estimated_impact=float(result.get("estimated_impact", 0.5))
            )
            
        except Exception as e:
            # Fallback message
            fallback_messages = {
                InterventionStrategy.GENTLE_REMINDER: f"Hey! Just a friendly reminder about {goal_title}. No pressure, just checking in! 🌟",
                InterventionStrategy.ACCOUNTABILITY: f"Quick check-in: Did you make progress on {goal_title} today?",
                InterventionStrategy.STREAK_GAMIFICATION: f"Keep that momentum going! Every day you work on {goal_title} builds your streak. 🔥",
                InterventionStrategy.SOCIAL_COMPARISON: f"Others working on similar goals are making progress today. Join them!",
                InterventionStrategy.LOSS_AVERSION: f"Don't let today slip by without working on {goal_title}. You've come too far!",
                InterventionStrategy.REWARD_PREVIEW: f"Imagine how great you'll feel after completing {goal_title}. That feeling is within reach!",
                InterventionStrategy.IDENTITY_REINFORCEMENT: f"You're becoming someone who prioritizes {goal_title}. That's who you are now.",
                InterventionStrategy.MICRO_COMMITMENT: f"Can you commit to just 5 minutes on {goal_title}? That's all it takes to start."
            }
            
            action = AgentAction(
                message=fallback_messages.get(plan.chosen_strategy, f"Time to work on {goal_title}!"),
                strategy_used=plan.chosen_strategy,
                tone="encouraging",
                estimated_impact=0.5
            )
        
        # Log action to Opik
        opik.track_current().log_output(action.model_dump())
        
        return action
    
    @track(name="agent_evaluate", tags=["agent", "evaluate", "llm-judge", "custom-evaluators"])
    async def _evaluate(
        self,
        action: AgentAction,
        plan: AgentPlan,
        goal_title: str
    ) -> AgentEvaluation:
        """
        EVALUATE: Self-assess the quality of the generated output.

        Uses a two-stage evaluation:
        1. Custom Opik evaluators (fast, rule-based scoring)
        2. LLM-as-judge pattern (deep, contextual scoring)

        This demonstrates advanced Opik integration with custom evaluators.
        """

        # ========================================
        # Stage 1: Custom Opik Evaluators (NEW!)
        # ========================================
        # Run comprehensive evaluation using our custom evaluators
        custom_eval_result = await comprehensive_evaluator.evaluate(
            message=action.message,
            strategy=plan.chosen_strategy,
            goal_title=goal_title,
            user_context=None  # Could pass user stats here
        )

        # Extract custom evaluator scores
        custom_scores = custom_eval_result.get("individual_scores", {})
        strategy_alignment = custom_scores.get("strategy_alignment", 0.5)
        motivation_effectiveness = custom_scores.get("motivation_effectiveness", 0.5)
        personalization = custom_scores.get("personalization", 0.5)
        tone_consistency = custom_scores.get("tone_consistency", 0.5)
        evaluator_grade = custom_eval_result.get("grade", "C")

        # Log custom evaluator results to Opik
        opik.track_current().log_output({
            "custom_evaluators": custom_eval_result,
            "stage": "custom_evaluators"
        })

        # ========================================
        # Stage 2: LLM-as-Judge (Deep Evaluation)
        # ========================================
        prompt = f"""Evaluate this motivation message as an impartial judge.

GOAL: {goal_title}
INTENDED STRATEGY: {plan.chosen_strategy.value}
REASONING: {plan.reasoning}

GENERATED MESSAGE: "{action.message}"
TONE: {action.tone}

CUSTOM EVALUATOR SCORES (for context):
- Strategy Alignment: {strategy_alignment:.2f}
- Motivation Effectiveness: {motivation_effectiveness:.2f}
- Personalization: {personalization:.2f}
- Tone Consistency: {tone_consistency:.2f}

Score each dimension from 0.0 to 1.0:

1. QUALITY: Is the message well-written, clear, and appropriate?
2. RELEVANCE: Does it relate to the goal and user's situation?
3. PERSONALIZATION: Does it feel personal rather than generic?
4. STRATEGY_FIT: Does it match the intended strategy?

Respond in JSON:
{{
    "quality_score": 0.0-1.0,
    "relevance_score": 0.0-1.0,
    "personalization_score": 0.0-1.0,
    "strategy_fit_score": 0.0-1.0,
    "overall_score": 0.0-1.0,
    "improvement_suggestions": ["suggestion1", "suggestion2"]
}}"""

        try:
            response = await litellm.acompletion(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.3  # Lower temp for more consistent judging
            )

            result = json.loads(response.choices[0].message.content)

            # Combine LLM scores with custom evaluator scores
            llm_quality = float(result.get("quality_score", 0.7))
            llm_relevance = float(result.get("relevance_score", 0.7))
            llm_personalization = float(result.get("personalization_score", 0.6))
            llm_overall = float(result.get("overall_score", 0.7))

            # Calculate final scores: blend custom evaluators (40%) + LLM judge (60%)
            final_personalization = (personalization * 0.4) + (llm_personalization * 0.6)
            final_overall = (custom_eval_result.get("overall_score", 0.5) * 0.4) + (llm_overall * 0.6)

            # Merge improvement suggestions from both sources
            llm_suggestions = result.get("improvement_suggestions", [])[:2]
            custom_suggestions = custom_eval_result.get("top_suggestions", [])[:2]
            all_suggestions = list(set(llm_suggestions + custom_suggestions))[:5]

            evaluation = AgentEvaluation(
                quality_score=llm_quality,
                relevance_score=llm_relevance,
                personalization_score=round(final_personalization, 3),
                overall_score=round(final_overall, 3),
                improvement_suggestions=all_suggestions,
                # Custom evaluator fields (NEW!)
                strategy_alignment_score=round(strategy_alignment, 3),
                motivation_effectiveness_score=round(motivation_effectiveness, 3),
                tone_consistency_score=round(tone_consistency, 3),
                evaluator_grade=evaluator_grade
            )

        except Exception as e:
            # Fallback: use custom evaluator scores only
            evaluation = AgentEvaluation(
                quality_score=0.7,
                relevance_score=0.7,
                personalization_score=round(personalization, 3),
                overall_score=round(custom_eval_result.get("overall_score", 0.6), 3),
                improvement_suggestions=custom_eval_result.get("top_suggestions", ["LLM evaluation failed"])[:3],
                strategy_alignment_score=round(strategy_alignment, 3),
                motivation_effectiveness_score=round(motivation_effectiveness, 3),
                tone_consistency_score=round(tone_consistency, 3),
                evaluator_grade=evaluator_grade
            )

        # Log combined evaluation metrics to Opik
        opik.track_current().log_output({
            "evaluation": evaluation.model_dump(),
            "pass_threshold": evaluation.overall_score >= 0.6,
            "custom_evaluator_grade": evaluator_grade,
            "evaluation_method": "hybrid_custom_plus_llm"
        })

        return evaluation
    
    @track(name="agent_learn", tags=["agent", "learn", "update"])
    async def _learn(
        self,
        user_id: str,
        strategy: InterventionStrategy,
        evaluation: AgentEvaluation
    ) -> None:
        """
        LEARN: Update internal models based on evaluation.
        
        This step logs learning signals for future improvement.
        In a production system, this would update model weights or prompts.
        """
        
        learning_signal = {
            "user_id": user_id,
            "strategy": strategy.value,
            "evaluation_score": evaluation.overall_score,
            "timestamp": datetime.utcnow().isoformat(),
            "should_adjust_prompt": evaluation.overall_score < 0.6,
            "improvement_areas": evaluation.improvement_suggestions,
            "action": "logged_for_future_training"
        }
        
        # Log learning to Opik for future analysis
        opik.track_current().log_output(learning_signal)
    
    def _get_time_of_day(self) -> str:
        """Get time of day category"""
        hour = datetime.utcnow().hour
        if 5 <= hour < 12:
            return "morning"
        elif 12 <= hour < 17:
            return "afternoon"
        elif 17 <= hour < 21:
            return "evening"
        else:
            return "night"


# Global agent instance
coach_agent = AICoachAgent()
