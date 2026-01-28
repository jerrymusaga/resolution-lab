'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import Progress from '@/components/ui/Progress';
import {
  getUserInsights,
  getStrategyComparison,
  getRecommendation,
  getFormulaStatus,
  applyFormula,
  clearFormula,
  FormulaStatus
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
  CheckCircle2,
  Loader2
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [revealStep, setRevealStep] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  // Formula state
  const [formulaStatus, setFormulaStatus] = useState<FormulaStatus | null>(null);
  const [applyingFormula, setApplyingFormula] = useState(false);
  const [formulaMessage, setFormulaMessage] = useState<string | null>(null);

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

      const [insightsData, comparisonData, recData, formulaData] = await Promise.all([
        getUserInsights(uid).catch(() => null),
        getStrategyComparison(uid).catch(() => null),
        getRecommendation(uid).catch(() => ({ recommendation: '', evaluation: null })),
        getFormulaStatus(uid).catch(() => null),
      ]);

      setInsights(insightsData);
      setComparison(comparisonData);
      setRecommendation(recData?.recommendation || '');
      setRecommendationEval(recData?.evaluation || null);
      setFormulaStatus(formulaData);
    } catch (err) {
      console.error('Failed to load insights:', err);
      setError('Failed to load insights. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Formula handlers
  const handleApplyFormula = async () => {
    if (!userId || !insights?.best_strategy) return;

    setApplyingFormula(true);
    setFormulaMessage(null);

    try {
      const result = await applyFormula(userId, insights.best_strategy);
      if (result.success) {
        setFormulaMessage(`Formula applied! Your AI coach will now prioritize ${STRATEGY_INFO[insights.best_strategy]?.name || insights.best_strategy}.`);
        // Refresh formula status
        const newStatus = await getFormulaStatus(userId);
        setFormulaStatus(newStatus);
      } else {
        setFormulaMessage(result.reason || 'Failed to apply formula');
      }
    } catch (err) {
      console.error('Failed to apply formula:', err);
      setFormulaMessage('Failed to apply formula. Please try again.');
    } finally {
      setApplyingFormula(false);
    }
  };

  const handleClearFormula = async () => {
    if (!userId) return;

    setApplyingFormula(true);
    setFormulaMessage(null);

    try {
      const result = await clearFormula(userId);
      if (result.success) {
        setFormulaMessage('Formula cleared. Your AI coach will continue exploring strategies.');
        // Refresh formula status
        const newStatus = await getFormulaStatus(userId);
        setFormulaStatus(newStatus);
      } else {
        setFormulaMessage('Failed to clear formula');
      }
    } catch (err) {
      console.error('Failed to clear formula:', err);
      setFormulaMessage('Failed to clear formula. Please try again.');
    } finally {
      setApplyingFormula(false);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
            <Brain className="w-10 h-10 text-primary-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-6 text-lg text-gray-600 animate-pulse">Analyzing your motivation patterns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Lightbulb className="w-7 h-7 text-yellow-500" />
            Your Insights
          </h1>
          <p className="text-gray-500 mt-1">
            Discover what truly motivates you
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => loadInsights(userId)}
          className="mt-4 sm:mt-0"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card variant="bordered" className="mb-6 border-red-200 bg-red-50">
          <CardContent className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Not enough data - Beautiful CTA */}
      {!hasEnoughData && (
        <Card variant="bordered" className="mb-8 overflow-hidden">
          <div className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white">
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
                  <Button className="bg-white text-purple-600 hover:bg-white/90">
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
          <Card variant="bordered" className="overflow-hidden border-0 shadow-2xl">
            {/* Gradient header */}
            <div className="relative bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white px-6 py-8 sm:px-10 sm:py-12">
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
            <CardContent className="p-6 sm:p-10 bg-gradient-to-b from-gray-50 to-white">
              {/* Best Strategy - THE HERO */}
              <div className={cn(
                "transition-all duration-500 delay-200",
                revealStep >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}>
                <div className="relative bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 sm:p-8 border-2 border-emerald-200 mb-6">
                  {/* Trophy badge */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    #1 BEST FOR YOU
                  </div>

                  <div className="text-center mt-4">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white mb-4 shadow-lg">
                      {bestStrategy && STRATEGY_ICONS[bestStrategy.key]}
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                      {bestStrategy?.info?.name}
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      {bestStrategy?.info?.description}
                    </p>

                    {/* Big success number */}
                    <div className="inline-block bg-white rounded-xl px-8 py-4 shadow-sm border border-emerald-100">
                      <div className="text-5xl sm:text-6xl font-bold text-emerald-600">
                        {formatPercent(bestStrategy?.stats?.completion_rate || 0)}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">Success Rate</div>
                    </div>

                    {/* Example message */}
                    <div className="mt-6 bg-white/80 rounded-lg p-4 border border-emerald-100 max-w-md mx-auto">
                      <p className="text-sm text-gray-500 mb-1">Example message:</p>
                      <p className="text-gray-700 italic">"{bestStrategy?.info?.example}"</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* VS Divider */}
              <div className={cn(
                "flex items-center justify-center my-6 transition-all duration-500 delay-300",
                revealStep >= 2 ? "opacity-100 scale-100" : "opacity-0 scale-50"
              )}>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-gray-300" />
                <div className="mx-4 flex items-center gap-3">
                  {improvementPercent > 0 && (
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-full font-bold text-lg shadow-md">
                      +{improvementPercent}% better
                    </div>
                  )}
                </div>
                <div className="flex-1 h-px bg-gradient-to-l from-transparent via-gray-300 to-gray-300" />
              </div>

              {/* Worst Strategy - Smaller, less prominent */}
              <div className={cn(
                "transition-all duration-500 delay-400",
                revealStep >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}>
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0">
                      {worstStrategy && STRATEGY_ICONS[worstStrategy.key]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Least Effective</span>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-700 truncate">
                        {worstStrategy?.info?.name}
                      </h4>
                      <p className="text-sm text-gray-500 truncate">
                        {worstStrategy?.info?.description}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-bold text-gray-400">
                        {formatPercent(worstStrategy?.stats?.completion_rate || 0)}
                      </div>
                      <div className="text-xs text-gray-400">Success Rate</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* What This Means */}
              <div className={cn(
                "mt-8 transition-all duration-500 delay-500",
                revealStep >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}>
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-6 border border-amber-200">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                        <Lightbulb className="w-6 h-6 text-amber-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-900">What This Means For You</h4>
                        {/* Evaluation Badge */}
                        {recommendationEval && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">AI Insight Quality</span>
                            <span className={cn(
                              "text-sm font-bold px-2 py-0.5 rounded-full",
                              recommendationEval.grade === 'A' ? "bg-emerald-100 text-emerald-700" :
                              recommendationEval.grade === 'B' ? "bg-blue-100 text-blue-700" :
                              recommendationEval.grade === 'C' ? "bg-amber-100 text-amber-700" :
                              recommendationEval.grade === 'D' ? "bg-orange-100 text-orange-700" :
                              "bg-red-100 text-red-700"
                            )}>
                              {recommendationEval.grade}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-gray-700 leading-relaxed">
                        {recommendation || `You respond ${improvementPercent}% better to ${bestStrategy?.info?.name?.toLowerCase()} than ${worstStrategy?.info?.name?.toLowerCase()}. When you need motivation, messages that ${bestStrategy?.info?.description?.toLowerCase()} will be most effective for you.`}
                      </p>
                      {/* Evaluation breakdown */}
                      {recommendationEval?.breakdown && (
                        <div className="mt-4 pt-4 border-t border-amber-200">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
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
                                <div className="text-lg font-bold text-amber-700">
                                  {(metric.value * 100).toFixed(0)}%
                                </div>
                                <div className="text-xs text-gray-500">{metric.label}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Apply My Formula Section */}
              <div className={cn(
                "mt-8 transition-all duration-500 delay-600",
                revealStep >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}>
                {formulaStatus?.formula_applied ? (
                  // Formula is active
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border-2 border-emerald-200">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 mb-1">Formula Active!</h4>
                        <p className="text-gray-600 mb-4">
                          Your AI coach is using <span className="font-semibold text-emerald-600">{STRATEGY_INFO[formulaStatus.preferred_strategy as InterventionStrategy]?.name || formulaStatus.preferred_strategy}</span> as your preferred strategy.
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                          <Link href="/agent">
                            <Button className="bg-emerald-600 hover:bg-emerald-700">
                              <Rocket className="w-4 h-4 mr-2" />
                              Chat with AI Coach
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            onClick={handleClearFormula}
                            disabled={applyingFormula}
                            className="border-gray-300"
                          >
                            {applyingFormula ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Reset & Keep Exploring
                          </Button>
                        </div>
                        {formulaMessage && (
                          <p className="mt-3 text-sm text-emerald-600">{formulaMessage}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : formulaStatus?.ready_to_apply ? (
                  // Ready to apply formula
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border-2 border-purple-200">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                          <Rocket className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 mb-1">Apply Your Formula</h4>
                        <p className="text-gray-600 mb-4">
                          Ready to put your discovery into action? Apply your formula and your AI coach will prioritize <span className="font-semibold text-purple-600">{bestStrategy?.info?.name}</span> when motivating you.
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                          <Button
                            onClick={handleApplyFormula}
                            disabled={applyingFormula}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            {applyingFormula ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4 mr-2" />
                            )}
                            Apply My Formula
                          </Button>
                          <Link href="/agent">
                            <Button variant="outline">
                              Chat with AI Coach
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </Link>
                        </div>
                        {formulaMessage && (
                          <p className="mt-3 text-sm text-purple-600">{formulaMessage}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Not enough data yet
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                          <FlaskConical className="w-6 h-6 text-gray-500" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 mb-1">Keep Experimenting</h4>
                        <p className="text-gray-600 mb-4">
                          You need more data before applying your formula. Continue using the app and we'll let you know when you have enough insights.
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                          <Link href="/goals">
                            <Button variant="outline">
                              <Target className="w-4 h-4 mr-2" />
                              Do a Check-in
                            </Button>
                          </Link>
                          <Link href="/experiment">
                            <Button variant="outline">
                              Run Simulation
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary Stats - Cleaner design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card variant="bordered" className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
          <CardContent className="text-center py-5">
            <FlaskConical className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900">
              {insights?.data_points_collected || 0}
            </p>
            <p className="text-sm text-gray-600">Experiments Run</p>
          </CardContent>
        </Card>

        <Card variant="bordered" className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100">
          <CardContent className="text-center py-5">
            <Brain className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900">
              {insights?.strategies_tested || 0}<span className="text-lg text-gray-400">/8</span>
            </p>
            <p className="text-sm text-gray-600">Strategies Tested</p>
          </CardContent>
        </Card>

        <Card variant="bordered" className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
          <CardContent className="text-center py-5">
            <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900">
              {formatPercent(insights?.overall_completion_rate || 0)}
            </p>
            <p className="text-sm text-gray-600">Overall Success</p>
          </CardContent>
        </Card>

        <Card variant="bordered" className={cn(
          "border-2",
          insights?.experiment_phase === 'optimizing'
            ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
            : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200'
        )}>
          <CardContent className="text-center py-5">
            {insights?.experiment_phase === 'optimizing' ? (
              <Rocket className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            ) : (
              <FlaskConical className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            )}
            <p className={cn(
              "text-lg font-bold",
              insights?.experiment_phase === 'optimizing' ? 'text-emerald-600' : 'text-amber-600'
            )}>
              {insights?.experiment_phase === 'optimizing' ? 'Optimizing' : 'Exploring'}
            </p>
            <p className="text-sm text-gray-600">Current Phase</p>
          </CardContent>
        </Card>
      </div>

      {/* Strategy Performance Chart - Enhanced */}
      {chartData.length > 0 && (
        <Card variant="bordered" className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-600" />
              Strategy Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Bar Chart */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-4 text-center">Completion Rate by Strategy</h4>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={70}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const isBest = data.strategy === insights?.best_strategy;
                            return (
                              <div className="bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-200">
                                <p className="font-semibold text-gray-900 flex items-center gap-2">
                                  {data.fullName}
                                  {isBest && <Award className="w-4 h-4 text-yellow-500" />}
                                </p>
                                <div className="mt-2 space-y-1">
                                  <p className="text-sm">
                                    <span className="text-gray-500">Success Rate: </span>
                                    <span className="font-bold text-emerald-600">{data.completionRate.toFixed(1)}%</span>
                                  </p>
                                  <p className="text-sm">
                                    <span className="text-gray-500">Sample Size: </span>
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
                <h4 className="text-sm font-medium text-gray-500 mb-4 text-center">Your Motivation Profile</h4>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis
                        dataKey="strategy"
                        tick={{ fill: '#6b7280', fontSize: 11 }}
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
                              <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200">
                                <p className="font-semibold text-gray-900">{data.fullName}</p>
                                <p className="text-sm text-emerald-600 font-bold">{data.value.toFixed(1)}% success</p>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            All Strategies Ranked
          </h2>
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
                    isBest && 'ring-2 ring-emerald-400 bg-emerald-50/50',
                    isWorst && 'bg-gray-50/50 opacity-75'
                  )}
                >
                  {/* Rank badge */}
                  <div className={cn(
                    'absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold',
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow' :
                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                    index === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-white' :
                    'bg-gray-100 text-gray-500'
                  )}>
                    {index + 1}
                  </div>

                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        isBest ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'
                      )}>
                        {STRATEGY_ICONS[stat.strategy]}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">
                          {info?.name || stat.strategy}
                        </h3>
                        {isBest && (
                          <span className="text-xs text-emerald-600 font-medium">Your best</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Success</span>
                        <span className={cn(
                          'text-lg font-bold',
                          stat.completion_rate >= 0.7 ? 'text-emerald-600' :
                          stat.completion_rate >= 0.4 ? 'text-amber-600' :
                          'text-gray-400'
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
                      <p className="text-xs text-gray-400">
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Insights Yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
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
