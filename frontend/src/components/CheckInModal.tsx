'use client';

import { useState } from 'react';
import { Card, Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { STRATEGY_INFO, type InterventionResponse } from '@/types';
import { 
  CheckCircle2, 
  XCircle, 
  MessageSquare,
  Sparkles,
  X
} from 'lucide-react';

interface CheckInModalProps {
  intervention: InterventionResponse;
  onSubmit: (completed: boolean, feedback?: string) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export default function CheckInModal({ 
  intervention, 
  onSubmit, 
  onClose,
  isLoading = false 
}: CheckInModalProps) {
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  
  const strategyInfo = STRATEGY_INFO[intervention.strategy];
  
  const handleSubmit = async (completed: boolean) => {
    await onSubmit(completed, feedback || undefined);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-500 mt-2">Recording...</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
