'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import Progress from '@/components/ui/Progress';
import {
  getUserInsights,
  getStrategyComparison,
  getRecommendation,
  getUserPatterns,
  UserPatterns,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { UserInsights, InsightsComparison, STRATEGY_INFO, InterventionStrategy } from '@/types';
import { formatPercent, getStrategyColor, cn } from '@/lib/utils';
import {
  BarChart3,
  TrendingUp,
  FlaskConical,
  Sparkles,
  Target,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Zap,
  Brain,
  Award,
  Lightbulb,
  Rocket,
  Heart,
  Shield,
  ChevronRight,
  Info,
  Calendar,
  Flame,
  TrendingDown,
  Minus,
  RotateCcw,
  Sun,
  Moon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar
} from 'recharts';

// Strategy icons mapping
const STRATEGY_ICONS: Record<InterventionStrategy, React.ReactNode> = {
  gentle_reminder: <Heart className="w-5 h-5" />,
  accountability: <Shield className="w-5 h-5" />,
  streak_gamification: <Zap className="w-5 h-5" />,
  social_comparison: <TrendingUp className="w-5 h-5" />,
  loss_aversion: <AlertCircle className="w-5 h-5" />,
  reward_preview: <Sparkles className="w-5 h-5" />,
  identity_reinforcement: <Brain className="w-5 h-5" />,
  micro_commitment: <Target className="w-5 h-5" />,
};

// Evaluation type for insight quality
interface InsightEvaluation {
  grade: string;
  score: number;
  breakdown?: {
    actionability: number;
    data_grounded: number;
    personalization: number;
    clarity: number;
  };
}

function InsightsContent() {
  const { user } = useAuth();
  const [userId, setUserId] = useState<string>('');
  const [insights, setInsights] = useState<UserInsights | null>(null);
  const [comparison, setComparison] = useState<InsightsComparison | null>(null);
  const [recommendation, setRecommendation] = useState<string>('');
  const [recommendationEval, setRecommendationEval] = useState<InsightEvaluation | null>(null);
  const [patterns, setPatterns] = useState<UserPatterns | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [revealStep, setRevealStep] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Use authenticated user ID
    const id = user?.id || '';
    setUserId(id);
    if (id) {
      loadInsights(id);
    }
  }, [user]);

  // Animate the reveal when data loads
  useEffect(() => {
    if (insights && insights.best_strategy && !loading) {
      const timer = setTimeout(() => {
        setShowReveal(true);
        // Animate through reveal steps
        const steps = [1, 2, 3, 4];
        steps.forEach((step, i) => {
          setTimeout(() => setRevealStep(step), (i + 1) * 400);
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [insights, loading]);

  const loadInsights = async (uid: string) => {
    try {
      setLoading(true);
      setError(null);
      setShowReveal(false);
      setRevealStep(0);

      const [insightsData, comparisonData, recData, patternsData] = await Promise.all([
        getUserInsights(uid).catch(() => null),
        getStrategyComparison(uid).catch(() => null),
        getRecommendation(uid).catch(() => ({ recommendation: '', evaluation: null })),
        getUserPatterns(uid).catch(() => null),
      ]);

      setInsights(insightsData);
      setComparison(comparisonData);
      setRecommendation(recData?.recommendation || '');
      setRecommendationEval(recData?.evaluation || null);
      setPatterns(patternsData);
    } catch (err) {
      console.error('Failed to load insights:', err);
      setError('Failed to load insights. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const chartData = comparison?.comparison
    .filter(c => c.sample_size > 0)
    .map((c, index) => ({
      name: c.strategy_name.split(' ')[0],
      fullName: c.strategy_name,
      strategy: c.strategy,
      completionRate: c.completion_rate * 100,
      effectiveness: c.effectiveness_score * 100,
      samples: c.sample_size,
      fill: getStrategyColor(index),
    })) || [];

  // Radar chart data
  const radarData = chartData.map(d => ({
    strategy: d.name,
    fullName: d.fullName,
    value: d.completionRate,
  }));

  // Get best and worst strategies with full info
  const bestStrategy = insights?.best_strategy ? {
    key: insights.best_strategy,
    info: STRATEGY_INFO[insights.best_strategy],
    stats: insights.strategy_stats.find(s => s.strategy === insights.best_strategy),
  } : null;

  const worstStrategy = insights?.worst_strategy ? {
    key: insights.worst_strategy,
    info: STRATEGY_INFO[insights.worst_strategy],
    stats: insights.strategy_stats.find(s => s.strategy === insights.worst_strategy),
  } : null;

  const improvementPercent = bestStrategy?.stats && worstStrategy?.stats
    ? Math.round((bestStrategy.stats.completion_rate - worstStrategy.stats.completion_rate) * 100)
    : 0;

  const hasEnoughData = (insights?.data_points_collected || 0) >= 5;
  const hasDiscovery = hasEnoughData && bestStrategy && worstStrategy;

  // Custom loading animation
  if (loading) {
    return (
      <div className="page-container">
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-brand-500/20 border-t-brand-500 animate-spin" />
            <Brain className="w-10 h-10 text-brand-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-6 text-lg text-surface-300 animate-pulse">Analyzing your motivation patterns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container bg-mesh min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-7 h-7 text-warning-500" />
            Your Insights
          </h1>
          <p className="text-surface-400 mt-1">
            See which motivation strategies work best for you
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => loadInsights(userId)}
          className="mt-4 sm:mt-0 border-brand-500/30 text-brand-400 hover:bg-brand-500/10"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* How It Works - Collapsible info banner */}
      <Card variant="bordered" className="mb-6 bg-gradient-to-r from-brand-500/10 to-brand-500/5 border-brand-500/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-500/15 flex items-center justify-center">
              <Info className="w-5 h-5 text-brand-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-2">How This Works</h3>
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                  <div>
                    <p className="font-medium text-white">We Experiment</p>
                    <p className="text-surface-300">Each check-in tests a different motivation strategy</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                  <div>
                    <p className="font-medium text-white">We Learn</p>
                    <p className="text-surface-300">Your responses reveal what motivates you most</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                  <div>
                    <p className="font-medium text-white">You Apply</p>
                    <p className="text-surface-300">Lock in your best strategy per goal from the Goals page</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card variant="bordered" className="mb-6 border-danger-500/20 bg-danger-500/10">
          <CardContent className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-danger-500" />
            <p className="text-danger-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Not enough data - Beautiful CTA */}
      {!hasEnoughData && (
        <Card variant="bordered" className="mb-8 overflow-hidden shadow-soft-xl">
          <div className="relative bg-gradient-hero text-white">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative px-8 py-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-6">
                <FlaskConical className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold mb-3">
                Your Motivation Formula is Brewing
              </h3>
              <p className="text-white/90 mb-2 max-w-lg mx-auto">
                We're still running experiments to discover what works best for you.
              </p>

              {/* Progress indicator */}
              <div className="max-w-xs mx-auto mt-6 mb-8">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/80">Data collected</span>
                  <span className="font-semibold">{insights?.data_points_collected || 0} / 10 minimum</span>
                </div>
                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(((insights?.data_points_collected || 0) / 10) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/goals">
                  <Button className="bg-white text-brand-400 hover:bg-white/90 shadow-soft-md">
                    <Target className="w-4 h-4 mr-2" />
                    Do a Check-in
                  </Button>
                </Link>
                <Link href="/experiment">
                  <Button variant="outline" className="border-white/50 text-white hover:bg-white/10">
                    Try Simulation Demo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* THE BIG REVEAL - Your Motivation Formula */}
      {hasDiscovery && (
        <div ref={heroRef} className="mb-10">
          <Card variant="bordered" className="overflow-hidden border-0 shadow-soft-2xl">
            {/* Gradient header */}
            <div className="relative bg-gradient-to-r from-accent-500 via-accent-600 to-accent-700 text-white px-6 py-8 sm:px-10 sm:py-12">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNC0yIDQtMiA0LTItMi0yLTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />

              <div className={cn(
                "relative transition-all duration-700",
                showReveal ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                  <span className="text-sm font-medium uppercase tracking-wider">Discovery Unlocked</span>
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>

                <h2 className="text-3xl sm:text-4xl font-bold text-center mb-3">
                  Your Motivation Formula
                </h2>
                <p className="text-white/90 text-center max-w-xl mx-auto">
                  Based on {insights?.data_points_collected} experiments, we've discovered what drives you
                </p>
              </div>
            </div>

            {/* Main content - The comparison */}
            <CardContent className="p-6 sm:p-10 bg-gradient-to-b from-surface-800 to-surface-800">
              {/* Best Strategy - THE HERO */}
              <div className={cn(
                "transition-all duration-500 delay-200",
                revealStep >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}>
                <div className="relative bg-gradient-to-br from-accent-500/10 to-accent-500/5 rounded-2xl p-6 sm:p-8 border-2 border-accent-500/20 mb-6">
                  {/* Trophy badge */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-warning-400 to-warning-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-soft-lg flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    #1 BEST FOR YOU
                  </div>

                  <div className="text-center mt-4">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 text-white mb-4 shadow-soft-lg">
                      {bestStrategy && STRATEGY_ICONS[bestStrategy.key]}
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                      {bestStrategy?.info?.name}
                    </h3>
                    <p className="text-surface-300 mb-6 max-w-md mx-auto">
                      {bestStrategy?.info?.description}
                    </p>

                    {/* Big success number */}
                    <div className="inline-block bg-surface-800 rounded-xl px-8 py-4 shadow-soft-sm border border-accent-500/20">
                      <div className="text-5xl sm:text-6xl font-bold text-accent-400">
                        {formatPercent(bestStrategy?.stats?.completion_rate || 0)}
                      </div>
                      <div className="text-sm text-surface-400 mt-1">Success Rate</div>
                    </div>

                    {/* Example message */}
                    <div className="mt-6 bg-surface-700/80 rounded-lg p-4 border border-accent-500/20 max-w-md mx-auto">
                      <p className="text-sm text-surface-400 mb-1">Example message:</p>
                      <p className="text-surface-200 italic">"{bestStrategy?.info?.example}"</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* VS Divider */}
              <div className={cn(
                "flex items-center justify-center my-6 transition-all duration-500 delay-300",
                revealStep >= 2 ? "opacity-100 scale-100" : "opacity-0 scale-50"
              )}>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-surface-300 to-surface-300" />
                <div className="mx-4 flex items-center gap-3">
                  {improvementPercent > 0 && (
                    <div className="bg-gradient-to-r from-accent-500 to-accent-600 text-white px-4 py-2 rounded-full font-bold text-lg shadow-soft-md">
                      +{improvementPercent}% better
                    </div>
                  )}
                </div>
                <div className="flex-1 h-px bg-gradient-to-l from-transparent via-surface-300 to-surface-300" />
              </div>

              {/* Worst Strategy - Smaller, less prominent */}
              <div className={cn(
                "transition-all duration-500 delay-400",
                revealStep >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}>
                <div className="bg-surface-900 rounded-xl p-5 border border-white/[0.06]">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-surface-600 flex items-center justify-center text-surface-400 flex-shrink-0">
                      {worstStrategy && STRATEGY_ICONS[worstStrategy.key]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-surface-400 uppercase tracking-wider">Least Effective</span>
                      </div>
                      <h4 className="text-lg font-semibold text-surface-200 truncate">
                        {worstStrategy?.info?.name}
                      </h4>
                      <p className="text-sm text-surface-400 truncate">
                        {worstStrategy?.info?.description}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-bold text-surface-400">
                        {formatPercent(worstStrategy?.stats?.completion_rate || 0)}
                      </div>
                      <div className="text-xs text-surface-400">Success Rate</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* What This Means */}
              <div className={cn(
                "mt-8 transition-all duration-500 delay-500",
                revealStep >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}>
                <div className="bg-gradient-to-r from-warning-500/10 to-warning-500/5 rounded-xl p-6 border border-warning-500/20">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-warning-500/15 flex items-center justify-center">
                        <Lightbulb className="w-6 h-6 text-warning-400" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-white">What This Means For You</h4>
                        {/* Evaluation Badge */}
                        {recommendationEval && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-surface-400">AI Insight Quality</span>
                            <span className={cn(
                              "text-sm font-bold px-2 py-0.5 rounded-full",
                              recommendationEval.grade === 'A' ? "bg-emerald-500/15 text-emerald-400" :
                              recommendationEval.grade === 'B' ? "bg-blue-500/15 text-blue-400" :
                              recommendationEval.grade === 'C' ? "bg-amber-500/15 text-amber-400" :
                              recommendationEval.grade === 'D' ? "bg-orange-500/15 text-orange-400" :
                              "bg-red-500/15 text-red-400"
                            )}>
                              {recommendationEval.grade}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-surface-200 leading-relaxed">
                        {recommendation || `You respond ${improvementPercent}% better to ${bestStrategy?.info?.name?.toLowerCase()} than ${worstStrategy?.info?.name?.toLowerCase()}. When you need motivation, messages that ${bestStrategy?.info?.description?.toLowerCase()} will be most effective for you.`}
                      </p>
                      {/* Evaluation breakdown */}
                      {recommendationEval?.breakdown && (
                        <div className="mt-4 pt-4 border-t border-amber-500/20">
                          <p className="text-xs font-medium text-surface-400 uppercase tracking-wide mb-2">
                            Custom Opik Evaluator Scores
                          </p>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { label: 'Actionability', value: recommendationEval.breakdown.actionability },
                              { label: 'Data-grounded', value: recommendationEval.breakdown.data_grounded },
                              { label: 'Personalization', value: recommendationEval.breakdown.personalization },
                              { label: 'Clarity', value: recommendationEval.breakdown.clarity },
                            ].map((metric) => (
                              <div key={metric.label} className="text-center">
                                <div className="text-lg font-bold text-amber-400">
                                  {(metric.value * 100).toFixed(0)}%
                                </div>
                                <div className="text-xs text-surface-400">{metric.label}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Next Steps - Guide users to apply formulas */}
      {hasDiscovery && (
        <Card variant="bordered" className="mb-8 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-purple-500/20">
          <CardContent className="py-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500/15 flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Ready to Apply Your Formula?</h3>
                  <p className="text-sm text-surface-300 mt-1">
                    Go to your Goals page and click <span className="font-medium text-purple-400">"Apply Formula"</span> on any goal card to lock in its best strategy.
                    Each goal can have its own personalized formula!
                  </p>
                </div>
              </div>
              <Link href="/goals">
                <Button className="bg-purple-600 hover:bg-purple-700 whitespace-nowrap">
                  <Target className="w-4 h-4 mr-2" />
                  Go to Goals
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            {/* Subtle AI Coach tip */}
            <div className="mt-4 pt-4 border-t border-purple-500/20 flex items-center gap-2 text-sm text-surface-400">
              <Brain className="w-4 h-4 text-purple-400" />
              <span>
                Want to see how the AI thinks?{' '}
                <Link href="/agent" className="text-purple-400 hover:text-purple-400 font-medium hover:underline">
                  Try the AI Coach
                </Link>
                {' '}to watch the full reasoning process.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats - Cleaner design */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          Your Progress
        </h2>
        <p className="text-sm text-surface-400">Track your experimentation journey</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card variant="bordered" className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
          <CardContent className="text-center py-5">
            <FlaskConical className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-white">
              {insights?.data_points_collected || 0}
            </p>
            <p className="text-sm text-surface-300">Experiments Run</p>
          </CardContent>
        </Card>

        <Card variant="bordered" className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 border-purple-500/20">
          <CardContent className="text-center py-5">
            <Brain className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-white">
              {insights?.strategies_tested || 0}<span className="text-lg text-surface-400">/8</span>
            </p>
            <p className="text-sm text-surface-300">Strategies Tested</p>
          </CardContent>
        </Card>

        <Card variant="bordered" className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="text-center py-5">
            <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-white">
              {formatPercent(insights?.overall_completion_rate || 0)}
            </p>
            <p className="text-sm text-surface-300">Overall Success</p>
          </CardContent>
        </Card>

        <Card variant="bordered" className={cn(
          "border-2",
          insights?.experiment_phase === 'optimizing'
            ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20'
            : 'bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-500/20'
        )}>
          <CardContent className="text-center py-5">
            {insights?.experiment_phase === 'optimizing' ? (
              <Rocket className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            ) : (
              <FlaskConical className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            )}
            <p className={cn(
              "text-lg font-bold",
              insights?.experiment_phase === 'optimizing' ? 'text-emerald-400' : 'text-amber-400'
            )}>
              {insights?.experiment_phase === 'optimizing' ? 'Optimizing' : 'Exploring'}
            </p>
            <p className="text-sm text-surface-300">Current Phase</p>
          </CardContent>
        </Card>
      </div>

      {/* User Patterns Section */}
      {patterns && patterns.totalInterventions > 0 && (
        <div className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              Your Patterns
            </h2>
            <p className="text-sm text-surface-400">Discover when and how you perform best</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Momentum & Emotional State Card */}
            <Card variant="bordered" className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {patterns.momentum === 'rising' && <TrendingUp className="w-5 h-5 text-emerald-500" />}
                  {patterns.momentum === 'falling' && <TrendingDown className="w-5 h-5 text-red-500" />}
                  {patterns.momentum === 'stable' && <Minus className="w-5 h-5 text-blue-500" />}
                  {patterns.momentum === 'comeback' && <RotateCcw className="w-5 h-5 text-purple-500" />}
                  {patterns.momentum === 'neutral' && <Minus className="w-5 h-5 text-surface-400" />}
                  Current Momentum
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Momentum indicator */}
                <div className={cn(
                  "rounded-lg p-4 mb-4",
                  patterns.momentum === 'rising' && "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20",
                  patterns.momentum === 'falling' && "bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20",
                  patterns.momentum === 'stable' && "bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20",
                  patterns.momentum === 'comeback' && "bg-gradient-to-r from-purple-500/10 to-violet-500/10 border border-purple-500/20",
                  patterns.momentum === 'neutral' && "bg-surface-900 border border-white/[0.06]",
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center",
                      patterns.momentum === 'rising' && "bg-emerald-500/15",
                      patterns.momentum === 'falling' && "bg-red-500/15",
                      patterns.momentum === 'stable' && "bg-blue-500/15",
                      patterns.momentum === 'comeback' && "bg-purple-500/15",
                      patterns.momentum === 'neutral' && "bg-surface-700",
                    )}>
                      {patterns.emotionalState === 'on_fire' && <Flame className="w-6 h-6 text-orange-500" />}
                      {patterns.emotionalState === 'building_momentum' && <Rocket className="w-6 h-6 text-blue-500" />}
                      {patterns.emotionalState === 'struggling' && <Heart className="w-6 h-6 text-red-500" />}
                      {patterns.emotionalState === 'comeback' && <Sparkles className="w-6 h-6 text-purple-500" />}
                      {patterns.emotionalState === 'neutral' && <Target className="w-6 h-6 text-surface-400" />}
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        "font-semibold capitalize",
                        patterns.momentum === 'rising' && "text-emerald-400",
                        patterns.momentum === 'falling' && "text-red-400",
                        patterns.momentum === 'stable' && "text-blue-400",
                        patterns.momentum === 'comeback' && "text-purple-400",
                        patterns.momentum === 'neutral' && "text-surface-200",
                      )}>
                        {patterns.momentum === 'rising' && "Rising 🔥"}
                        {patterns.momentum === 'falling' && "Needs Attention"}
                        {patterns.momentum === 'stable' && "Steady Progress"}
                        {patterns.momentum === 'comeback' && "Making a Comeback!"}
                        {patterns.momentum === 'neutral' && "Getting Started"}
                      </p>
                      <p className="text-sm text-surface-300 mt-1">{patterns.momentumDescription}</p>
                    </div>
                  </div>
                </div>

                {/* Recent Activity Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-400">{patterns.recentCompletions}</p>
                    <p className="text-xs text-surface-400">Completed (7 days)</p>
                  </div>
                  <div className="bg-red-500/10 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-500">{patterns.recentMisses}</p>
                    <p className="text-xs text-surface-400">Missed (7 days)</p>
                  </div>
                </div>

                {/* Consecutive misses warning */}
                {patterns.consecutiveMisses >= 2 && (
                  <div className="mt-3 bg-amber-500/10 rounded-lg p-3 flex items-center gap-2 border border-amber-500/20">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <p className="text-sm text-amber-400">
                      {patterns.consecutiveMisses} consecutive misses. Let's get back on track!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Day of Week Performance */}
            <Card variant="bordered">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                  Best Days of the Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patterns.dayPerformance && patterns.dayPerformance.length > 0 ? (
                  <>
                    {/* Day bars */}
                    <div className="space-y-2">
                      {patterns.dayPerformance.map((day) => (
                        <div key={day.day} className="flex items-center gap-2">
                          <span className={cn(
                            "w-10 text-xs font-medium",
                            day.isBest && "text-emerald-400",
                            day.isWorst && "text-red-500",
                            !day.isBest && !day.isWorst && "text-surface-400"
                          )}>
                            {day.shortDay}
                          </span>
                          <div className="flex-1 h-6 bg-surface-700 rounded-full overflow-hidden relative">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                day.isBest && "bg-gradient-to-r from-emerald-400 to-emerald-500",
                                day.isWorst && "bg-gradient-to-r from-red-300 to-red-400",
                                !day.isBest && !day.isWorst && "bg-gradient-to-r from-blue-300 to-blue-400"
                              )}
                              style={{ width: `${Math.max(day.completionRate, 5)}%` }}
                            />
                            <span className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-medium text-surface-200">
                              {day.completionRate.toFixed(0)}%
                            </span>
                          </div>
                          {day.isBest && <Award className="w-4 h-4 text-yellow-500" />}
                        </div>
                      ))}
                    </div>

                    {/* Best/Worst day summary */}
                    <div className="mt-4 pt-4 border-t border-white/[0.06] grid grid-cols-2 gap-4">
                      {patterns.bestDayOfWeek && (
                        <div className="flex items-center gap-2">
                          <Sun className="w-4 h-4 text-emerald-500" />
                          <div>
                            <p className="text-xs text-surface-400">Best Day</p>
                            <p className="text-sm font-semibold text-emerald-400">{patterns.bestDayOfWeek}s</p>
                          </div>
                        </div>
                      )}
                      {patterns.worstDayOfWeek && (
                        <div className="flex items-center gap-2">
                          <Moon className="w-4 h-4 text-red-400" />
                          <div>
                            <p className="text-xs text-surface-400">Hardest Day</p>
                            <p className="text-sm font-semibold text-red-500">{patterns.worstDayOfWeek}s</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Weekend vs Weekday insight */}
                    {patterns.weekendVsWeekday && patterns.weekendVsWeekday !== 'same' && (
                      <div className="mt-3 bg-indigo-500/10 rounded-lg p-3 flex items-center gap-2">
                        <Info className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <p className="text-sm text-indigo-400">
                          {patterns.weekendVsWeekday === 'better_weekends'
                            ? "You perform better on weekends. Consider scheduling important goals then!"
                            : "You perform better on weekdays. Weekends might need extra motivation."}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6 text-surface-400">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Keep checking in to reveal your daily patterns!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Strategy Performance Chart - Enhanced */}
      {chartData.length > 0 && (
        <Card variant="bordered" className="mb-8">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Strategy Performance
              </CardTitle>
              <p className="text-sm text-surface-400 mt-1">
                Compare how each motivation strategy performs for you
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Bar Chart */}
              <div>
                <h4 className="text-sm font-medium text-surface-400 mb-4 text-center">Completion Rate by Strategy</h4>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#2a2a35" />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={70}
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const isBest = data.strategy === insights?.best_strategy;
                            return (
                              <div className="bg-surface-800/95 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-white/[0.06]">
                                <p className="font-semibold text-white flex items-center gap-2">
                                  {data.fullName}
                                  {isBest && <Award className="w-4 h-4 text-yellow-500" />}
                                </p>
                                <div className="mt-2 space-y-1">
                                  <p className="text-sm">
                                    <span className="text-surface-400">Success Rate: </span>
                                    <span className="font-bold text-emerald-400">{data.completionRate.toFixed(1)}%</span>
                                  </p>
                                  <p className="text-sm">
                                    <span className="text-surface-400">Sample Size: </span>
                                    <span className="font-medium">{data.samples} experiments</span>
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="completionRate"
                        radius={[0, 6, 6, 0]}
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.strategy === insights?.best_strategy ? '#10b981' : entry.fill}
                            stroke={entry.strategy === insights?.best_strategy ? '#059669' : 'none'}
                            strokeWidth={entry.strategy === insights?.best_strategy ? 2 : 0}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Radar Chart */}
              <div>
                <h4 className="text-sm font-medium text-surface-400 mb-4 text-center">Your Motivation Profile</h4>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#2a2a35" />
                      <PolarAngleAxis
                        dataKey="strategy"
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                      />
                      <Radar
                        name="Completion Rate"
                        dataKey="value"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-surface-800/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-white/[0.06]">
                                <p className="font-semibold text-white">{data.fullName}</p>
                                <p className="text-sm text-emerald-400 font-bold">{data.value.toFixed(1)}% success</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Strategies Breakdown - Compact cards */}
      {insights && insights.strategy_stats.length > 0 && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              All Strategies Ranked
            </h2>
            <p className="text-sm text-surface-400">
              Your personal ranking based on completion rates. Higher = works better for you.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {insights.strategy_stats.map((stat, index) => {
              const info = STRATEGY_INFO[stat.strategy];
              const isBest = stat.strategy === insights.best_strategy;
              const isWorst = stat.strategy === insights.worst_strategy && stat.total_interventions >= 3;

              return (
                <Card
                  key={stat.strategy}
                  variant="bordered"
                  className={cn(
                    'relative overflow-hidden transition-all duration-200 hover:shadow-md',
                    isBest && 'ring-2 ring-emerald-500/40 bg-emerald-500/5',
                    isWorst && 'bg-surface-800/50 opacity-75'
                  )}
                >
                  {/* Rank badge */}
                  <div className={cn(
                    'absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold',
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow' :
                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                    index === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-white' :
                    'bg-surface-700 text-surface-400'
                  )}>
                    {index + 1}
                  </div>

                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        isBest ? 'bg-emerald-500/15 text-emerald-400' : 'bg-surface-700 text-surface-400'
                      )}>
                        {STRATEGY_ICONS[stat.strategy]}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white text-sm truncate">
                          {info?.name || stat.strategy}
                        </h3>
                        {isBest && (
                          <span className="text-xs text-emerald-400 font-medium">Your best</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-surface-400">Success</span>
                        <span className={cn(
                          'text-lg font-bold',
                          stat.completion_rate >= 0.7 ? 'text-emerald-400' :
                          stat.completion_rate >= 0.4 ? 'text-amber-400' :
                          'text-surface-400'
                        )}>
                          {formatPercent(stat.completion_rate)}
                        </span>
                      </div>
                      <Progress
                        value={stat.completion_rate}
                        max={1}
                        size="sm"
                        color={isBest ? 'success' : 'primary'}
                      />
                      <p className="text-xs text-surface-400">
                        {stat.successful_completions}/{stat.total_interventions} experiments
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}


      {/* No data yet */}
      {(!insights || insights.strategy_stats.length === 0) && !error && !loading && (
        <Card variant="bordered" className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-700 mb-4">
            <BarChart3 className="w-8 h-8 text-surface-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Insights Yet</h3>
          <p className="text-surface-400 mb-6 max-w-md mx-auto">
            Start checking in on your goals to discover your personal motivation formula
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/goals">
              <Button>
                <Target className="w-4 h-4 mr-2" />
                Go to Goals
              </Button>
            </Link>
            <Link href="/experiment">
              <Button variant="outline">
                Try Simulation
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function InsightsPage() {
  return (
    <ProtectedRoute>
      <InsightsContent />
    </ProtectedRoute>
  );
}
