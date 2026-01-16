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
  MoreVertical
} from 'lucide-react';
import { useState } from 'react';

interface GoalCardProps {
  goal: Goal;
  onCheckIn?: (goalId: string) => void;
  onPause?: (goalId: string) => void;
  onResume?: (goalId: string) => void;
  onComplete?: (goalId: string) => void;
  onDelete?: (goalId: string) => void;
}

export default function GoalCard({ 
  goal, 
  onCheckIn,
  onPause,
  onResume,
  onComplete,
  onDelete 
}: GoalCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  
  const statusColors = {
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-blue-100 text-blue-700',
    abandoned: 'bg-gray-100 text-gray-700',
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
          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
            {goal.description && (
              <p className="text-sm text-gray-500 mt-1">{goal.description}</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 text-orange-500">
            <Flame className="w-4 h-4" />
            <span className="text-xl font-bold">{goal.current_streak || 0}</span>
          </div>
          <p className="text-xs text-gray-500">Streak</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 text-green-500">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xl font-bold">{goal.total_completions || 0}</span>
          </div>
          <p className="text-xs text-gray-500">Completions</p>
        </div>
        <div className="text-center">
          <span className={cn(
            'text-xl font-bold',
            completionRate >= 0.7 ? 'text-green-600' :
            completionRate >= 0.4 ? 'text-yellow-600' :
            'text-red-600'
          )}>
            {(completionRate * 100).toFixed(0)}%
          </span>
          <p className="text-xs text-gray-500">Success Rate</p>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mt-4">
        <Progress value={completionRate} max={1} showLabel label="Overall Progress" />
      </div>
      
      {/* Date info */}
      <div className="mt-4 flex items-center text-sm text-gray-500">
        <Calendar className="w-4 h-4 mr-1" />
        <span>Started {formatDate(goal.start_date)}</span>
        {goal.end_date && (
          <span className="ml-2">• Ends {formatDate(goal.end_date)}</span>
        )}
      </div>
      
      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        {goal.status === 'active' && onCheckIn && (
          <Button 
            onClick={() => onCheckIn(goal.id)}
            size="sm"
          >
            Check In Now
          </Button>
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
          <span className="text-sm text-gray-400">Goal {goal.status}</span>
        )}
        
        {/* More options menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              {goal.status === 'active' && onPause && (
                <button
                  onClick={() => { onPause(goal.id); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause Goal
                </button>
              )}
              {goal.status === 'active' && onComplete && (
                <button
                  onClick={() => { onComplete(goal.id); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-green-700 hover:bg-green-50 flex items-center"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark Complete
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => { onDelete(goal.id); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center"
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
