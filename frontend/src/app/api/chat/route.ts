/**
 * Resolution Lab - Streaming Chat API Route
 *
 * Uses Vercel AI SDK for streaming responses with Google Gemini.
 * Logs traces to Opik via the backend for observability.
 * Now includes deep personalization using user history and patterns.
 */

import { google } from '@ai-sdk/google';
import { streamText, generateText } from 'ai';
import { NextRequest } from 'next/server';

// Strategy descriptions for prompt engineering
const STRATEGY_PROMPTS: Record<string, string> = {
  gentle_reminder: `You are a friendly, supportive coach. Generate a warm, gentle reminder about the user's goal.
Keep it light and encouraging. Use a friendly emoji if appropriate.
Maximum 2 sentences.`,

  accountability: `You are a direct accountability partner. Ask the user clearly and directly if they completed their goal.
Be respectful but firm. Request a clear Yes/No response.
Maximum 2 sentences.`,

  streak_gamification: `You are a gamification coach focused on streaks and progress.
Emphasize the user's current streak and the importance of not breaking it.
Use fire/streak emojis. Make it feel like a game.
Maximum 2 sentences.`,

  social_comparison: `You are sharing social proof and comparison data.
Mention that a percentage of similar users completed their goal today (use a realistic percentage like 65-80%).
Make the user feel they can be part of the successful group.
Maximum 2 sentences.`,

  loss_aversion: `You are highlighting what the user might lose if they skip today.
Frame the message around potential loss of progress, momentum, or their streak.
Be motivating through the fear of loss, but not harsh.
Maximum 2 sentences.`,

  reward_preview: `You are focusing on the rewards and benefits of completing the goal.
Paint a picture of how good they'll feel or what progress they'll make.
Make the reward tangible and immediate.
Maximum 2 sentences.`,

  identity_reinforcement: `You are reinforcing the user's identity as someone who achieves this goal.
Use phrases like "You're becoming someone who..." or "This is who you are now."
Connect the action to their identity transformation.
Maximum 2 sentences.`,

  micro_commitment: `You are asking for a tiny, minimal commitment.
Ask if they can commit to just 5 minutes or the smallest possible version of their goal.
Make it feel easy and achievable.
Maximum 2 sentences.`,
};

// Base system prompt
const BASE_SYSTEM_PROMPT = `You are Resolution Lab, an AI coach helping users achieve their goals.
Your task is to generate a short, personalized motivation message.

Rules:
1. Be concise - maximum 2 sentences
2. Be personal - use "you" language
3. Match the strategy style exactly
4. Reference the specific goal naturally
5. Current time awareness - if morning, afternoon, or evening, acknowledge it subtly
6. Never be preachy or lecture the user
7. Sound human, not robotic

Output ONLY the message text, nothing else.`;

// User context type from backend
interface UserContext {
  personalization_context: string;
  formula_applied: boolean;
  preferred_strategy: string | null;
  goal_formula_applied: boolean;
  goal_preferred_strategy: string | null;
  momentum: string;
  emotional_state: string;
  best_strategy: string | null;
  best_strategy_rate: number;
  overall_completion_rate: number;
  is_new_user: boolean;
  best_day_of_week: string | null;
  worst_day_of_week: string | null;
}

// Fetch rich user context from backend
async function fetchUserContext(params: {
  userId: string;
  goalId: string;
  goalTitle: string;
  goalDescription?: string;
  currentStreak: number;
  userName?: string;
  timeOfDay: string;
}): Promise<UserContext | null> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  try {
    const response = await fetch(`${API_URL}/api/interventions/user-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: params.userId,
        goal_id: params.goalId,
        goal_title: params.goalTitle,
        goal_description: params.goalDescription,
        current_streak: params.currentStreak,
        user_name: params.userName,
        time_of_day: params.timeOfDay,
      }),
    });

    if (response.ok) {
      return await response.json();
    }
    console.error('Failed to fetch user context:', response.status);
    return null;
  } catch (error) {
    console.error('Error fetching user context:', error);
    return null;
  }
}

// Build personalized system prompt
function buildPersonalizedSystemPrompt(userContext: UserContext | null): string {
  if (!userContext || !userContext.personalization_context) {
    return BASE_SYSTEM_PROMPT;
  }

  return `${BASE_SYSTEM_PROMPT}

PERSONALIZATION CONTEXT (Use this to make your message deeply personal):
${userContext.personalization_context}`;
}

// Helper to get time of day
function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// Log to Opik via backend
async function logToOpik(params: {
  userId: string;
  goalId?: string;
  goalTitle: string;
  strategy: string;
  message: string;
  threadId?: string;
}) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  try {
    await fetch(`${API_URL}/api/interventions/log-streaming`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: params.userId,
        goal_id: params.goalId,
        goal_title: params.goalTitle,
        strategy: params.strategy,
        message: params.message,
        thread_id: params.threadId,
        source: 'vercel-ai-sdk',
      }),
    });
  } catch (error) {
    console.error('Failed to log to Opik:', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
      return new Response(JSON.stringify({
        error: 'AI service not configured',
        details: 'GOOGLE_GENERATIVE_AI_API_KEY environment variable is missing',
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      goalTitle,
      goalDescription,
      strategy: requestedStrategy = 'gentle_reminder',
      currentStreak = 0,
      userId,
      goalId,
      userName,
      stream = true,
    } = body;

    if (!goalTitle) {
      return new Response(JSON.stringify({ error: 'Goal title is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const timeOfDay = getTimeOfDay();

    // Fetch rich user context from backend (includes formula status)
    let userContext: UserContext | null = null;
    let effectiveStrategy = requestedStrategy;
    let formulaActive = false;

    if (userId && goalId) {
      userContext = await fetchUserContext({
        userId,
        goalId,
        goalTitle,
        goalDescription,
        currentStreak,
        userName,
        timeOfDay,
      });

      if (userContext) {
        // Check if a formula is applied (goal-level takes priority over user-level)
        if (userContext.goal_formula_applied && userContext.goal_preferred_strategy) {
          // 90% use goal's preferred strategy, 10% explore
          if (Math.random() < 0.9) {
            effectiveStrategy = userContext.goal_preferred_strategy;
            formulaActive = true;
            console.log(`Using goal formula strategy: ${effectiveStrategy}`);
          }
        } else if (userContext.formula_applied && userContext.preferred_strategy) {
          // 90% use user's preferred strategy, 10% explore
          if (Math.random() < 0.9) {
            effectiveStrategy = userContext.preferred_strategy;
            formulaActive = true;
            console.log(`Using user formula strategy: ${effectiveStrategy}`);
          }
        }
      }
    }

    // Build the strategy-specific prompt
    const strategyInstruction = STRATEGY_PROMPTS[effectiveStrategy] || STRATEGY_PROMPTS.gentle_reminder;

    // Build context - now includes personalization
    const contextParts = [`Goal: ${goalTitle}`];
    if (goalDescription) contextParts.push(`Description: ${goalDescription}`);
    if (currentStreak > 0) contextParts.push(`Current streak: ${currentStreak} days`);
    if (userName) contextParts.push(`User's name: ${userName}`);
    contextParts.push(`Time of day: ${timeOfDay}`);

    // Add momentum and emotional state context if available
    if (userContext) {
      if (userContext.momentum !== 'neutral') {
        contextParts.push(`User momentum: ${userContext.momentum}`);
      }
      if (userContext.emotional_state !== 'neutral') {
        contextParts.push(`Emotional state: ${userContext.emotional_state}`);
      }
    }

    const context = contextParts.join('\n');

    const userPrompt = `Strategy to use:
${strategyInstruction}

Context:
${context}

Generate the intervention message now:`;

    // Build personalized system prompt
    const systemPrompt = buildPersonalizedSystemPrompt(userContext);

    // Thread ID for Opik grouping
    const threadId = goalId ? `goal_${goalId}` : undefined;

    if (stream) {
      // Use Vercel AI SDK for streaming
      console.log(`Starting streaming with Gemini (strategy: ${effectiveStrategy}, formula: ${formulaActive})...`);
      const result = streamText({
        model: google('gemini-1.5-flash'),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        onFinish: async ({ text }) => {
          console.log('Streaming finished, text:', text);
          // Log to Opik after streaming completes
          if (userId && text) {
            await logToOpik({
              userId,
              goalId,
              goalTitle,
              strategy: effectiveStrategy,
              message: text,
              threadId,
            });
          }
        },
      });

      return result.toTextStreamResponse();
    } else {
      // Non-streaming mode
      const result = await generateText({
        model: google('gemini-1.5-flash'),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      });

      // Log to Opik
      if (userId) {
        await logToOpik({
          userId,
          goalId,
          goalTitle,
          strategy: effectiveStrategy,
          message: result.text,
          threadId,
        });
      }

      return new Response(JSON.stringify({
        message: result.text,
        strategy: effectiveStrategy,
        formulaActive,
        metadata: {
          goalTitle,
          currentStreak,
          timeOfDay,
          momentum: userContext?.momentum,
          emotionalState: userContext?.emotional_state,
        },
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to generate motivation',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
