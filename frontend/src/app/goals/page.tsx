'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@/components/ui';
import GoalCard from '@/components/GoalCard';
import CheckInModal from '@/components/CheckInModal';
import ReminderBanner from '@/components/ReminderBanner';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import {
  listGoalsWithCheckInStatus,
  generateIntervention,
  recordCheckIn,
  pauseGoal,
  resumeGoal,
  completeGoal,
  deleteGoal
} from '@/lib/api';
import { GoalWithCheckInStatus, InterventionResponse, Outcome } from '@/types';
import { Plus, Target, Filter, Brain, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterStatus = 'all' | 'active' | 'paused' | 'completed';

function GoalsContent() {
  const { user } = useAuth();
  const userId = user?.id || '';

  const [goals, setGoals] = useState<GoalWithCheckInStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');

  // Check-in modal state
  const [checkInGoalId, setCheckInGoalId] = useState<string | null>(null);
  const [currentIntervention, setCurrentIntervention] = useState<InterventionResponse | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadGoals(userId, true);
    }
  }, [userId]);

  const loadGoals = async (uid: string, showLoading = false) => {
    try {
      // Only show loading skeleton on initial load, not on refresh after actions
      if (showLoading) {
        setLoading(true);
      }
      const data = await listGoalsWithCheckInStatus(uid);
      setGoals(data);
    } catch (err) {
      console.error('Failed to load goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (goalId: string) => {
    try {
      setCheckInGoalId(goalId);
      setCheckInLoading(true);
      setCheckInError(null);
      const intervention = await generateIntervention(userId, goalId);
      setCurrentIntervention(intervention);
    } catch (err) {
      console.error('Failed to generate intervention:', err);
      setCheckInError('Failed to generate check-in. Please try again.');
      setCheckInGoalId(null);
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckInSubmit = async (completed: boolean, feedback?: string): Promise<Outcome | null> => {
    if (!currentIntervention) return null;

    try {
      setCheckInLoading(true);
      setCheckInError(null);
      const outcome = await recordCheckIn(userId, {
        intervention_id: currentIntervention.intervention_id,
        completed,
        user_feedback: feedback,
      });
      // Don't close modal immediately - let the celebration view show
      await loadGoals(userId);
      return outcome;
    } catch (err) {
      console.error('Failed to record check-in:', err);
      setCheckInError(err instanceof Error ? err.message : 'Failed to record check-in. Please try again.');
      return null;
    } finally {
      setCheckInLoading(false);
    }
  };

  const handlePauseGoal = async (goalId: string) => {
    try {
      await pauseGoal(userId, goalId);
      await loadGoals(userId);
    } catch (err) {
      console.error('Failed to pause goal:', err);
    }
  };

  const handleResumeGoal = async (goalId: string) => {
    try {
      await resumeGoal(userId, goalId);
      await loadGoals(userId);
    } catch (err) {
      console.error('Failed to resume goal:', err);
    }
  };

  const handleCompleteGoal = async (goalId: string) => {
    try {
      await completeGoal(userId, goalId);
      await loadGoals(userId);
    } catch (err) {
      console.error('Failed to complete goal:', err);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
      await deleteGoal(userId, goalId);
      await loadGoals(userId);
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  const filteredGoals = goals.filter(goal => {
    if (filter === 'all') return true;
    return goal.status === filter;
  });

  const filterCounts = {
    all: goals.length,
    active: goals.filter(g => g.status === 'active').length,
    paused: goals.filter(g => g.status === 'paused').length,
    completed: goals.filter(g => g.status === 'completed').length,
  };

  // Goals that need check-in (active, not checked in today, can check in)
  const goalsNeedingCheckIn = goals
    .filter(g => g.status === 'active' && !g.checked_in_today && g.can_check_in)
    .map(g => ({ id: g.id, title: g.title }));

  return (
    <div className="page-container bg-mesh min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <CheckCircle2 className="w-7 h-7 text-brand-600" />
            Your Goals
          </h1>
          <p className="text-surface-500 mt-1">Manage and track all your goals</p>
        </div>
        <Link href="/goals/new">
          <Button className="mt-4 sm:mt-0 bg-brand-600 hover:bg-brand-700 shadow-soft-sm">
            <Plus className="w-4 h-4 mr-2" />
            New Goal
          </Button>
        </Link>
      </div>

      {/* Reminder Banner */}
      {!loading && goalsNeedingCheckIn.length > 0 && userId && (
        <ReminderBanner
          goalsNeedingCheckIn={goalsNeedingCheckIn}
          onCheckIn={handleCheckIn}
          userId={userId}
        />
      )}

      {/* Filters */}
      <div className="flex items-center space-x-2 mb-6 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-surface-400 flex-shrink-0" />
        {(['all', 'active', 'paused', 'completed'] as FilterStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap',
              filter === status
                ? 'bg-brand-100 text-brand-700 shadow-soft-xs'
                : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            )}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            <span className="ml-1.5 text-xs opacity-70">({filterCounts[status]})</span>
          </button>
        ))}
      </div>

      {/* Goals Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 bg-surface-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredGoals.length === 0 ? (
        <Card variant="bordered" className="text-center py-16 bg-surface-50/50">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-100 mb-4">
            <Target className="w-8 h-8 text-surface-400" />
          </div>
          <h3 className="text-lg font-semibold text-surface-900 mb-2">
            {filter === 'all' ? 'No goals yet' : `No ${filter} goals`}
          </h3>
          <p className="text-surface-500 mb-6 max-w-sm mx-auto">
            {filter === 'all'
              ? 'Create your first goal to start your motivation experiment'
              : `You don't have any ${filter} goals at the moment`
            }
          </p>
          {filter === 'all' && (
            <Link href="/goals/new">
              <Button className="bg-brand-600 hover:bg-brand-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Goal
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredGoals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              userId={userId}
              onCheckIn={goal.can_check_in ? handleCheckIn : undefined}
              onPause={goal.status === 'active' ? handlePauseGoal : undefined}
              onResume={goal.status === 'paused' ? handleResumeGoal : undefined}
              onComplete={goal.status === 'active' ? handleCompleteGoal : undefined}
              onDelete={handleDeleteGoal}
              checkedInToday={goal.checked_in_today}
            />
          ))}
        </div>
      )}

      {/* Error message */}
      {checkInError && (
        <div className="fixed top-4 right-4 z-50 bg-danger-50 border border-danger-200 text-danger-800 px-4 py-3 rounded-xl shadow-soft-lg flex items-center gap-3 animate-fade-in">
          <span>{checkInError}</span>
          <button
            onClick={() => setCheckInError(null)}
            className="text-danger-600 hover:text-danger-800 font-bold transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Loading overlay when generating intervention */}
      {checkInGoalId && !currentIntervention && checkInLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card variant="elevated" className="p-8 text-center max-w-sm mx-4 shadow-soft-2xl">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="w-16 h-16 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              <Brain className="w-6 h-6 text-brand-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-surface-900 font-semibold">Generating your check-in...</p>
            <p className="text-surface-500 text-sm mt-1">Finding the best motivation for you</p>
          </Card>
        </div>
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
    </div>
  );
}

export default function GoalsPage() {
  return (
    <ProtectedRoute>
      <GoalsContent />
    </ProtectedRoute>
  );
}
