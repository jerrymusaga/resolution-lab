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
    if (samples >= 10) return { label: 'High confidence', color: 'text-green-600' };
    if (samples >= 5) return { label: 'Medium confidence', color: 'text-yellow-600' };
    if (samples >= 3) return { label: 'Low confidence', color: 'text-orange-600' };
    return { label: 'Insufficient data', color: 'text-gray-400' };
  };
  
  const confidence = getConfidenceLabel(stats.total_interventions);
  
  const getTrendIcon = () => {
    if (stats.completion_rate >= 0.7) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (stats.completion_rate <= 0.3) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };
  
  return (
    <Card 
      variant="bordered" 
      className={cn(
        'relative overflow-hidden transition-all duration-200 hover:shadow-md',
        isBest && 'ring-2 ring-green-500 bg-green-50/50',
        isWorst && stats.total_interventions >= 3 && 'ring-2 ring-red-200 bg-red-50/30'
      )}
    >
      {/* Rank badge */}
      <div className={cn(
        'absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
        rank === 1 ? 'bg-yellow-400 text-yellow-900' :
        rank === 2 ? 'bg-gray-300 text-gray-700' :
        rank === 3 ? 'bg-orange-300 text-orange-800' :
        'bg-gray-100 text-gray-500'
      )}>
        {rank}
      </div>
      
      {/* Best/Worst badges */}
      {isBest && (
        <div className="absolute top-3 left-3 flex items-center space-x-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
          <Award className="w-3 h-3" />
          <span>Best for you</span>
        </div>
      )}
      {isWorst && stats.total_interventions >= 3 && (
        <div className="absolute top-3 left-3 flex items-center space-x-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">
          <AlertTriangle className="w-3 h-3" />
          <span>Least effective</span>
        </div>
      )}
      
      <div className={cn(isBest || isWorst ? 'mt-8' : '')}>
        {/* Strategy name */}
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {info?.name || stats.strategy}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {info?.description || 'No description available'}
        </p>
        
        {/* Stats */}
        <div className="space-y-4">
          {/* Completion rate */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-700">Completion Rate</span>
              <div className="flex items-center space-x-2">
                {getTrendIcon()}
                <span className={cn(
                  'text-lg font-bold',
                  stats.completion_rate >= 0.7 ? 'text-green-600' :
                  stats.completion_rate >= 0.4 ? 'text-yellow-600' :
                  'text-red-600'
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
              <span className="text-sm font-medium text-gray-700">Effectiveness Score</span>
              <span className="text-sm font-semibold text-gray-900">
                {stats.effectiveness_score.toFixed(2)}
              </span>
            </div>
            <Progress value={stats.effectiveness_score} max={1} size="sm" color="primary" />
          </div>
          
          {/* Sample size */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Data points</span>
            <span className="font-medium text-gray-700">{stats.total_interventions}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Successes</span>
            <span className="font-medium text-gray-700">
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
