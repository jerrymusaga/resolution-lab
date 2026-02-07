'use client';

import { Card } from '@/components/ui';
import Progress from '@/components/ui/Progress';
import { cn, formatPercent } from '@/lib/utils';
import { STRATEGY_INFO, type InterventionStrategy, type StrategyStats } from '@/types';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  AlertTriangle
} from 'lucide-react';

interface StrategyCardProps {
  stats: StrategyStats;
  rank: number;
  isBest?: boolean;
  isWorst?: boolean;
}

export default function StrategyCard({ stats, rank, isBest, isWorst }: StrategyCardProps) {
  const info = STRATEGY_INFO[stats.strategy];

  const getConfidenceLabel = (samples: number) => {
    if (samples >= 10) return { label: 'High confidence', color: 'text-success-400' };
    if (samples >= 5) return { label: 'Medium confidence', color: 'text-warning-400' };
    if (samples >= 3) return { label: 'Low confidence', color: 'text-orange-400' };
    return { label: 'Insufficient data', color: 'text-surface-400' };
  };

  const confidence = getConfidenceLabel(stats.total_interventions);

  const getTrendIcon = () => {
    if (stats.completion_rate >= 0.7) return <TrendingUp className="w-4 h-4 text-success-400" />;
    if (stats.completion_rate <= 0.3) return <TrendingDown className="w-4 h-4 text-danger-400" />;
    return <Minus className="w-4 h-4 text-surface-400" />;
  };

  return (
    <Card
      variant="bordered"
      className={cn(
        'relative overflow-hidden transition-all duration-200 hover:shadow-soft-md',
        isBest && 'ring-1 ring-success-500/40 bg-success-500/5',
        isWorst && stats.total_interventions >= 3 && 'ring-1 ring-danger-500/30 bg-danger-500/5'
      )}
    >
      {/* Rank badge */}
      <div className={cn(
        'absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
        rank === 1 ? 'bg-yellow-500/80 text-black' :
        rank === 2 ? 'bg-surface-400 text-surface-900' :
        rank === 3 ? 'bg-orange-500/60 text-white' :
        'bg-surface-700 text-surface-300'
      )}>
        {rank}
      </div>

      {/* Best/Worst badges */}
      {isBest && (
        <div className="absolute top-3 left-3 flex items-center space-x-1 text-xs font-medium text-success-400 bg-success-500/15 px-2 py-1 rounded-full">
          <Award className="w-3 h-3" />
          <span>Best for you</span>
        </div>
      )}
      {isWorst && stats.total_interventions >= 3 && (
        <div className="absolute top-3 left-3 flex items-center space-x-1 text-xs font-medium text-danger-400 bg-danger-500/15 px-2 py-1 rounded-full">
          <AlertTriangle className="w-3 h-3" />
          <span>Least effective</span>
        </div>
      )}

      <div className={cn(isBest || isWorst ? 'mt-8' : '')}>
        {/* Strategy name */}
        <h3 className="text-lg font-semibold text-white mb-1">
          {info?.name || stats.strategy}
        </h3>
        <p className="text-sm text-surface-300 mb-4">
          {info?.description || 'No description available'}
        </p>

        {/* Stats */}
        <div className="space-y-4">
          {/* Completion rate */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-surface-200">Completion Rate</span>
              <div className="flex items-center space-x-2">
                {getTrendIcon()}
                <span className={cn(
                  'text-lg font-bold',
                  stats.completion_rate >= 0.7 ? 'text-success-400' :
                  stats.completion_rate >= 0.4 ? 'text-warning-400' :
                  'text-danger-400'
                )}>
                  {formatPercent(stats.completion_rate)}
                </span>
              </div>
            </div>
            <Progress value={stats.completion_rate} max={1} size="md" />
          </div>

          {/* Effectiveness score */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-surface-200">Effectiveness Score</span>
              <span className="text-sm font-semibold text-white">
                {stats.effectiveness_score.toFixed(2)}
              </span>
            </div>
            <Progress value={stats.effectiveness_score} max={1} size="sm" color="primary" />
          </div>

          {/* Sample size */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-surface-400">Data points</span>
            <span className="font-medium text-surface-200">{stats.total_interventions}</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-surface-400">Successes</span>
            <span className="font-medium text-surface-200">
              {stats.successful_completions} / {stats.total_interventions}
            </span>
          </div>

          {/* Confidence */}
          <div className={cn('text-xs font-medium', confidence.color)}>
            {confidence.label}
          </div>
        </div>
      </div>
    </Card>
  );
}
