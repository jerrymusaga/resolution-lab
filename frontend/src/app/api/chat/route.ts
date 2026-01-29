/**
 * Resolution Lab - Streaming Chat API Route
 *
 * Uses Vercel AI SDK for streaming responses with Google Gemini.
 * Logs traces to Opik via the backend for observability.
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

const SYSTEM_PROMPT = `You are Resolution Lab, an AI coach helping users achieve their goals.
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
    const body = await req.json();
    const {
      goalTitle,
      goalDescription,
      strategy = 'gentle_reminder',
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

    // Build the strategy-specific prompt
    const strategyInstruction = STRATEGY_PROMPTS[strategy] || STRATEGY_PROMPTS.gentle_reminder;
    const timeOfDay = getTimeOfDay();

    // Build context
    const contextParts = [`Goal: ${goalTitle}`];
    if (goalDescription) contextParts.push(`Description: ${goalDescription}`);
    if (currentStreak > 0) contextParts.push(`Current streak: ${currentStreak} days`);
    if (userName) contextParts.push(`User's name: ${userName}`);
    contextParts.push(`Time of day: ${timeOfDay}`);

    const context = contextParts.join('\n');

    const userPrompt = `Strategy to use:
${strategyInstruction}

Context:
${context}

Generate the intervention message now:`;

    // Thread ID for Opik grouping
    const threadId = goalId ? `goal_${goalId}` : undefined;

    if (stream) {
      // Use Vercel AI SDK for streaming
      const result = streamText({
        model: google('gemini-2.0-flash-exp'),
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.7,
        onFinish: async ({ text }) => {
          // Log to Opik after streaming completes
          if (userId) {
            await logToOpik({
              userId,
              goalId,
              goalTitle,
              strategy,
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
        model: google('gemini-2.0-flash-exp'),
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.7,
      });

      // Log to Opik
      if (userId) {
        await logToOpik({
          userId,
          goalId,
          goalTitle,
          strategy,
          message: result.text,
          threadId,
        });
      }

      return new Response(JSON.stringify({
        message: result.text,
        strategy,
        metadata: {
          goalTitle,
          currentStreak,
          timeOfDay,
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
