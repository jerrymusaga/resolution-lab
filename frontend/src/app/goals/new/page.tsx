'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@/components/ui';
import { getOrCreateUserId, createGoal } from '@/lib/api';
import { GoalCreate, GoalFrequency } from '@/types';
import { cn } from '@/lib/utils';
import { 
  Target, 
  Calendar, 
  Repeat,
  ArrowLeft,
  Sparkles
} from 'lucide-react';

const frequencyOptions: { value: GoalFrequency; label: string; description: string }[] = [
  { value: 'daily', label: 'Daily', description: 'Every day' },
  { value: 'weekly', label: 'Weekly', description: 'Once a week' },
  { value: 'custom', label: 'Custom', description: 'Set your own schedule' },
];

const goalSuggestions = [
  'Exercise for 30 minutes',
  'Read for 20 minutes',
  'Meditate for 10 minutes',
  'Write in journal',
  'Learn something new',
  'Drink 8 glasses of water',
  'No social media before noon',
  'Practice a skill for 1 hour',
];

export default function NewGoalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<GoalCreate>({
    title: '',
    description: '',
    frequency: 'daily',
    target_count: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Please enter a goal title');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const userId = getOrCreateUserId();
      await createGoal(userId, formData);
      
      router.push('/goals');
    } catch (err) {
      console.error('Failed to create goal:', err);
      setError('Failed to create goal. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setFormData(prev => ({ ...prev, title: suggestion }));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </button>

      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <CardTitle>Create New Goal</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                We'll run experiments to find what motivates you
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Goal Title */}
            <div>
              <Input
                label="What's your goal?"
                placeholder="e.g., Exercise for 30 minutes"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                error={error && !formData.title ? error : undefined}
              />
              
              {/* Suggestions */}
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2 flex items-center">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Quick suggestions
                </p>
                <div className="flex flex-wrap gap-2">
                  {goalSuggestions.map(suggestion => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={cn(
                        'px-3 py-1.5 text-xs rounded-full border transition-colors',
                        formData.title === suggestion
                          ? 'bg-primary-100 border-primary-300 text-primary-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                placeholder="Add more details about your goal..."
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-colors"
                rows={3}
              />
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Repeat className="w-4 h-4 inline mr-1" />
                How often?
              </label>
              <div className="grid grid-cols-3 gap-3">
                {frequencyOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, frequency: option.value }))}
                    className={cn(
                      'p-3 rounded-lg border-2 text-center transition-colors',
                      formData.frequency === option.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <p className="font-medium text-gray-900">{option.label}</p>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Times per {formData.frequency === 'daily' ? 'day' : formData.frequency === 'weekly' ? 'week' : 'period'}
              </label>
              <Input
                type="number"
                min={1}
                max={10}
                value={formData.target_count}
                onChange={(e) => setFormData(prev => ({ ...prev, target_count: parseInt(e.target.value) || 1 }))}
              />
            </div>

            {/* Error message */}
            {error && formData.title && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Info box */}
            <div className="bg-primary-50 rounded-lg p-4">
              <h4 className="font-medium text-primary-900 mb-2">How it works</h4>
              <ul className="text-sm text-primary-700 space-y-1">
                <li>• We'll send you different types of motivation messages</li>
                <li>• You tell us if you completed your goal (yes/no)</li>
                <li>• Over time, we learn what works best for YOU</li>
                <li>• View your personal insights in the dashboard</li>
              </ul>
            </div>

            {/* Submit */}
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={loading}
                className="flex-1"
              >
                Create Goal
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
