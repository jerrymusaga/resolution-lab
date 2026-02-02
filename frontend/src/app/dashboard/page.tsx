'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, Button } from '@/components/ui';
import GoalCard from '@/components/GoalCard';
import CheckInModal from '@/components/CheckInModal';
import ProtectedRoute from '@/components/ProtectedRoute';
import StreakCalendar from '@/components/StreakCalendar';
import {
  listGoalsWithCheckInStatus,
  generateIntervention,
  recordCheckIn,
  getInsightsSummary,
  pauseGoal,
  resumeGoal,
  completeGoal,
  deleteGoal
} from '@/lib/api';
import { GoalWithCheckInStatus, InterventionResponse, InsightsSummary, Outcome } from '@/types';
import { cn, formatPercent } from '@/lib/utils';
import {
  Plus,
  Target,
  TrendingUp,
  FlaskConical,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Trophy,
  Brain,
  Rocket,
  ChevronRight,
  Zap,
  BarChart3,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

function DashboardContent() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<GoalWithCheckInStatus[]>([]);
  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  // Check-in modal state
  const [checkInGoalId, setCheckInGoalId] = useState<string | null>(null);
  const [currentIntervention, setCurrentIntervention] = useState<InterventionResponse | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);

  // Use authenticated user ID
  const userId = user?.id || '';

  useEffect(() => {
    if (userId) {
      loadData(userId);
    }
  }, [userId]);

  const loadData = async (uid: string, showLoadingSpinner = true) => {
    try {
      // Only show loading spinner for initial load, not background refreshes
      if (showLoadingSpinner) {
        setLoading(true);
      }
      setError(null);

      const [goalsData, summaryData] = await Promise.all([
        listGoalsWithCheckInStatus(uid).catch(() => []),
        getInsightsSummary(uid).catch(() => null),
      ]);

      setGoals(goalsData);
      setSummary(summaryData);

      // Show welcome for new users
      if (goalsData.length === 0 && !summaryData?.data_points) {
        setShowWelcome(true);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to connect to backend. Make sure the server is running on localhost:8000');
    } finally {
      if (showLoadingSpinner) {
        setLoading(false);
      }
    }
  };

  const handleCheckIn = async (goalId: string) => {
    try {
      setCheckInGoalId(goalId);
      setCheckInLoading(true);

      const intervention = await generateIntervention(userId, goalId);
      setCurrentIntervention(intervention);
    } catch (err) {
      console.error('Failed to generate intervention:', err);
      setError('Failed to generate check-in. Please try again.');
      setCheckInGoalId(null);
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckInSubmit = async (completed: boolean, feedback?: string): Promise<Outcome | null> => {
    if (!currentIntervention) return null;

    try {
      setCheckInLoading(true);

      const outcome = await recordCheckIn(userId, {
        intervention_id: currentIntervention.intervention_id,
        completed,
        user_feedback: feedback,
      });

      // Refresh data in background without showing loading spinner
      // This prevents the modal from being unmounted during the refresh
      loadData(userId, false);

      return outcome;
    } catch (err) {
      console.error('Failed to record check-in:', err);
      // Return a minimal outcome so the modal can still show feedback
      // even if image generation failed
      return {
        id: crypto.randomUUID(),
        intervention_id: currentIntervention.intervention_id,
        user_id: userId,
        goal_id: checkInGoalId || '',
        completed,
        recorded_at: new Date().toISOString(),
      } as Outcome;
    } finally {
      setCheckInLoading(false);
    }
  };

  const handlePauseGoal = async (goalId: string) => {
    try {
      await pauseGoal(userId, goalId);
      await loadData(userId);
    } catch (err) {
      console.error('Failed to pause goal:', err);
    }
  };

  const handleResumeGoal = async (goalId: string) => {
    try {
      await resumeGoal(userId, goalId);
      await loadData(userId);
    } catch (err) {
      console.error('Failed to resume goal:', err);
    }
  };

  const handleCompleteGoal = async (goalId: string) => {
    try {
      await completeGoal(userId, goalId);
      await loadData(userId);
    } catch (err) {
      console.error('Failed to complete goal:', err);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
      await deleteGoal(userId, goalId);
      await loadData(userId);
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const hasDiscovery = summary?.ready_for_optimization && summary?.best_strategy;
  const progressPercent = Math.min(((summary?.data_points || 0) / 20) * 100, 100);

  // Loading state with branded animation
  if (loading) {
    return (
      <div className="page-container">
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
            <FlaskConical className="w-8 h-8 text-brand-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-6 text-surface-600 animate-pulse">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container bg-mesh min-h-screen">
      {/* Error message */}
      {error && (
        <div className="mb-6 bg-danger-50 border border-danger-200 rounded-2xl p-4 flex items-start space-x-3 shadow-soft-sm">
          <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-danger-800 font-medium">Connection Error</p>
            <p className="text-danger-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Welcome Hero for New Users */}
      {showWelcome && (
        <Card variant="bordered" className="mb-8 overflow-hidden border-0 shadow-soft-xl">
          <div className="relative bg-gradient-hero text-white">
            <div className="absolute inset-0 bg-mesh-pattern opacity-30" />

            <div className="relative px-8 py-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm mb-6 shadow-soft-lg">
                <Rocket className="w-10 h-10" />
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold mb-4">
                Welcome to Resolution Lab
              </h1>
              <p className="text-xl text-white/90 mb-2 max-w-2xl mx-auto">
                Your personal AI-powered motivation experiment starts now
              </p>
              <p className="text-white/70 max-w-xl mx-auto mb-8">
                We'll test 8 different motivation strategies to discover what actually works for YOU - backed by data, not guesswork.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/goals/new">
                  <Button size="lg" className="bg-white text-brand-700 hover:bg-white/90 shadow-soft-lg">
                    <Plus className="w-5 h-5 mr-2" />
                    Create Your First Goal
                  </Button>
                </Link>
                <Link href="/experiment">
                  <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10">
                    See How It Works
                  </Button>
                </Link>
              </div>

              <button
                onClick={() => setShowWelcome(false)}
                className="mt-6 text-sm text-white/60 hover:text-white/80 underline transition-colors"
              >
                Dismiss welcome message
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-brand-600" />
            Dashboard
          </h1>
          <p className="text-surface-500 mt-1">Track your goals and discover what motivates you</p>
        </div>
        <Link href="/goals/new">
          <Button className="mt-4 sm:mt-0 bg-brand-600 hover:bg-brand-700 shadow-soft-sm">
            <Plus className="w-4 h-4 mr-2" />
            New Goal
          </Button>
        </Link>
      </div>

      {/* Discovery Hero - When Formula is Found */}
      {hasDiscovery && (
        <Card variant="bordered" className="mb-8 overflow-hidden border-0 shadow-soft-xl">
          <div className="relative bg-gradient-to-r from-accent-500 via-accent-600 to-accent-700">
            <div className="absolute inset-0 bg-black/5" />

            <div className="relative px-6 py-8 sm:px-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-soft-md">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-white">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-5 h-5 text-yellow-300" />
                      <span className="text-sm font-medium text-white/90 uppercase tracking-wider">Formula Discovered</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold">
                      {summary.best_strategy?.name}
                    </h2>
                    <p className="text-white/80 mt-1">
                      works best for you with <span className="font-bold text-white">{formatPercent(summary.best_strategy?.completion_rate || 0)}</span> success rate
                      {summary.best_strategy?.improvement_vs_worst && (
                        <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-sm">
                          +{summary.best_strategy.improvement_vs_worst.toFixed(0)}% vs worst
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <Link href="/insights">
                  <Button className="bg-white text-accent-700 hover:bg-white/90 shadow-soft-md whitespace-nowrap">
                    View Full Insights
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Active Goals */}
        <Card variant="bordered" className="bg-gradient-to-br from-brand-50 to-brand-100/50 border-brand-200/50 hover:shadow-soft-md transition-all duration-200">
          <CardContent className="py-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center shadow-soft-xs">
                <Target className="w-6 h-6 text-brand-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-surface-900">{activeGoals.length}</p>
                <p className="text-sm text-surface-600">Active Goals</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Experiments Run */}
        <Card variant="bordered" className="bg-gradient-to-br from-purple-50 to-violet-100/50 border-purple-200/50 hover:shadow-soft-md transition-all duration-200">
          <CardContent className="py-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center shadow-soft-xs">
                <FlaskConical className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-surface-900">{summary?.data_points || 0}</p>
                <p className="text-sm text-surface-600">Experiments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Strategies Tested */}
        <Card variant="bordered" className="bg-gradient-to-br from-warning-50 to-orange-100/50 border-warning-200/50 hover:shadow-soft-md transition-all duration-200">
          <CardContent className="py-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning-100 flex items-center justify-center shadow-soft-xs">
                <Brain className="w-6 h-6 text-warning-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-surface-900">
                  {summary?.strategies_tested || 0}<span className="text-lg text-surface-400">/8</span>
                </p>
                <p className="text-sm text-surface-600">Strategies</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Phase */}
        <Card variant="bordered" className={cn(
          "hover:shadow-soft-md transition-all duration-200",
          summary?.experiment_phase === 'optimizing'
            ? 'bg-gradient-to-br from-accent-50 to-accent-100/50 border-accent-200/50'
            : 'bg-gradient-to-br from-cyan-50 to-sky-100/50 border-cyan-200/50'
        )}>
          <CardContent className="py-5">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shadow-soft-xs",
                summary?.experiment_phase === 'optimizing' ? 'bg-accent-100' : 'bg-cyan-100'
              )}>
                {summary?.experiment_phase === 'optimizing' ? (
                  <Rocket className="w-6 h-6 text-accent-600" />
                ) : (
                  <FlaskConical className="w-6 h-6 text-cyan-600" />
                )}
              </div>
              <div>
                <p className={cn(
                  "text-lg font-bold",
                  summary?.experiment_phase === 'optimizing' ? 'text-accent-700' : 'text-cyan-700'
                )}>
                  {summary?.experiment_phase === 'optimizing' ? 'Optimizing' : 'Exploring'}
                </p>
                <p className="text-sm text-surface-600">Current Phase</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Streak Calendar */}
      {userId && (
        <div className="mb-8">
          <StreakCalendar userId={userId} days={35} />
        </div>
      )}

      {/* Progress to Discovery - Only show when not yet discovered */}
      {!hasDiscovery && (summary?.data_points || 0) > 0 && (
        <Card variant="bordered" className="mb-8 bg-gradient-to-r from-brand-50 via-purple-50 to-accent-50 border-brand-200/50 shadow-soft-sm">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-14 h-14 rounded-xl bg-white shadow-soft-sm flex items-center justify-center flex-shrink-0">
                  <Zap className="w-7 h-7 text-brand-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-surface-900 mb-1">Discovering Your Formula...</h3>
                  <p className="text-sm text-surface-600 mb-3">
                    {20 - (summary?.data_points || 0) > 0
                      ? `${20 - (summary?.data_points || 0)} more check-ins until we find your optimal strategy`
                      : 'Almost there! Keep going to unlock insights'
                    }
                  </p>
                  <div className="relative">
                    <div className="h-3 bg-white rounded-full overflow-hidden shadow-inner-soft">
                      <div
                        className="h-full bg-gradient-to-r from-brand-500 via-purple-500 to-accent-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-surface-500">{summary?.data_points || 0} experiments</span>
                      <span className="text-xs text-surface-500">20 for discovery</span>
                    </div>
                  </div>
                </div>
              </div>
              <Link href="/insights" className="flex-shrink-0">
                <Button variant="outline" size="sm" className="border-brand-200 text-brand-700 hover:bg-brand-50">
                  Preview Insights
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goals Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-brand-600" />
            Your Goals
          </h2>
          <Link href="/goals" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors">
            View all
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {activeGoals.length === 0 ? (
          <Card variant="bordered" className="text-center py-16 bg-surface-50/50 border-surface-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-100 mb-4">
              <Target className="w-8 h-8 text-surface-400" />
            </div>
            <h3 className="text-xl font-semibold text-surface-900 mb-2">No active goals yet</h3>
            <p className="text-surface-500 mb-6 max-w-sm mx-auto">
              Create your first goal to start experimenting and discover what motivates you
            </p>
            <Link href="/goals/new">
              <Button className="bg-brand-600 hover:bg-brand-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Goal
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {activeGoals.slice(0, 4).map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                userId={userId}
                onCheckIn={goal.can_check_in ? handleCheckIn : undefined}
                onPause={handlePauseGoal}
                onResume={handleResumeGoal}
                onComplete={handleCompleteGoal}
                onDelete={handleDeleteGoal}
                checkedInToday={goal.checked_in_today}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* Try Simulation */}
        <Link href="/experiment" className="block">
          <Card variant="bordered" className="h-full hover:shadow-soft-md hover:border-brand-200 transition-all duration-200 cursor-pointer group">
            <CardContent className="py-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-soft-xs">
                <FlaskConical className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-surface-900 group-hover:text-brand-600 transition-colors">
                  Try Simulation
                </h3>
                <p className="text-sm text-surface-500">See how experiments work</p>
              </div>
              <ChevronRight className="w-5 h-5 text-surface-300 ml-auto group-hover:text-brand-500 group-hover:translate-x-1 transition-all duration-200" />
            </CardContent>
          </Card>
        </Link>

        {/* View Insights */}
        <Link href="/insights" className="block">
          <Card variant="bordered" className="h-full hover:shadow-soft-md hover:border-brand-200 transition-all duration-200 cursor-pointer group">
            <CardContent className="py-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-100 to-teal-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-soft-xs">
                <TrendingUp className="w-6 h-6 text-accent-600" />
              </div>
              <div>
                <h3 className="font-semibold text-surface-900 group-hover:text-brand-600 transition-colors">
                  View Insights
                </h3>
                <p className="text-sm text-surface-500">See your experiment results</p>
              </div>
              <ChevronRight className="w-5 h-5 text-surface-300 ml-auto group-hover:text-brand-500 group-hover:translate-x-1 transition-all duration-200" />
            </CardContent>
          </Card>
        </Link>

        {/* AI Agent Demo */}
        <Link href="/agent" className="block sm:col-span-2 lg:col-span-1">
          <Card variant="bordered" className="h-full hover:shadow-soft-md hover:border-brand-200 transition-all duration-200 cursor-pointer group">
            <CardContent className="py-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-100 to-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-soft-xs">
                <Brain className="w-6 h-6 text-brand-600" />
              </div>
              <div>
                <h3 className="font-semibold text-surface-900 group-hover:text-brand-600 transition-colors">
                  AI Coach
                </h3>
                <p className="text-sm text-surface-500">Watch the 6-step cognitive loop</p>
              </div>
              <ChevronRight className="w-5 h-5 text-surface-300 ml-auto group-hover:text-brand-500 group-hover:translate-x-1 transition-all duration-200" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Experiment CTA - Only for users with no data and can check in */}
      {(summary?.data_points || 0) === 0 && activeGoals.length > 0 && activeGoals.some(g => g.can_check_in) && (
        <Card variant="bordered" className="bg-gradient-to-br from-warning-50 to-orange-50 border-warning-200/50 shadow-soft-sm">
          <CardContent className="py-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-warning-100 mb-4 shadow-soft-xs">
              <Clock className="w-7 h-7 text-warning-600" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 mb-2">
              Ready for Your First Check-in?
            </h3>
            <p className="text-surface-600 mb-4 max-w-md mx-auto">
              Each check-in is an experiment. We'll try different motivation strategies and track what works best for you.
            </p>
            <Button
              className="bg-brand-600 hover:bg-brand-700"
              onClick={() => {
                const firstAvailable = activeGoals.find(g => g.can_check_in);
                if (firstAvailable) handleCheckIn(firstAvailable.id);
              }}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Start First Check-in
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Check-in Modal */}
      {checkInGoalId && currentIntervention && (
        <CheckInModal
          intervention={currentIntervention}
          onSubmit={handleCheckInSubmit}
          onClose={() => {
            setCheckInGoalId(null);
            setCurrentIntervention(null);
          }}
          isLoading={checkInLoading}
        />
      )}

      {/* Loading overlay for check-in generation */}
      {checkInGoalId && !currentIntervention && checkInLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card variant="elevated" className="p-8 text-center max-w-sm mx-4 shadow-soft-2xl">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="w-16 h-16 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              <Brain className="w-6 h-6 text-brand-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <h3 className="font-semibold text-surface-900 mb-1">AI is thinking...</h3>
            <p className="text-surface-500 text-sm">Crafting a personalized message just for you</p>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
