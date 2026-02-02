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
  const [showFeedback, setShowFeedback] = useState(false);
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
          return <Flame className="w-8 h-8 text-orange-500" />;
        case 'goal_complete':
          return <Trophy className="w-8 h-8 text-yellow-500" />;
        case 'celebration':
        default:
          return <PartyPopper className="w-8 h-8 text-purple-500" />;
      }
    } else {
      return <Heart className="w-8 h-8 text-pink-500" />;
    }
  };

  // Check-in view
  if (view === 'checkin') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card variant="elevated" className="w-full max-w-md relative animate-in fade-in zoom-in duration-200">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Daily Check-In</h2>
            <p className="text-sm text-gray-500 mt-1">{intervention.goal_title}</p>
          </div>

          {/* Intervention message */}
          <div className="bg-gradient-to-br from-primary-50 to-purple-50 rounded-xl p-4 mb-6">
            <p className="text-gray-800 text-lg leading-relaxed">
              {intervention.message}
            </p>
            <p className="text-xs text-gray-500 mt-3">
              Strategy: {strategyInfo?.name || intervention.strategy}
            </p>
          </div>

          {/* Response buttons */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 text-center">
              Did you complete your goal?
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleSubmit(true)}
                disabled={isLoading}
                className={cn(
                  'flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all',
                  'hover:border-green-500 hover:bg-green-50',
                  'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
                <span className="font-semibold text-green-700">Yes!</span>
                <span className="text-xs text-gray-500">I did it</span>
              </button>

              <button
                onClick={() => handleSubmit(false)}
                disabled={isLoading}
                className={cn(
                  'flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all',
                  'hover:border-red-300 hover:bg-red-50',
                  'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <XCircle className="w-8 h-8 text-red-400 mb-2" />
                <span className="font-semibold text-red-600">Not yet</span>
                <span className="text-xs text-gray-500">Maybe later</span>
              </button>
            </div>
          </div>

          {/* Optional feedback */}
          <div className="mt-4">
            {!showFeedback ? (
              <button
                onClick={() => setShowFeedback(true)}
                className="w-full flex items-center justify-center space-x-2 text-sm text-gray-500 hover:text-gray-700 py-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Add a note (optional)</span>
              </button>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="How are you feeling about this goal?"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-gray-400">
                  Your feedback helps us learn what motivates you best
                </p>
              </div>
            )}
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                <p className="text-sm text-gray-500 mt-2">Recording & generating your image...</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // Celebration view
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Celebration header */}
        <div className={cn(
          "text-center py-6 px-4",
          outcome?.completed
            ? "bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500"
            : "bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-400"
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
          <div className="p-4">
            <div className="relative rounded-xl overflow-hidden shadow-lg">
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
                    "bg-gray-500 text-white"
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
              className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-800 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Save Image
            </button>
          </div>
        ) : (
          <div className="p-6 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {outcome?.completed ? (
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              ) : (
                <Heart className="w-10 h-10 text-pink-500" />
              )}
            </div>
            <p className="text-gray-600">
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
                ? "bg-green-600 hover:bg-green-700"
                : "bg-purple-600 hover:bg-purple-700"
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
