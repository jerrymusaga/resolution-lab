'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import GoalCard from '@/components/GoalCard';
import CheckInModal from '@/components/CheckInModal';
import { 
  getOrCreateUserId, 
  listGoals, 
  generateIntervention,
  recordCheckIn,
  getInsightsSummary,
  pauseGoal,
  resumeGoal,
  completeGoal,
  deleteGoal
} from '@/lib/api';
import { Goal, InterventionResponse, InsightsSummary } from '@/types';
import { 
  Plus, 
  Target, 
  TrendingUp, 
  FlaskConical,
  ArrowRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export default function DashboardPage() {
  const [userId, setUserId] = useState<string>('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check-in modal state
  const [checkInGoalId, setCheckInGoalId] = useState<string | null>(null);
  const [currentIntervention, setCurrentIntervention] = useState<InterventionResponse | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);

  useEffect(() => {
    const id = getOrCreateUserId();
    setUserId(id);
    loadData(id);
  }, []);

  const loadData = async (uid: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const [goalsData, summaryData] = await Promise.all([
        listGoals(uid).catch(() => []),
        getInsightsSummary(uid).catch(() => null),
      ]);
      
      setGoals(goalsData);
      setSummary(summaryData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to connect to backend. Make sure the server is running on localhost:8000');
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
      setError('Failed to generate check-in. Please try again.');
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
      
      // Close modal and refresh data
      setCheckInGoalId(null);
      setCurrentIntervention(null);
      await loadData(userId);
    } catch (err) {
      console.error('Failed to record check-in:', err);
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Track your goals and discover what motivates you</p>
        </div>
        <Link href="/goals/new">
          <Button className="mt-4 sm:mt-0">
            <Plus className="w-4 h-4 mr-2" />
            New Goal
          </Button>
        </Link>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Connection Error</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card variant="bordered">
          <CardContent className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeGoals.length}</p>
              <p className="text-sm text-gray-500">Active Goals</p>
            </div>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardContent className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <FlaskConical className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary?.data_points || 0}</p>
              <p className="text-sm text-gray-500">Experiments Run</p>
            </div>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardContent className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.best_strategy?.name || 'Exploring...'}
              </p>
              <p className="text-sm text-gray-500">
                {summary?.best_strategy 
                  ? `${(summary.best_strategy.completion_rate * 100).toFixed(0)}% success`
                  : 'Best strategy TBD'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Insight */}
      {summary?.ready_for_optimization && summary.best_strategy && (
        <Card variant="elevated" className="mb-8 bg-gradient-to-r from-primary-50 to-purple-50">
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Sparkles className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Your Motivation Formula Found!</h3>
                <p className="text-gray-600">
                  <strong>{summary.best_strategy.name}</strong> works best for you
                  {summary.best_strategy.improvement_vs_worst && (
                    <> - {summary.best_strategy.improvement_vs_worst.toFixed(0)}% better than your worst strategy</>
                  )}
                </p>
              </div>
            </div>
            <Link href="/insights">
              <Button variant="outline" size="sm">
                View Details
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Goals Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Goals</h2>
          <Link href="/goals" className="text-sm text-primary-600 hover:text-primary-700">
            View all →
          </Link>
        </div>

        {activeGoals.length === 0 ? (
          <Card variant="bordered" className="text-center py-12">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No active goals yet</h3>
            <p className="text-gray-500 mb-4">Create your first goal to start experimenting</p>
            <Link href="/goals/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Goal
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {activeGoals.slice(0, 4).map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onCheckIn={handleCheckIn}
                onPause={handlePauseGoal}
                onResume={handleResumeGoal}
                onComplete={handleCompleteGoal}
                onDelete={handleDeleteGoal}
              />
            ))}
          </div>
        )}
      </div>

      {/* Experiment CTA */}
      {(summary?.data_points || 0) < 10 && (
        <Card variant="bordered" className="bg-gray-50">
          <CardContent className="text-center py-8">
            <FlaskConical className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Need more data to find your formula
            </h3>
            <p className="text-gray-500 mb-4">
              Complete at least 10-20 check-ins to discover what motivates you best.
              <br />
              Or try our simulation to see how it works!
            </p>
            <Link href="/experiment">
              <Button variant="outline">
                Try Simulation Demo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card variant="elevated" className="p-8 text-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Generating personalized message...</p>
          </Card>
        </div>
      )}
    </div>
  );
}
