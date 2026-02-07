'use client';

import { useState } from 'react';
import { Card, Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { STRATEGY_INFO, type InterventionResponse, type Outcome } from '@/types';
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  Sparkles,
  X,
  PartyPopper,
  Flame,
  Heart,
  Trophy,
  Star,
  Download
} from 'lucide-react';

interface CheckInModalProps {
  intervention: InterventionResponse;
  onSubmit: (completed: boolean, feedback?: string) => Promise<Outcome | null>;
  onClose: () => void;
  isLoading?: boolean;
}

type ModalView = 'checkin' | 'celebration';

export default function CheckInModal({
  intervention,
  onSubmit,
  onClose,
  isLoading = false
}: CheckInModalProps) {
  const [feedback, setFeedback] = useState('');
  const [view, setView] = useState<ModalView>('checkin');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const strategyInfo = STRATEGY_INFO[intervention.strategy];

  const handleSubmit = async (completed: boolean) => {
    const result = await onSubmit(completed, feedback || undefined);
    if (result) {
      setOutcome(result);
      setView('celebration');
      if (completed) {
        setShowConfetti(true);
        // Hide confetti after animation
        setTimeout(() => setShowConfetti(false), 3000);
      }
    }
  };

  const handleDownloadImage = () => {
    if (outcome?.celebration_image) {
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${outcome.celebration_image}`;
      link.download = `celebration-${Date.now()}.png`;
      link.click();
    }
  };

  // Get celebration message based on image type
  const getCelebrationMessage = () => {
    if (!outcome) return '';

    if (outcome.completed) {
      switch (outcome.celebration_image_type) {
        case 'streak_milestone':
          return "You're on fire! Keep that streak going!";
        case 'goal_complete':
          return "AMAZING! You've completed your goal!";
        case 'celebration':
        default:
          return "Fantastic work! You did it!";
      }
    } else {
      return "Every step forward counts. You've got this!";
    }
  };

  // Get icon based on image type
  const getCelebrationIcon = () => {
    if (!outcome) return <Sparkles className="w-8 h-8" />;

    if (outcome.completed) {
      switch (outcome.celebration_image_type) {
        case 'streak_milestone':
          return <Flame className="w-8 h-8 text-orange-400" />;
        case 'goal_complete':
          return <Trophy className="w-8 h-8 text-yellow-400" />;
        case 'celebration':
        default:
          return <PartyPopper className="w-8 h-8 text-purple-400" />;
      }
    } else {
      return <Heart className="w-8 h-8 text-pink-400" />;
    }
  };

  // Check-in view
  if (view === 'checkin') {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card variant="elevated" className="w-full max-w-md relative animate-in fade-in zoom-in duration-200">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-white/[0.06]"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-brand-500/15 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-brand-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Daily Check-In</h2>
            <p className="text-sm text-surface-300 mt-1">{intervention.goal_title}</p>
          </div>

          {/* Intervention message */}
          <div className="bg-gradient-to-br from-brand-500/10 to-purple-500/10 border border-brand-500/20 rounded-xl p-4 mb-6">
            <p className="text-surface-100 text-lg leading-relaxed">
              {intervention.message}
            </p>
            <p className="text-xs text-surface-400 mt-3">
              Strategy: {strategyInfo?.name || intervention.strategy}
            </p>
          </div>

          {/* Response buttons */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-surface-200 text-center">
              Did you complete your goal?
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleSubmit(true)}
                disabled={isLoading}
                className={cn(
                  'flex flex-col items-center justify-center p-4 rounded-xl border transition-all',
                  'border-white/[0.06] hover:border-success-500/40 hover:bg-success-500/10',
                  'focus:outline-none focus:ring-2 focus:ring-success-500/40',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <CheckCircle2 className="w-8 h-8 text-success-400 mb-2" />
                <span className="font-semibold text-success-400">Yes!</span>
                <span className="text-xs text-surface-400">I did it</span>
              </button>

              <button
                onClick={() => handleSubmit(false)}
                disabled={isLoading}
                className={cn(
                  'flex flex-col items-center justify-center p-4 rounded-xl border transition-all',
                  'border-white/[0.06] hover:border-danger-500/40 hover:bg-danger-500/10',
                  'focus:outline-none focus:ring-2 focus:ring-danger-500/40',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <XCircle className="w-8 h-8 text-danger-400 mb-2" />
                <span className="font-semibold text-danger-400">Not yet</span>
                <span className="text-xs text-surface-400">Maybe later</span>
              </button>
            </div>
          </div>

          {/* Mindset feedback - always visible, more prominent */}
          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-surface-200">
                <MessageSquare className="w-4 h-4 text-brand-400" />
                <span>How are you feeling?</span>
                <span className="text-xs font-normal text-surface-400">(optional)</span>
              </label>
              <Input
                placeholder="e.g., Tired today, work was hectic, feeling motivated..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="text-sm"
              />
              <p className="text-xs text-surface-400">
                Share your mindset — the AI will acknowledge your situation in future messages
              </p>
            </div>
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute inset-0 bg-surface-800/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
                <p className="text-sm text-surface-300 mt-2">Recording & generating your image...</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // Celebration view
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Confetti effect for successful check-ins */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <Star
                className={cn(
                  "w-4 h-4",
                  ['text-yellow-400', 'text-pink-400', 'text-purple-400', 'text-blue-400', 'text-green-400'][Math.floor(Math.random() * 5)]
                )}
                style={{ transform: `rotate(${Math.random() * 360}deg)` }}
              />
            </div>
          ))}
        </div>
      )}

      <Card variant="elevated" className="w-full max-w-md relative animate-in fade-in zoom-in duration-300 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Celebration header */}
        <div className={cn(
          "text-center py-6 px-4 -m-6 mb-0",
          outcome?.completed
            ? "bg-gradient-to-br from-green-500/80 via-emerald-500/80 to-teal-500/80"
            : "bg-gradient-to-br from-pink-500/80 via-purple-500/80 to-indigo-500/80"
        )}>
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3">
            {getCelebrationIcon()}
          </div>
          <h2 className="text-2xl font-bold text-white">
            {outcome?.completed ? "Amazing!" : "Keep Going!"}
          </h2>
          <p className="text-white/90 mt-1">{getCelebrationMessage()}</p>
        </div>

        {/* Celebration image */}
        {outcome?.celebration_image ? (
          <div className="p-4 mt-6">
            <div className="relative rounded-xl overflow-hidden shadow-soft-lg">
              <img
                src={`data:image/png;base64,${outcome.celebration_image}`}
                alt={outcome.completed ? "Celebration" : "Encouragement"}
                className="w-full h-auto"
              />
              {/* Image info badges */}
              <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                {outcome.celebration_image_grade && (
                  <div className={cn(
                    "px-2 py-1 rounded-full text-xs font-bold",
                    outcome.celebration_image_grade === 'A' ? "bg-green-500 text-white" :
                    outcome.celebration_image_grade === 'B' ? "bg-blue-500 text-white" :
                    outcome.celebration_image_grade === 'C' ? "bg-yellow-500 text-white" :
                    "bg-surface-500 text-white"
                  )}>
                    AI Grade: {outcome.celebration_image_grade}
                  </div>
                )}
                {outcome.celebration_image_category && (
                  <div className="px-2 py-1 rounded-full text-xs font-medium bg-black/50 text-white backdrop-blur-sm">
                    {outcome.celebration_image_category}
                  </div>
                )}
              </div>
            </div>

            {/* Download button */}
            <button
              onClick={handleDownloadImage}
              className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-surface-300 hover:text-white py-2 border border-white/[0.06] rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              <Download className="w-4 h-4" />
              Save Image
            </button>
          </div>
        ) : (
          <div className="p-6 text-center mt-6">
            <div className="w-20 h-20 bg-surface-700 rounded-full flex items-center justify-center mx-auto mb-4">
              {outcome?.completed ? (
                <CheckCircle2 className="w-10 h-10 text-success-400" />
              ) : (
                <Heart className="w-10 h-10 text-pink-400" />
              )}
            </div>
            <p className="text-surface-300">
              {outcome?.completed
                ? "Your check-in has been recorded!"
                : "Tomorrow is a new opportunity!"}
            </p>
          </div>
        )}

        {/* Action button */}
        <div className="p-4 pt-0">
          <Button
            onClick={onClose}
            className={cn(
              "w-full",
              outcome?.completed
                ? "bg-success-600 hover:bg-success-500"
                : "bg-brand-600 hover:bg-brand-500"
            )}
          >
            {outcome?.completed ? "Keep the Momentum!" : "I'll Try Again Tomorrow"}
          </Button>
        </div>
      </Card>

      {/* CSS for confetti animation */}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  );
}
