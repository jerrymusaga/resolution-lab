// Resolution Lab - TypeScript Types
// These match the backend Pydantic schemas

// ===================
// Enums
// ===================

export type GoalFrequency = 'daily' | 'weekly' | 'custom';

export type GoalStatus = 'active' | 'completed' | 'abandoned' | 'paused';

export type InterventionStrategy = 
  | 'gentle_reminder'
  | 'accountability'
  | 'streak_gamification'
  | 'social_comparison'
  | 'loss_aversion'
  | 'reward_preview'
  | 'identity_reinforcement'
  | 'micro_commitment';

export type UserSentiment = 'positive' | 'neutral' | 'negative';

// ===================
// Goal Types
// ===================

export interface GoalCreate {
  title: string;
  description?: string;
  frequency: GoalFrequency;
  target_count: number;
  start_date?: string;
  end_date?: string;
}

export interface GoalUpdate {
  title?: string;
  description?: string;
  status?: GoalStatus;
  end_date?: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  frequency: GoalFrequency;
  target_count: number;
  start_date: string;
  end_date?: string;
  status: GoalStatus;
  created_at: string;
  current_streak?: number;
  total_completions?: number;
  completion_rate?: number;
}

// ===================
// Intervention Types
// ===================

export interface InterventionResponse {
  intervention_id: string;
  goal_title: string;
  strategy: InterventionStrategy;
  message: string;
  sent_at: string;
}

export interface Intervention {
  id: string;
  user_id: string;
  goal_id: string;
  strategy: InterventionStrategy;
  message: string;
  sent_at: string;
  opik_trace_id?: string;
}

// ===================
// Outcome Types
// ===================

export interface OutcomeCreate {
  intervention_id: string;
  completed: boolean;
  user_feedback?: string;
}

export interface Outcome {
  id: string;
  intervention_id: string;
  user_id: string;
  goal_id: string;
  completed: boolean;
  response_time_seconds?: number;
  user_feedback?: string;
  recorded_at: string;
}

// ===================
// Insights Types
// ===================

export interface StrategyStats {
  strategy: InterventionStrategy;
  total_interventions: number;
  successful_completions: number;
  completion_rate: number;
  avg_response_time_seconds?: number;
  effectiveness_score: number;
}

export interface UserInsights {
  user_id: string;
  total_goals: number;
  active_goals: number;
  overall_completion_rate: number;
  strategy_stats: StrategyStats[];
  best_strategy?: InterventionStrategy;
  worst_strategy?: InterventionStrategy;
  recommendation: string;
  experiment_phase: 'exploring' | 'optimizing';
  strategies_tested: number;
  data_points_collected: number;
}

export interface StrategyComparison {
  strategy: InterventionStrategy;
  strategy_name: string;
  completion_rate: number;
  effectiveness_score: number;
  sample_size: number;
  confidence: 'none' | 'insufficient' | 'low' | 'medium' | 'high';
}

export interface InsightsComparison {
  comparison: StrategyComparison[];
  experiment_phase: 'exploring' | 'optimizing';
  total_data_points: number;
}

export interface InsightsSummary {
  data_points: number;
  strategies_tested: number;
  experiment_phase: 'exploring' | 'optimizing';
  best_strategy?: {
    name: string;
    completion_rate: number;
    improvement_vs_worst?: number;
  };
  ready_for_optimization: boolean;
}

// ===================
// API Response Types
// ===================

export interface APIResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface SimulationResult {
  simulations: Array<{
    iteration: number;
    strategy: InterventionStrategy;
    completed: boolean;
    effectiveness: number;
  }>;
  insights: {
    user_id: string;
    strategy_stats: Array<{
      strategy: string;
      total_interventions: number;
      successful_completions: number;
      completion_rate: number;
      effectiveness_score: number;
    }>;
    best_strategy?: string;
    worst_strategy?: string;
    experiment_phase: string;
    total_interventions: number;
    strategies_tested: number;
  };
}

// ===================
// Strategy Info
// ===================

export interface StrategyInfo {
  name: string;
  description: string;
  example: string;
}

export const STRATEGY_INFO: Record<InterventionStrategy, StrategyInfo> = {
  gentle_reminder: {
    name: 'Gentle Reminder',
    description: 'Warm, friendly nudges that don\'t pressure',
    example: 'Hey! Just a friendly reminder about your goal today 🌟',
  },
  accountability: {
    name: 'Direct Accountability',
    description: 'Clear, direct check-ins asking if you did the thing',
    example: 'Did you complete your goal today? Yes or No?',
  },
  streak_gamification: {
    name: 'Streak & Gamification',
    description: 'Focus on maintaining streaks and progress',
    example: '🔥 Day 5 streak! Don\'t break the chain.',
  },
  social_comparison: {
    name: 'Social Proof',
    description: 'Compare to what others like you are doing',
    example: '73% of similar users completed their goal today.',
  },
  loss_aversion: {
    name: 'Loss Framing',
    description: 'Highlight what you might lose by skipping',
    example: 'You\'ll lose your 5-day progress if you skip today.',
  },
  reward_preview: {
    name: 'Reward Preview',
    description: 'Focus on the benefits and rewards ahead',
    example: 'Complete today and you\'re 20% closer to your target!',
  },
  identity_reinforcement: {
    name: 'Identity-Based',
    description: 'Connect the action to who you\'re becoming',
    example: 'You\'re becoming someone who exercises daily.',
  },
  micro_commitment: {
    name: 'Micro-Commitment',
    description: 'Ask for just a tiny, easy commitment',
    example: 'Can you commit to just 5 minutes? That\'s all.',
  },
};
