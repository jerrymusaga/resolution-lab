'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import GoalCard from '@/components/GoalCard';
import CheckInModal from '@/components/CheckInModal';
import { 
  getOrCreateUserId, 
  listGoals, 
  generateIntervention,
  recordCheckIn,
  pauseGoal,
  resumeGoal,
  completeGoal,
  deleteGoal
} from '@/lib/api';
import { Goal, InterventionResponse } from '@/types';
import { Plus, Target, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterStatus = 'all' | 'active' | 'paused' | 'completed';

export default function GoalsPage() {
  const [userId, setUserId] = useState<string>('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  
  // Check-in modal state
  const [checkInGoalId, setCheckInGoalId] = useState<string | null>(null);
  const [currentIntervention, setCurrentIntervention] = useState<InterventionResponse | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);

  useEffect(() => {
    const id = getOrCreateUserId();
    setUserId(id);
    loadGoals(id);
  }, []);

  const loadGoals = async (uid: string) => {
    try {
      setLoading(true);
      const data = await listGoals(uid);
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
      const intervention = await generateIntervention(userId, goalId);
      setCurrentIntervention(intervention);
    } catch (err) {
      console.error('Failed to generate intervention:', err);
      setCheckInGoalId(null);
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckInSubmit = async (completed: boolean, feedback?: string) => {
    if (!currentIntervention) return;
    
    try {
      setCheckInLoading(true);
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
              onCheckIn={goal.status === 'active' ? handleCheckIn : undefined}
              onPause={goal.status === 'active' ? handlePauseGoal : undefined}
              onResume={goal.status === 'paused' ? handleResumeGoal : undefined}
              onComplete={goal.status === 'active' ? handleCompleteGoal : undefined}
              onDelete={handleDeleteGoal}
            />
          ))}
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
