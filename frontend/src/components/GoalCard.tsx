'use client';

import { Card } from '@/components/ui';
import Progress from '@/components/ui/Progress';
import Button from '@/components/ui/Button';
import { cn, formatDate } from '@/lib/utils';
import { Goal } from '@/types';
import {
  Target,
  Calendar,
  Flame,
  CheckCircle2,
  Pause,
  Play,
  Trash2,
  MoreVertical,
  Sparkles,
  FlaskConical
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getGoalFormulaStatus, applyGoalFormula, clearGoalFormula, GoalFormulaStatus } from '@/lib/api';

interface GoalCardProps {
  goal: Goal;
  userId: string;
  onCheckIn?: (goalId: string) => void;
  onPause?: (goalId: string) => void;
  onResume?: (goalId: string) => void;
  onComplete?: (goalId: string) => void;
  onDelete?: (goalId: string) => void;
  checkedInToday?: boolean;
}

export default function GoalCard({
  goal,
  userId,
  onCheckIn,
  onPause,
  onResume,
  onComplete,
  onDelete,
  checkedInToday = false,
}: GoalCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [formulaStatus, setFormulaStatus] = useState<GoalFormulaStatus | null>(null);
  const [formulaLoading, setFormulaLoading] = useState(false);

  // Fetch formula status for this goal
  useEffect(() => {
    if (userId && goal.id) {
      getGoalFormulaStatus(userId, goal.id)
        .then(setFormulaStatus)
        .catch(err => console.warn('Failed to load formula status:', err));
    }
  }, [userId, goal.id]);

  const handleApplyFormula = async () => {
    if (!userId || formulaLoading) return;
    setFormulaLoading(true);
    try {
      const result = await applyGoalFormula(userId, goal.id);
      if (result.success) {
        // Refresh formula status
        const status = await getGoalFormulaStatus(userId, goal.id);
        setFormulaStatus(status);
      }
    } catch (err) {
      console.error('Failed to apply formula:', err);
    } finally {
      setFormulaLoading(false);
    }
  };

  const handleClearFormula = async () => {
    if (!userId || formulaLoading) return;
    setFormulaLoading(true);
    try {
      const result = await clearGoalFormula(userId, goal.id);
      if (result.success) {
        const status = await getGoalFormulaStatus(userId, goal.id);
        setFormulaStatus(status);
      }
    } catch (err) {
      console.error('Failed to clear formula:', err);
    } finally {
      setFormulaLoading(false);
    }
  };

  const statusColors = {
    active: 'bg-success-500/20 text-success-400',
    paused: 'bg-warning-500/20 text-warning-400',
    completed: 'bg-brand-500/20 text-brand-300',
    abandoned: 'bg-surface-600 text-surface-300',
  };

  const completionRate = goal.completion_rate || 0;

  return (
    <Card variant="bordered" className="relative">
      {/* Status badge */}
      <div className={cn(
        'absolute top-4 right-4 px-2 py-1 rounded-full text-xs font-medium capitalize',
        statusColors[goal.status]
      )}>
        {goal.status}
      </div>

      {/* Goal info */}
      <div className="pr-20">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-lg bg-brand-500/15 flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{goal.title}</h3>
            {goal.description && (
              <p className="text-sm text-surface-300 mt-1">{goal.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Streak highlight for 3+ day streaks */}
      {(goal.current_streak || 0) >= 3 && (
        <div className={cn(
          "mt-4 px-4 py-3 rounded-lg flex items-center justify-between",
          (goal.current_streak || 0) >= 7
            ? "bg-gradient-to-r from-orange-500/15 to-amber-500/15 border border-orange-500/20"
            : "bg-orange-500/10 border border-orange-500/10"
        )}>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              (goal.current_streak || 0) >= 7 ? "bg-orange-500" : "bg-orange-500/80"
            )}>
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-orange-400">{goal.current_streak}-day streak!</p>
              <p className="text-xs text-orange-400/70">
                {(goal.current_streak || 0) >= 7
                  ? "You're on fire! Keep it up!"
                  : "Great momentum - don't break the chain!"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className={cn(
            "flex items-center justify-center space-x-1",
            (goal.current_streak || 0) >= 3 ? "text-orange-400" : "text-orange-500/60"
          )}>
            <Flame className="w-4 h-4" />
            <span className="text-xl font-bold">{goal.current_streak || 0}</span>
          </div>
          <p className="text-xs text-surface-300">Streak</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 text-success-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xl font-bold">{goal.total_completions || 0}</span>
          </div>
          <p className="text-xs text-surface-300">Completions</p>
        </div>
        <div className="text-center">
          <span className={cn(
            'text-xl font-bold',
            completionRate >= 0.7 ? 'text-success-400' :
            completionRate >= 0.4 ? 'text-warning-400' :
            'text-danger-400'
          )}>
            {(completionRate * 100).toFixed(0)}%
          </span>
          <p className="text-xs text-surface-300">Success Rate</p>
        </div>
      </div>

      {/* Formula status */}
      {formulaStatus && goal.status === 'active' && (
        <div className={cn(
          "mt-4 px-3 py-2 rounded-lg flex items-center justify-between",
          formulaStatus.formula_applied
            ? "bg-gradient-to-r from-brand-500/10 to-purple-500/10 border border-brand-500/20"
            : formulaStatus.ready_to_apply
            ? "bg-surface-700 border border-white/[0.06]"
            : "hidden"
        )}>
          {formulaStatus.formula_applied ? (
            <>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-400" />
                <div>
                  <p className="text-sm font-medium text-brand-300">
                    Formula: {formulaStatus.preferred_strategy?.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-brand-400/60">AI optimized for this goal</p>
                </div>
              </div>
              <button
                onClick={handleClearFormula}
                disabled={formulaLoading}
                className="text-xs text-brand-400 hover:text-brand-300 underline"
              >
                {formulaLoading ? '...' : 'Reset'}
              </button>
            </>
          ) : formulaStatus.ready_to_apply ? (
            <>
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-surface-300" />
                <div>
                  <p className="text-sm font-medium text-surface-200">
                    Best: {formulaStatus.best_strategy?.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-surface-400">{formulaStatus.total_interventions} check-ins analyzed</p>
                </div>
              </div>
              <button
                onClick={handleApplyFormula}
                disabled={formulaLoading}
                className="px-2 py-1 text-xs bg-brand-600 hover:bg-brand-500 text-white rounded-md font-medium transition-colors"
              >
                {formulaLoading ? '...' : 'Apply Formula'}
              </button>
            </>
          ) : null}
        </div>
      )}

      {/* Progress bar */}
      <div className="mt-4">
        <Progress value={completionRate} max={1} showLabel label="Overall Progress" />
      </div>

      {/* Date info */}
      <div className="mt-4 flex items-center text-sm text-surface-300">
        <Calendar className="w-4 h-4 mr-1" />
        <span>Started {formatDate(goal.start_date)}</span>
        {goal.end_date && (
          <span className="ml-2">• Ends {formatDate(goal.end_date)}</span>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between">
        {goal.status === 'active' && onCheckIn && (
          <Button
            onClick={() => onCheckIn(goal.id)}
            size="sm"
          >
            Check In Now
          </Button>
        )}

        {goal.status === 'active' && !onCheckIn && checkedInToday && (
          <div className="flex items-center text-sm text-success-400">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            <span>Checked in today</span>
          </div>
        )}

        {goal.status === 'paused' && onResume && (
          <Button
            onClick={() => onResume(goal.id)}
            size="sm"
            variant="outline"
          >
            <Play className="w-4 h-4 mr-1" />
            Resume
          </Button>
        )}

        {goal.status !== 'active' && goal.status !== 'paused' && (
          <span className="text-sm text-surface-400">Goal {goal.status}</span>
        )}

        {/* More options menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-white/[0.06]"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 bottom-full mb-2 w-48 bg-surface-800 rounded-lg shadow-soft-xl border border-white/[0.06] py-1 z-10">
              {goal.status === 'active' && onPause && (
                <button
                  onClick={() => { onPause(goal.id); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-surface-200 hover:bg-white/[0.06] flex items-center"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause Goal
                </button>
              )}
              {goal.status === 'active' && onComplete && (
                <button
                  onClick={() => { onComplete(goal.id); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-success-400 hover:bg-success-500/10 flex items-center"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark Complete
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => { onDelete(goal.id); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-danger-400 hover:bg-danger-500/10 flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Goal
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
