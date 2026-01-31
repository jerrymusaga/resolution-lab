'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
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
import { GoalWithCheckInStatus, InterventionResponse } from '@/types';
import { Plus, Target, Filter } from 'lucide-react';
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

  const handleCheckInSubmit = async (completed: boolean, feedback?: string) => {
    if (!currentIntervention) return;

    try {
      setCheckInLoading(true);
      setCheckInError(null);
      await recordCheckIn(userId, {
        intervention_id: currentIntervention.intervention_id,
        completed,
        user_feedback: feedback,
      });
      setCheckInGoalId(null);
      setCurrentIntervention(null);
      await loadGoals(userId);
    } catch (err) {
      console.error('Failed to record check-in:', err);
      setCheckInError(err instanceof Error ? err.message : 'Failed to record check-in. Please try again.');
      setCheckInGoalId(null);
      setCurrentIntervention(null);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Goals</h1>
          <p className="text-gray-500 mt-1">Manage and track all your goals</p>
        </div>
        <Link href="/goals/new">
          <Button className="mt-4 sm:mt-0">
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
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        {(['all', 'active', 'paused', 'completed'] as FilterStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
              filter === status
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            <span className="ml-1 text-xs">({filterCounts[status]})</span>
          </button>
        ))}
      </div>

      {/* Goals Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="text-center py-16">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filter === 'all' ? 'No goals yet' : `No ${filter} goals`}
          </h3>
          <p className="text-gray-500 mb-6">
            {filter === 'all'
              ? 'Create your first goal to start your motivation experiment'
              : `You don't have any ${filter} goals at the moment`
            }
          </p>
          {filter === 'all' && (
            <Link href="/goals/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Goal
              </Button>
            </Link>
          )}
        </div>
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
        <div className="fixed top-4 right-4 z-50 bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <span>{checkInError}</span>
          <button
            onClick={() => setCheckInError(null)}
            className="text-red-600 hover:text-red-800 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Loading overlay when generating intervention */}
      {checkInGoalId && !currentIntervention && checkInLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 text-center max-w-sm mx-4">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-900 font-medium">Generating your check-in...</p>
            <p className="text-gray-500 text-sm mt-1">Finding the best motivation for you</p>
          </div>
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
