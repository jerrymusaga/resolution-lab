'use client';

import { useState, useEffect } from 'react';
import { useCompletion } from '@ai-sdk/react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getFormulaStatus, FormulaStatus, listGoals, recordCheckIn, trackVoicePlay } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { STRATEGY_INFO, Goal, Outcome } from '@/types';
import {
  Brain,
  Eye,
  Lightbulb,
  Target,
  MessageSquare,
  CheckCircle2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
  Loader2,
  Zap,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  LogIn,
  Clock,
  Rocket,
  Volume2,
  VolumeX,
  Settings2,
  Square,
  Bolt,
  Download,
  PartyPopper,
  Heart
} from 'lucide-react';
import { useTextToSpeech, getAutoPlayPreference, setAutoPlayPreference } from '@/hooks/useTextToSpeech';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AgentStep {
  step: number;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  data?: any;
  isComplete: boolean;
  isActive: boolean;
}

// Strategy icons mapping
const STRATEGY_ICONS: Record<string, string> = {
  gentle_reminder: '🌟',
  accountability: '✅',
  streak_gamification: '🔥',
  social_comparison: '👥',
  loss_aversion: '⚠️',
  reward_preview: '🎁',
  identity_reinforcement: '💪',
  micro_commitment: '🎯',
};

export default function AgentPage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [customGoal, setCustomGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentResponse, setAgentResponse] = useState<any>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([1, 2, 3, 4, 5, 6]));
  const [currentStep, setCurrentStep] = useState(0);

  // Check-in state
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState<boolean | null>(null);
  const [showMicroCommitment, setShowMicroCommitment] = useState(false);
  const [checkInOutcome, setCheckInOutcome] = useState<Outcome | null>(null);

  // Voice state
  const [autoPlayVoice, setAutoPlayVoice] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const { speak, stop, isSpeaking, isSupported: voiceSupported, voices, selectedVoice, setSelectedVoice } = useTextToSpeech({
    rate: 0.95,
    pitch: 1,
  });

  // Formula status
  const [formulaStatus, setFormulaStatus] = useState<FormulaStatus | null>(null);

  // Streaming mode (Vercel AI SDK)
  const [useStreamingMode, setUseStreamingMode] = useState(false);
  const [streamingStrategy, setStreamingStrategy] = useState('gentle_reminder');

  // Use authenticated user ID - require login for this feature
  const userId = user?.id;

  // Vercel AI SDK streaming hook
  const {
    completion: streamingMessage,
    isLoading: isStreaming,
    complete: triggerStreaming,
    error: streamingError,
    setCompletion: setStreamingMessage,
  } = useCompletion({
    api: '/api/chat',
  });

  // Load voice auto-play preference on mount
  useEffect(() => {
    setAutoPlayVoice(getAutoPlayPreference());
  }, []);

  // Auto-play voice when new motivation message arrives
  useEffect(() => {
    if (autoPlayVoice && agentResponse?.action?.message && currentStep === 7 && voiceSupported && userId) {
      // Small delay to let the UI render first
      const timer = setTimeout(() => {
        speak(agentResponse.action.message);
        // Track auto-play for analytics
        if (agentResponse.intervention_id) {
          trackVoicePlay(userId, agentResponse.intervention_id, true).catch(console.error);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [agentResponse?.action?.message, agentResponse?.intervention_id, currentStep, autoPlayVoice, voiceSupported, speak, userId]);

  // Load user's goals on mount (only when authenticated)
  useEffect(() => {
    if (!userId) {
      setGoalsLoading(false);
      return;
    }

    const loadGoals = async () => {
      try {
        setGoalsLoading(true);
        const data = await listGoals(userId);
        const activeGoals = data.filter((g: Goal) => g.status === 'active');
        setGoals(activeGoals);
        if (activeGoals.length > 0) {
          setSelectedGoal(activeGoals[0]);
        }
      } catch (err) {
        console.error('Failed to load goals:', err);
      } finally {
        setGoalsLoading(false);
      }
    };

    loadGoals();
  }, [userId]);

  // Fetch formula status on mount (only when authenticated)
  useEffect(() => {
    if (!userId) return;

    const fetchFormulaStatus = async () => {
      try {
        const status = await getFormulaStatus(userId);
        setFormulaStatus(status);
      } catch (err) {
        console.error('Failed to fetch formula status:', err);
      }
    };
    fetchFormulaStatus();
  }, [userId]);

  const runAgent = async () => {
    if (!userId) {
      setError('Please sign in to use the AI Coach');
      return;
    }

    const goalTitle = selectedGoal?.title || customGoal;
    if (!goalTitle.trim()) {
      setError('Please select a goal or enter a custom one');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setAgentResponse(null);
      setCurrentStep(0);
      setCheckInSuccess(null);

      // Simulate step-by-step progress with visual feedback
      for (let i = 1; i <= 6; i++) {
        setCurrentStep(i);
        await new Promise(r => setTimeout(r, 600));
      }

      const response = await fetch(
        `${API_URL}/api/agent/run?user_id=${userId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goal_title: goalTitle,
            goal_description: selectedGoal?.description || '',
            goal_id: selectedGoal?.id
          })
        }
      );

      if (!response.ok) {
        throw new Error('Agent request failed');
      }

      const data = await response.json();
      setAgentResponse(data.agent_response);
      setCurrentStep(7); // Complete

    } catch (err) {
      console.error('Agent error:', err);
      setError('Failed to get motivation. Make sure backend is running.');
      setCurrentStep(0);
    } finally {
      setLoading(false);
    }
  };

  // Streaming mode - uses Vercel AI SDK for instant response
  const runStreamingMode = async () => {
    if (!userId) {
      setError('Please sign in to use the AI Coach');
      return;
    }

    const goalTitle = selectedGoal?.title || customGoal;
    if (!goalTitle.trim()) {
      setError('Please select a goal or enter a custom one');
      return;
    }

    setError(null);
    setAgentResponse(null);
    setStreamingMessage('');
    setCheckInSuccess(null);
    setCurrentStep(7); // Skip to message display

    // Trigger the streaming completion with body parameters
    await triggerStreaming(goalTitle, {
      body: {
        goalTitle: goalTitle,
        goalDescription: selectedGoal?.description || '',
        strategy: streamingStrategy,
        currentStreak: selectedGoal?.current_streak || 0,
        userId: userId,
        goalId: selectedGoal?.id,
        userName: user?.full_name?.split(' ')[0],
      },
    });
  };

  const handleCheckIn = async (completed: boolean, isMicroCommitment: boolean = false) => {
    if (!userId || !agentResponse?.intervention_id) return;

    // If user said "Not yet" and we haven't shown micro-commitment yet, show it
    if (!completed && !isMicroCommitment && !showMicroCommitment) {
      setShowMicroCommitment(true);
      return;
    }

    try {
      setCheckingIn(true);
      const outcome = await recordCheckIn(userId, {
        intervention_id: agentResponse.intervention_id,
        completed,
        user_feedback: isMicroCommitment ? 'micro_commitment' : undefined,
      });
      setCheckInOutcome(outcome);
      setCheckInSuccess(completed);
      setShowMicroCommitment(false);
    } catch (err) {
      console.error('Check-in failed:', err);
      // Still show success for UX, the data contributes to insights
      setCheckInSuccess(completed);
      setShowMicroCommitment(false);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleMicroCommitmentAccept = () => {
    // Record as completed since they agreed to try the micro version
    handleCheckIn(true, true);
  };

  const handleMicroCommitmentDecline = () => {
    // Record as not completed
    handleCheckIn(false, true);
  };

  const toggleStep = (step: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(step)) {
      newExpanded.delete(step);
    } else {
      newExpanded.add(step);
    }
    setExpandedSteps(newExpanded);
  };

  // Get time-based greeting and context
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { greeting: 'Good morning', emoji: '🌅', message: 'Start your day with purpose' };
    if (hour < 17) return { greeting: 'Good afternoon', emoji: '☀️', message: 'Keep the momentum going' };
    if (hour < 21) return { greeting: 'Good evening', emoji: '🌆', message: 'Finish strong today' };
    return { greeting: 'Working late', emoji: '🌙', message: 'Every step counts' };
  };

  const getStreakMessage = () => {
    const streak = selectedGoal?.current_streak || 0;
    if (streak === 0) return null;
    if (streak >= 7) return { text: `🔥 ${streak}-day streak! You're unstoppable!`, color: 'text-orange-500' };
    if (streak >= 3) return { text: `🔥 ${streak}-day streak! Keep it going!`, color: 'text-amber-500' };
    return { text: `🔥 ${streak}-day streak`, color: 'text-yellow-500' };
  };

  const { greeting, emoji, message: greetingMessage } = getGreeting();
  const streakMessage = getStreakMessage();

  const steps: AgentStep[] = [
    {
      step: 1,
      name: 'OBSERVE',
      description: 'Analyzing your history & patterns',
      icon: <Eye className="w-5 h-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500',
      borderColor: 'border-blue-500',
      data: agentResponse?.thought ? {
        label: 'Gathering context...',
        content: 'Analyzing your check-in history, experiment data, and what motivates you'
      } : null,
      isComplete: currentStep > 1,
      isActive: currentStep === 1
    },
    {
      step: 2,
      name: 'THINK',
      description: 'Understanding what works for you',
      icon: <Brain className="w-5 h-5" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500',
      borderColor: 'border-purple-500',
      data: agentResponse?.thought,
      isComplete: currentStep > 2,
      isActive: currentStep === 2
    },
    {
      step: 3,
      name: 'PLAN',
      description: 'Choosing the best strategy',
      icon: <Target className="w-5 h-5" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-500',
      borderColor: 'border-orange-500',
      data: agentResponse?.plan,
      isComplete: currentStep > 3,
      isActive: currentStep === 3
    },
    {
      step: 4,
      name: 'ACT',
      description: 'Creating your personalized message',
      icon: <MessageSquare className="w-5 h-5" />,
      color: 'text-green-600',
      bgColor: 'bg-green-500',
      borderColor: 'border-green-500',
      data: agentResponse?.action,
      isComplete: currentStep > 4,
      isActive: currentStep === 4
    },
    {
      step: 5,
      name: 'EVALUATE',
      description: 'Checking message quality',
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: 'text-pink-600',
      bgColor: 'bg-pink-500',
      borderColor: 'border-pink-500',
      data: agentResponse?.evaluation,
      isComplete: currentStep > 5,
      isActive: currentStep === 5
    },
    {
      step: 6,
      name: 'LEARN',
      description: 'Improving for next time',
      icon: <BookOpen className="w-5 h-5" />,
      color: 'text-teal-600',
      bgColor: 'bg-teal-500',
      borderColor: 'border-teal-500',
      data: agentResponse ? { logged: true } : null,
      isComplete: currentStep > 6,
      isActive: currentStep === 6
    }
  ];

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!userId) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white mb-6 shadow-lg">
            <Brain className="w-10 h-10" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">AI Motivation Coach</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Get personalized motivation tailored to what works best for you
          </p>
        </div>

        <Card variant="bordered" className="max-w-md mx-auto">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in to continue</h2>
            <p className="text-gray-600 mb-6">
              Sign in to get personalized motivation messages and track your progress over time. Your responses help the AI learn what motivates you best.
            </p>
            <Link href="/login">
              <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Header with Time-based Greeting */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white mb-6 shadow-lg">
          <Brain className="w-10 h-10" />
        </div>
        <div className="mb-3">
          <span className="text-2xl mr-2">{emoji}</span>
          <span className="text-xl text-gray-500">{greeting}, {user?.full_name?.split(' ')[0] || 'there'}!</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">AI Motivation Coach</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {greetingMessage}. Get personalized motivation tailored to what works best for you.
        </p>
        {streakMessage && (
          <p className={cn("text-lg font-semibold mt-2", streakMessage.color)}>
            {streakMessage.text}
          </p>
        )}
      </div>

      {/* Cognitive Loop Visualization - Dark Theme */}
      <div className="mb-10">
        <Card variant="bordered" className="overflow-hidden">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                {/* Center Brain */}
                <div className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500",
                  currentStep > 0 ? "bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/30" : "bg-slate-700"
                )}>
                  <Brain className={cn(
                    "w-12 h-12 transition-all",
                    currentStep > 0 ? "text-white" : "text-slate-500"
                  )} />
                  {loading && currentStep > 0 && currentStep < 7 && (
                    <div className="absolute inset-0 rounded-full border-4 border-purple-400/30 border-t-purple-400 animate-spin" />
                  )}
                </div>
              </div>
            </div>

            {/* Steps in a row */}
            <div className="flex justify-center items-center gap-2 flex-wrap">
              {steps.map((step, index) => (
                <div key={step.step} className="flex items-center">
                  <div className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300",
                    step.isComplete && "bg-white/10",
                    step.isActive && "bg-white/20 ring-2 ring-white/50 scale-110",
                    !step.isComplete && !step.isActive && "opacity-40"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                      step.isComplete || step.isActive ? step.bgColor : "bg-slate-600"
                    )}>
                      {step.isActive && loading ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      ) : (
                        <span className="text-white">{step.icon}</span>
                      )}
                    </div>
                    <span className={cn(
                      "text-sm font-medium hidden sm:inline",
                      step.isComplete || step.isActive ? "text-white" : "text-slate-500"
                    )}>
                      {step.name}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight className={cn(
                      "w-4 h-4 mx-1 hidden sm:block",
                      currentStep > index + 1 ? "text-white/60" : "text-slate-600"
                    )} />
                  )}
                </div>
              ))}
            </div>

            {/* Status message */}
            <div className="text-center mt-6">
              {currentStep === 0 && !loading && (
                <p className="text-slate-400">Select a goal and click "Get Motivation" to start</p>
              )}
              {loading && currentStep > 0 && currentStep < 7 && (
                <p className="text-white animate-pulse">
                  {steps[currentStep - 1]?.description}...
                </p>
              )}
              {currentStep === 7 && (
                <div className="flex items-center justify-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Your motivation is ready!</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Formula Status Banner */}
      {formulaStatus?.formula_applied && formulaStatus.preferred_strategy && (
        <Card variant="bordered" className="mb-4 bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-100 rounded-full">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-800">Your Motivation Formula is Active</p>
                  <p className="text-sm text-emerald-600">
                    Using{' '}
                    <span className="font-bold">
                      {STRATEGY_ICONS[formulaStatus.preferred_strategy]}{' '}
                      {STRATEGY_INFO[formulaStatus.preferred_strategy as keyof typeof STRATEGY_INFO]?.name || formulaStatus.preferred_strategy}
                    </span>{' '}
                    - your most effective strategy
                  </p>
                </div>
              </div>
              <Link
                href="/insights"
                className="text-sm text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <Sparkles className="w-4 h-4" />
                View Insights
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Formula Banner - Encourage to experiment */}
      {formulaStatus && !formulaStatus.formula_applied && formulaStatus.ready_to_apply && (
        <Card variant="bordered" className="mb-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-100 rounded-full">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-amber-800">Your Motivation Formula is Ready!</p>
                  <p className="text-sm text-amber-600">
                    We found that{' '}
                    <span className="font-bold">
                      {STRATEGY_ICONS[formulaStatus.best_strategy || '']}{' '}
                      {STRATEGY_INFO[formulaStatus.best_strategy as keyof typeof STRATEGY_INFO]?.name || formulaStatus.best_strategy}
                    </span>{' '}
                    works best for you. Apply it to get better results!
                  </p>
                </div>
              </div>
              <Link
                href="/insights"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium flex items-center gap-1"
              >
                <Zap className="w-4 h-4" />
                Apply Formula
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goal Selection Section */}
      <Card variant="bordered" className="mb-8 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-indigo-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            What do you need motivation for?
          </h2>
        </div>
        <CardContent className="pt-6">
          {/* Goal Selection */}
          {goalsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : goals.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {goals.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => {
                      setSelectedGoal(goal);
                      setCustomGoal('');
                    }}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      selectedGoal?.id === goal.id
                        ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20"
                        : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        selectedGoal?.id === goal.id ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-500"
                      )}>
                        <Target className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-semibold truncate",
                          selectedGoal?.id === goal.id ? "text-indigo-900" : "text-gray-900"
                        )}>
                          {goal.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {goal.current_streak || 0} day streak
                        </p>
                      </div>
                      {selectedGoal?.id === goal.id && (
                        <CheckCircle2 className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or enter a custom goal</span>
                </div>
              </div>

              <Input
                value={customGoal}
                onChange={(e) => {
                  setCustomGoal(e.target.value);
                  if (e.target.value) setSelectedGoal(null);
                }}
                placeholder="E.g., Finish my project presentation"
                className={cn(customGoal && "ring-2 ring-indigo-500")}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-gray-500 mb-4">You don't have any active goals yet</p>
                <Link href="/goals/new">
                  <Button variant="outline">
                    <Target className="w-4 h-4 mr-2" />
                    Create Your First Goal
                  </Button>
                </Link>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or try with a custom goal</span>
                </div>
              </div>

              <Input
                value={customGoal}
                onChange={(e) => setCustomGoal(e.target.value)}
                placeholder="E.g., Exercise for 30 minutes"
              />
            </div>
          )}

          {/* Mode Toggle */}
          <div className="mt-6 mb-4">
            <div className="flex items-center justify-center gap-2 p-1 bg-gray-100 rounded-lg max-w-md mx-auto">
              <button
                onClick={() => setUseStreamingMode(false)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                  !useStreamingMode
                    ? "bg-white shadow text-indigo-700"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <Brain className="w-4 h-4" />
                Full Agent
              </button>
              <button
                onClick={() => setUseStreamingMode(true)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                  useStreamingMode
                    ? "bg-white shadow text-amber-700"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <Bolt className="w-4 h-4" />
                Quick Stream
              </button>
            </div>
            <p className="text-center text-xs text-gray-500 mt-2">
              {useStreamingMode
                ? "Instant streaming response powered by Vercel AI SDK"
                : "Full 6-step agent reasoning with detailed insights"}
            </p>
          </div>

          {/* Strategy Selection (only for streaming mode) */}
          {useStreamingMode && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Strategy</label>
              <select
                value={streamingStrategy}
                onChange={(e) => setStreamingStrategy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900"
              >
                <option value="gentle_reminder">Gentle Reminder</option>
                <option value="accountability">Accountability</option>
                <option value="streak_gamification">Streak Gamification</option>
                <option value="social_comparison">Social Comparison</option>
                <option value="loss_aversion">Loss Aversion</option>
                <option value="reward_preview">Reward Preview</option>
                <option value="identity_reinforcement">Identity Reinforcement</option>
                <option value="micro_commitment">Micro Commitment</option>
              </select>
            </div>
          )}

          {/* Get Motivation Button */}
          <div className="flex justify-center">
            <Button
              onClick={useStreamingMode ? runStreamingMode : runAgent}
              isLoading={loading || isStreaming}
              size="lg"
              disabled={!selectedGoal && !customGoal.trim()}
              className={cn(
                "w-full sm:w-auto",
                useStreamingMode
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              )}
            >
              {loading || isStreaming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {useStreamingMode ? 'Streaming...' : 'Generating...'}
                </>
              ) : (
                <>
                  {useStreamingMode ? <Bolt className="w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {useStreamingMode ? 'Get Instant Motivation' : 'Get Motivation'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {(error || streamingError) && (
        <Card variant="bordered" className="mb-6 border-red-200 bg-red-50">
          <CardContent className="flex items-center space-x-3 pt-6">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error || streamingError?.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Streaming Message Display (Vercel AI SDK) */}
      {useStreamingMode && (streamingMessage || isStreaming) && (
        <Card variant="bordered" className="mb-8 overflow-hidden border-0 shadow-xl">
          <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium">
                <Bolt className="w-4 h-4" />
                {isStreaming ? 'Streaming...' : 'Instant Motivation'}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <p className="text-xl text-gray-900 font-medium leading-relaxed text-center min-h-[60px]">
                {streamingMessage ? `"${streamingMessage}"` : (
                  <span className="flex items-center justify-center gap-2 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating your motivation...
                  </span>
                )}
              </p>

              {streamingMessage && !isStreaming && (
                <div className="flex flex-col items-center gap-3 mt-4">
                  {/* Strategy badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full">
                    <span className="text-lg">{STRATEGY_ICONS[streamingStrategy]}</span>
                    <span className="text-sm font-semibold text-amber-700">
                      {STRATEGY_INFO[streamingStrategy as keyof typeof STRATEGY_INFO]?.name || streamingStrategy.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Voice Play Button */}
                  {voiceSupported && (
                    <button
                      onClick={() => {
                        if (isSpeaking) {
                          stop();
                        } else {
                          speak(streamingMessage);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-all",
                        isSpeaking
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                      )}
                    >
                      {isSpeaking ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          Listen
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Powered by badge */}
            <div className="text-center mt-4">
              <span className="text-xs text-white/70">
                Powered by Vercel AI SDK + Opik Observability
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* The Generated Message - Featured prominently (Full Agent Mode) */}
      {!useStreamingMode && agentResponse?.action?.message && currentStep === 7 && (
        <Card variant="bordered" className="mb-8 overflow-hidden border-0 shadow-xl">
          <div className="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium">
                <MessageSquare className="w-4 h-4" />
                Your Personalized Motivation
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <p className="text-xl text-gray-900 font-medium leading-relaxed text-center">
                "{agentResponse.action.message}"
              </p>

              <div className="flex flex-col items-center gap-3 mt-4">
                {/* Strategy badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full">
                  <span className="text-lg">{STRATEGY_ICONS[agentResponse.action.strategy_used]}</span>
                  <span className="text-sm font-semibold text-emerald-700">
                    {STRATEGY_INFO[agentResponse.action.strategy_used as keyof typeof STRATEGY_INFO]?.name || agentResponse.plan?.chosen_strategy}
                  </span>
                </div>

                {/* Voice Play Button */}
                {voiceSupported && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (isSpeaking) {
                          stop();
                        } else {
                          speak(agentResponse.action.message);
                          // Track manual play for analytics
                          if (userId && agentResponse.intervention_id) {
                            trackVoicePlay(userId, agentResponse.intervention_id, false).catch(console.error);
                          }
                        }
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-all",
                        isSpeaking
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                      )}
                      title={isSpeaking ? "Stop" : "Play voice"}
                    >
                      {isSpeaking ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          Listen
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                      className={cn(
                        "p-1.5 rounded-full transition-colors",
                        showVoiceSettings ? "bg-gray-200 text-gray-700" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      )}
                      title="Voice settings"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Voice Settings Panel */}
              {showVoiceSettings && voiceSupported && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Voice Settings</span>
                    <button
                      onClick={() => setShowVoiceSettings(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Auto-play toggle */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      {autoPlayVoice ? (
                        <Volume2 className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <VolumeX className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-600">Auto-play voice</span>
                    </div>
                    <button
                      onClick={() => {
                        const newValue = !autoPlayVoice;
                        setAutoPlayVoice(newValue);
                        setAutoPlayPreference(newValue);
                      }}
                      className={cn(
                        "relative w-11 h-6 rounded-full transition-colors",
                        autoPlayVoice ? "bg-indigo-600" : "bg-gray-300"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
                          autoPlayVoice && "translate-x-5"
                        )}
                      />
                    </button>
                  </div>

                  {/* Voice selection */}
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Voice</label>
                    <select
                      value={selectedVoice?.name || ''}
                      onChange={(e) => {
                        const voice = voices.find(v => v.name === e.target.value);
                        if (voice) setSelectedVoice(voice);
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {voices.filter(v => v.lang.startsWith('en')).map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Check-in Response */}
            {agentResponse?.intervention_id && checkInSuccess === null && !showMicroCommitment && (
              <div className="mt-6 text-center">
                <p className="text-white/90 mb-4">Did this motivation help you take action?</p>
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={() => handleCheckIn(true)}
                    disabled={checkingIn}
                    className="bg-white text-green-600 hover:bg-green-50"
                  >
                    {checkingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
                    Yes, I did it!
                  </Button>
                  <Button
                    onClick={() => handleCheckIn(false)}
                    disabled={checkingIn}
                    variant="outline"
                    className="border-white/50 text-white hover:bg-white/10"
                  >
                    <ThumbsDown className="w-4 h-4 mr-2" />
                    Not yet
                  </Button>
                </div>
              </div>
            )}

            {/* Micro-commitment Prompt */}
            {showMicroCommitment && checkInSuccess === null && (
              <div className="mt-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-400 rounded-full mb-4">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    How about just 2 minutes?
                  </h3>
                  <p className="text-white/80 mb-6 max-w-md mx-auto">
                    Sometimes starting is the hardest part. Can you commit to just 2 minutes?
                    That's all it takes to build momentum.
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-3">
                    <Button
                      onClick={handleMicroCommitmentAccept}
                      disabled={checkingIn}
                      className="bg-amber-400 text-amber-900 hover:bg-amber-300"
                    >
                      {checkingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
                      I'll try 2 minutes!
                    </Button>
                    <Button
                      onClick={handleMicroCommitmentDecline}
                      disabled={checkingIn}
                      variant="outline"
                      className="border-white/50 text-white hover:bg-white/10"
                    >
                      Not today
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Check-in Success */}
            {checkInSuccess !== null && (
              <div className="mt-6">
                {/* Celebration Image */}
                {checkInOutcome?.celebration_image && (
                  <div className="mb-6 flex justify-center">
                    <div className="relative max-w-sm">
                      <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white/30">
                        <img
                          src={`data:image/png;base64,${checkInOutcome.celebration_image}`}
                          alt={checkInSuccess ? "Celebration" : "Encouragement"}
                          className="w-full h-auto"
                        />
                      </div>
                      {/* Image info badges */}
                      <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                        {checkInOutcome.celebration_image_grade && (
                          <div className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-bold shadow-lg",
                            checkInOutcome.celebration_image_grade === 'A' ? "bg-green-500 text-white" :
                            checkInOutcome.celebration_image_grade === 'B' ? "bg-blue-500 text-white" :
                            checkInOutcome.celebration_image_grade === 'C' ? "bg-yellow-500 text-white" :
                            "bg-gray-500 text-white"
                          )}>
                            AI Grade: {checkInOutcome.celebration_image_grade}
                          </div>
                        )}
                        {checkInOutcome.celebration_image_category && (
                          <div className="px-2.5 py-1 rounded-full text-xs font-medium bg-black/50 text-white backdrop-blur-sm">
                            {checkInOutcome.celebration_image_category}
                          </div>
                        )}
                      </div>
                      {/* Download button */}
                      <button
                        onClick={() => {
                          if (checkInOutcome?.celebration_image) {
                            const link = document.createElement('a');
                            link.href = `data:image/png;base64,${checkInOutcome.celebration_image}`;
                            link.download = `resolution-lab-${checkInSuccess ? 'celebration' : 'encouragement'}-${Date.now()}.png`;
                            link.click();
                          }
                        }}
                        className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-white text-gray-700 rounded-full text-xs font-medium shadow-lg transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Save
                      </button>
                    </div>
                  </div>
                )}

                {/* Success Message */}
                <div className="text-center">
                  <div className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full",
                    checkInSuccess ? "bg-white text-green-600" : "bg-white/20 text-white"
                  )}>
                    {checkInSuccess ? <PartyPopper className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                    {checkInSuccess ? "Great job! Your progress has been recorded." : "No worries! Every day is a new opportunity."}
                  </div>
                  <p className="text-white/80 text-sm mt-2">
                    This helps us learn what motivates you best
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Agent Workflow - Detailed Steps (Collapsed by default after response) */}
      {(currentStep > 0 || agentResponse) && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary-600" />
            How the AI Reasoned
            <span className="text-sm font-normal text-gray-500">(click to expand)</span>
          </h2>

          {steps.map((step) => (
            <Card
              key={step.step}
              variant="bordered"
              className={cn(
                'transition-all duration-300 overflow-hidden',
                step.isActive && 'ring-2 ring-offset-2 shadow-lg',
                step.isActive && step.borderColor,
                step.isComplete && 'bg-gray-50/50'
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-between p-4 cursor-pointer transition-colors",
                  step.data && "hover:bg-gray-50"
                )}
                onClick={() => step.data && toggleStep(step.step)}
              >
                <div className="flex items-center space-x-4">
                  {/* Step indicator */}
                  <div className="relative">
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center text-white transition-all shadow-md',
                      step.isComplete ? step.bgColor :
                      step.isActive ? `${step.bgColor} animate-pulse shadow-lg` :
                      'bg-gray-300'
                    )}>
                      {step.isActive && loading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        step.icon
                      )}
                    </div>
                    {step.isComplete && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Step name and description */}
                  <div>
                    <h3 className={cn(
                      'font-bold text-lg flex items-center gap-2',
                      step.isComplete || step.isActive ? 'text-gray-900' : 'text-gray-400'
                    )}>
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        step.isComplete || step.isActive ? `${step.bgColor} text-white` : "bg-gray-200 text-gray-500"
                      )}>
                        {step.step}
                      </span>
                      {step.name}
                    </h3>
                    <p className={cn(
                      "text-sm",
                      step.isComplete || step.isActive ? 'text-gray-600' : 'text-gray-400'
                    )}>
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Expand/collapse */}
                {step.data && (
                  <div className={cn("transition-colors", step.color)}>
                    {expandedSteps.has(step.step) ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                )}
              </div>

              {/* Expanded content */}
              {step.data && expandedSteps.has(step.step) && (
                <div className="px-4 pb-4 pt-0 ml-16">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 text-sm border border-gray-200">
                    {/* THINK step */}
                    {step.step === 2 && step.data.observation && (
                      <div className="space-y-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-100">
                          <span className="font-semibold text-purple-700 flex items-center gap-2 mb-2">
                            <Eye className="w-4 h-4" />
                            Observation
                          </span>
                          <p className="text-gray-700">{step.data.observation}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-100">
                          <span className="font-semibold text-purple-700 flex items-center gap-2 mb-2">
                            <Brain className="w-4 h-4" />
                            Analysis
                          </span>
                          <p className="text-gray-700">{step.data.analysis}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-100">
                          <span className="font-semibold text-purple-700 flex items-center gap-2 mb-2">
                            <Lightbulb className="w-4 h-4" />
                            Hypothesis
                          </span>
                          <p className="text-gray-700">{step.data.hypothesis}</p>
                        </div>
                      </div>
                    )}

                    {/* PLAN step */}
                    {step.step === 3 && step.data.chosen_strategy && (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
                          <span className="font-semibold text-orange-700 mb-2 block">Chosen Strategy</span>
                          <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full font-bold shadow-md">
                            {STRATEGY_ICONS[step.data.chosen_strategy]} {step.data.chosen_strategy}
                          </span>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-100">
                          <span className="font-semibold text-orange-700 mb-2 block">Reasoning</span>
                          <p className="text-gray-700">{step.data.reasoning}</p>
                        </div>
                      </div>
                    )}

                    {/* ACT step */}
                    {step.step === 4 && step.data.message && (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
                          <p className="text-green-900 text-lg font-medium leading-relaxed">"{step.data.message}"</p>
                        </div>
                      </div>
                    )}

                    {/* EVALUATE step */}
                    {step.step === 5 && step.data.overall_score !== undefined && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { label: 'Quality', value: step.data.quality_score },
                            { label: 'Relevance', value: step.data.relevance_score },
                            { label: 'Personalization', value: step.data.personalization_score },
                            { label: 'Overall', value: step.data.overall_score, highlight: true },
                          ].map((metric) => (
                            <div key={metric.label} className={cn(
                              "bg-white rounded-lg p-4 border",
                              metric.highlight ? "border-emerald-200 bg-emerald-50" : "border-gray-100"
                            )}>
                              <span className="text-sm font-medium text-gray-600 block mb-2">{metric.label}</span>
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={cn("h-2 rounded-full", metric.highlight ? "bg-emerald-500" : "bg-pink-500")}
                                    style={{ width: `${(metric.value || 0) * 100}%` }}
                                  />
                                </div>
                                <span className="text-sm font-bold text-gray-700">{((metric.value || 0) * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* LEARN step */}
                    {step.step === 6 && step.data.logged && (
                      <div className="flex items-center space-x-3 text-teal-700 bg-teal-50 rounded-lg p-4 border border-teal-200">
                        <CheckCircle2 className="w-6 h-6" />
                        <span className="font-medium">Your response will help improve future recommendations</span>
                      </div>
                    )}

                    {/* OBSERVE step placeholder */}
                    {step.step === 1 && step.data.label && (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <p className="text-blue-700">{step.data.content}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Initial State - How it works */}
      {!agentResponse && !loading && currentStep === 0 && (
        <Card variant="bordered" className="mt-8 bg-gradient-to-br from-slate-50 to-gray-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              How Your AI Coach Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm mb-6">
              Your AI coach uses a 6-step reasoning process to create motivation that's personalized to what works for you:
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {steps.map((step) => (
                <div key={step.step} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-100">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0", step.bgColor)}>
                    {step.icon}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900 text-sm">{step.name}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <p className="text-sm text-indigo-700">
                <strong>Tip:</strong> The more you use the coach and respond to check-ins, the better it learns what motivates you.
                Check your <Link href="/insights" className="underline font-medium">Insights</Link> to see your motivation patterns.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
