'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackReminderInteraction } from '@/lib/api';

interface ReminderBannerProps {
  goalsNeedingCheckIn: Array<{ id: string; title: string }>;
  onCheckIn: (goalId: string) => void;
  onDismiss?: () => void;
  userId: string;
}

export default function ReminderBanner({
  goalsNeedingCheckIn,
  onCheckIn,
  onDismiss,
  userId,
}: ReminderBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const viewedRef = useRef(false);
  const viewTimeRef = useRef<number>(Date.now());

  // Track when banner is viewed (on mount)
  useEffect(() => {
    if (!viewedRef.current && goalsNeedingCheckIn.length > 0 && userId) {
      viewedRef.current = true;
      viewTimeRef.current = Date.now();

      // Track view for each goal
      goalsNeedingCheckIn.forEach(goal => {
        trackReminderInteraction(userId, {
          goal_id: goal.id,
          interaction_type: 'viewed',
        }).catch(err => console.warn('Failed to track reminder view:', err));
      });
    }
  }, [goalsNeedingCheckIn, userId]);

  // Don't show if no goals need check-in
  if (!isVisible || goalsNeedingCheckIn.length === 0) {
    return null;
  }

  const handleCheckIn = (goalId: string) => {
    // Calculate time to action
    const timeToAction = Math.floor((Date.now() - viewTimeRef.current) / 1000);

    // Track click interaction
    trackReminderInteraction(userId, {
      goal_id: goalId,
      interaction_type: 'clicked',
      time_to_action_seconds: timeToAction,
    }).catch(err => console.warn('Failed to track reminder click:', err));

    // Call the actual check-in handler
    onCheckIn(goalId);
  };

  const handleDismiss = () => {
    // Calculate time to dismissal
    const timeToAction = Math.floor((Date.now() - viewTimeRef.current) / 1000);

    // Track dismiss for all goals
    goalsNeedingCheckIn.forEach(goal => {
      trackReminderInteraction(userId, {
        goal_id: goal.id,
        interaction_type: 'dismissed',
        time_to_action_seconds: timeToAction,
      }).catch(err => console.warn('Failed to track reminder dismiss:', err));
    });

    setIsVisible(false);
    onDismiss?.();
  };

  const count = goalsNeedingCheckIn.length;
  const firstGoal = goalsNeedingCheckIn[0];

  return (
    <div className="mb-6 animate-in slide-in-from-top duration-300">
      <div
        className={cn(
          'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl overflow-hidden',
          'shadow-soft-sm hover:shadow-soft-md transition-shadow'
        )}
      >
        {/* Main banner */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/15 rounded-full">
              <Bell className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="font-medium text-white">
                {count === 1 ? (
                  <>Time to check in on <span className="text-amber-400">{firstGoal.title}</span></>
                ) : (
                  <>{count} goals waiting for your check-in</>
                )}
              </p>
              <p className="text-sm text-surface-300">
                {count === 1
                  ? "Let's see how you're doing today!"
                  : 'Stay on track with your daily progress'
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {count === 1 ? (
              <button
                onClick={() => handleCheckIn(firstGoal.id)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-lg font-medium transition-colors text-sm"
              >
                Check In Now
              </button>
            ) : (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-lg font-medium transition-colors text-sm flex items-center gap-1"
              >
                View All
                <ChevronRight className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-90')} />
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors"
              aria-label="Dismiss reminder"
            >
              <X className="w-4 h-4 text-surface-400" />
            </button>
          </div>
        </div>

        {/* Expanded list for multiple goals */}
        {isExpanded && count > 1 && (
          <div className="border-t border-amber-500/20 bg-surface-800/50">
            {goalsNeedingCheckIn.map((goal, index) => (
              <div
                key={goal.id}
                className={cn(
                  'flex items-center justify-between p-3 hover:bg-white/[0.04] transition-colors',
                  index !== goalsNeedingCheckIn.length - 1 && 'border-b border-white/[0.04]'
                )}
              >
                <span className="text-surface-200">{goal.title}</span>
                <button
                  onClick={() => handleCheckIn(goal.id)}
                  className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 rounded-md text-sm font-medium transition-colors"
                >
                  Check In
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
