'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@/components/ui';
import Progress from '@/components/ui/Progress';
import { getOrCreateUserId, simulateExperiment, getFormulaStatus, applyFormula, clearFormula, FormulaStatus } from '@/lib/api';
import { SimulationResult, STRATEGY_INFO, InterventionStrategy } from '@/types';
import { getStrategyColor } from '@/lib/utils';
import {
  FlaskConical,
  Play,
  BarChart3,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Brain,
  Target,
  TrendingUp,
  Lightbulb,
  Info,
  ChevronDown,
  ChevronUp,
  Trophy,
  Beaker,
  Zap,
  HelpCircle,
  Award,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

// Strategy icons mapping
const STRATEGY_ICONS: Record<string, string> = {
  gentle_reminder: '🌟',
  accountability: '✅',
  streak_gamification: '🔥',
  social_comparison: '👥',
  loss_aversion: '⚠️',
  reward_preview: '🎁',
  identity_reinforcement: '💪',
  micro_commitment: '🎯',
};

export default function ExperimentPage() {
  const [goalTitle, setGoalTitle] = useState('Exercise for 30 minutes');
  const [numInterventions, setNumInterventions] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [showSimulations, setShowSimulations] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Formula state
  const [formulaStatus, setFormulaStatus] = useState<FormulaStatus | null>(null);
  const [applyingFormula, setApplyingFormula] = useState(false);
  const [formulaMessage, setFormulaMessage] = useState<string | null>(null);

  // Fetch formula status on mount and after simulation
  useEffect(() => {
    const fetchFormulaStatus = async () => {
      try {
        const userId = getOrCreateUserId();
        const status = await getFormulaStatus(userId);
        setFormulaStatus(status);
      } catch (err) {
        console.error('Failed to fetch formula status:', err);
      }
    };
    fetchFormulaStatus();
  }, [result]); // Re-fetch when result changes

  const handleApplyFormula = async () => {
    try {
      setApplyingFormula(true);
      setFormulaMessage(null);
      const userId = getOrCreateUserId();
      const response = await applyFormula(userId);
      if (response.success) {
        setFormulaMessage(response.message || 'Formula applied successfully!');
        // Refresh formula status
        const status = await getFormulaStatus(userId);
        setFormulaStatus(status);
      } else {
        setFormulaMessage(response.reason || 'Failed to apply formula');
      }
    } catch (err) {
      setFormulaMessage('Failed to apply formula. Please try again.');
    } finally {
      setApplyingFormula(false);
    }
  };

  const handleClearFormula = async () => {
    try {
      setApplyingFormula(true);
      setFormulaMessage(null);
      const userId = getOrCreateUserId();
      const response = await clearFormula(userId);
      if (response.success) {
        setFormulaMessage(response.message || 'Formula cleared. Back to experimenting!');
        // Refresh formula status
        const status = await getFormulaStatus(userId);
        setFormulaStatus(status);
      }
    } catch (err) {
      setFormulaMessage('Failed to clear formula. Please try again.');
    } finally {
      setApplyingFormula(false);
    }
  };

  const runSimulation = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const userId = getOrCreateUserId();
      const data = await simulateExperiment(userId, goalTitle, numInterventions);

      setResult(data);
      setShowSimulations(false);
    } catch (err) {
      console.error('Simulation failed:', err);
      setError('Failed to run simulation. Make sure the backend is running on localhost:8000');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats for visualization
  const totalSuccesses = result?.simulations.filter(s => s.completed).length || 0;
  const totalFailures = result?.simulations.filter(s => !s.completed).length || 0;

  // Prepare chart data
  const chartData = result?.insights.strategy_stats
    .filter(s => s.total_interventions > 0)
    .sort((a, b) => b.completion_rate - a.completion_rate)
    .map((s, index) => ({
      name: STRATEGY_INFO[s.strategy as keyof typeof STRATEGY_INFO]?.name || s.strategy,
      shortName: s.strategy.split('_')[0],
      icon: STRATEGY_ICONS[s.strategy] || '📊',
      completionRate: Math.round(s.completion_rate * 100),
      effectiveness: Math.round(s.effectiveness_score * 100),
      samples: s.total_interventions,
      successes: s.successful_completions,
      fill: getStrategyColor(index),
      strategy: s.strategy,
    })) || [];

  // Get best and worst strategy info
  const bestStrategyData = chartData[0];
  const worstStrategyData = chartData[chartData.length - 1];
  const improvement = bestStrategyData && worstStrategyData
    ? bestStrategyData.completionRate - worstStrategyData.completionRate
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 px-4 py-2 rounded-full text-sm mb-4">
          <FlaskConical className="w-4 h-4" />
          <span>Interactive Demo</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Experiment Simulator
        </h1>
        <p className="text-gray-600 mt-2 max-w-2xl mx-auto text-lg">
          Watch how our AI learns which motivation strategies work best through simulated experiments
        </p>
      </div>

      {/* What is this? Explainer */}
      <Card variant="bordered" className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="py-4">
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <HelpCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">What does this simulation do?</h3>
                <p className="text-sm text-gray-600">Click to learn how the experiment works</p>
              </div>
            </div>
            {showHowItWorks ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showHowItWorks && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Beaker className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">1. Explore All Strategies</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      First, we try each of the 8 motivation strategies at least 3 times to gather baseline data
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Brain className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">2. Learn What Works</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      We calculate effectiveness scores based on success rate, response time, and user sentiment
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Target className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">3. Optimize Over Time</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Uses epsilon-greedy algorithm: 80% best strategy, 20% exploring others to keep learning
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-white rounded-lg border border-blue-100">
                <p className="text-sm text-gray-700">
                  <strong className="text-gray-900">Why this matters:</strong> Everyone responds differently to motivation.
                  Some people thrive with accountability, others prefer gentle reminders. This algorithm finds YOUR formula.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card variant="bordered" className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2 text-yellow-500" />
            Configure Your Simulation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Goal to Simulate
              </label>
              <Input
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="Enter a goal to simulate"
                className="text-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                This is the goal the AI will generate motivation messages for
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Check-ins
              </label>
              <Input
                type="number"
                min={10}
                max={100}
                value={numInterventions}
                onChange={(e) => setNumInterventions(parseInt(e.target.value) || 30)}
              />
              <p className="text-xs text-gray-500 mt-1">
                More check-ins = more accurate results
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Info className="w-4 h-4" />
              <span>Simulates {numInterventions} days of motivation experiments</span>
            </div>
            <Button
              onClick={runSimulation}
              isLoading={loading}
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              <Play className="w-4 h-4 mr-2" />
              {loading ? 'Running Experiment...' : 'Start Simulation'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card variant="bordered" className="mb-6">
          <CardContent className="py-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4 animate-pulse">
                <FlaskConical className="w-8 h-8 text-purple-600 animate-bounce" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Running Experiment...</h3>
              <p className="text-gray-600 mb-4">
                Testing {numInterventions} motivation strategies for &quot;{goalTitle}&quot;
              </p>
              <div className="max-w-md mx-auto">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full animate-pulse w-3/4"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card variant="bordered" className="mb-6 border-red-200 bg-red-50">
          <CardContent className="flex items-start space-x-3 py-4">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 font-medium">Connection Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <p className="text-red-500 text-xs mt-2">
                Make sure to run: <code className="bg-red-100 px-1 rounded">uvicorn main:app --reload</code> in the backend folder
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Success Banner */}
          <Card variant="elevated" className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-green-200">
            <CardContent className="py-6">
              <div className="flex items-center justify-center space-x-3 mb-6">
                <div className="p-2 bg-green-100 rounded-full">
                  <Sparkles className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Experiment Complete!</h2>
              </div>

              {/* Key Finding */}
              <div className="text-center mb-6 p-4 bg-white rounded-xl border border-green-200">
                <p className="text-sm text-gray-500 uppercase tracking-wide mb-1">Key Finding</p>
                <p className="text-xl text-gray-900">
                  <span className="font-bold text-green-600">
                    {STRATEGY_ICONS[bestStrategyData?.strategy || '']} {bestStrategyData?.name}
                  </span>
                  {' '}performed best with a{' '}
                  <span className="font-bold text-green-600">{bestStrategyData?.completionRate}%</span>
                  {' '}success rate
                </p>
                {improvement > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    That&apos;s <span className="font-semibold text-green-600">{improvement}% better</span> than the lowest performing strategy
                  </p>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                  <p className="text-3xl font-bold text-gray-900">
                    {result.insights.total_interventions}
                  </p>
                  <p className="text-sm text-gray-500">Total Check-ins</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                  <p className="text-3xl font-bold text-gray-900">
                    {result.insights.strategies_tested}
                  </p>
                  <p className="text-sm text-gray-500">Strategies Tested</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                  <p className="text-3xl font-bold text-green-600">
                    {totalSuccesses}
                  </p>
                  <p className="text-sm text-gray-500">Successes</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                  <p className="text-3xl font-bold text-gray-900">
                    {result.insights.experiment_phase === 'optimizing' ? '🎯 Optimizing' : '🔬 Exploring'}
                  </p>
                  <p className="text-sm text-gray-500">Current Phase</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Apply Your Formula Card - NEW! */}
          <Card variant="elevated" className={cn(
            "border-2 transition-all",
            formulaStatus?.formula_applied
              ? "bg-gradient-to-r from-emerald-50 to-green-50 border-green-300"
              : "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300"
          )}>
            <CardContent className="py-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center space-x-4">
                  <div className={cn(
                    "p-3 rounded-full",
                    formulaStatus?.formula_applied ? "bg-green-100" : "bg-amber-100"
                  )}>
                    {formulaStatus?.formula_applied ? (
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    ) : (
                      <Zap className="w-8 h-8 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {formulaStatus?.formula_applied
                        ? "Your Formula is Active!"
                        : "Apply Your Motivation Formula"
                      }
                    </h3>
                    <p className="text-gray-600 mt-1">
                      {formulaStatus?.formula_applied ? (
                        <>
                          The AI is now using <span className="font-semibold text-green-700">
                            {STRATEGY_ICONS[formulaStatus.preferred_strategy || '']} {
                              STRATEGY_INFO[formulaStatus.preferred_strategy as keyof typeof STRATEGY_INFO]?.name || formulaStatus.preferred_strategy
                            }
                          </span> for your check-ins (90% of the time)
                        </>
                      ) : (
                        <>
                          Lock in <span className="font-semibold text-amber-700">
                            {STRATEGY_ICONS[bestStrategyData?.strategy || '']} {bestStrategyData?.name}
                          </span> as your preferred strategy so the AI uses it automatically
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                  {formulaStatus?.formula_applied ? (
                    <Button
                      variant="outline"
                      onClick={handleClearFormula}
                      isLoading={applyingFormula}
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Resume Experimenting
                    </Button>
                  ) : (
                    <Button
                      onClick={handleApplyFormula}
                      isLoading={applyingFormula}
                      size="lg"
                      className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-lg"
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      Apply My Formula
                    </Button>
                  )}
                  {formulaMessage && (
                    <p className={cn(
                      "text-sm font-medium",
                      formulaMessage.includes('success') || formulaMessage.includes('active')
                        ? "text-green-600"
                        : "text-amber-600"
                    )}>
                      {formulaMessage}
                    </p>
                  )}
                </div>
              </div>

              {/* What happens when formula is applied */}
              <div className={cn(
                "mt-4 p-4 rounded-lg border",
                formulaStatus?.formula_applied
                  ? "bg-white border-green-200"
                  : "bg-white border-amber-200"
              )}>
                <p className="text-sm text-gray-600">
                  {formulaStatus?.formula_applied ? (
                    <>
                      <strong className="text-green-700">What&apos;s happening now:</strong> When you use the AI Agent,
                      it will prioritize your best strategy. You&apos;ll still see occasional variety (10%) to keep learning.
                    </>
                  ) : (
                    <>
                      <strong className="text-amber-700">What this does:</strong> The AI Agent will use your winning strategy
                      90% of the time, while still exploring 10% to keep improving. Your formula can be updated anytime.
                    </>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Custom Opik Evaluators Summary - NEW! */}
          {result.evaluation_summary && result.evaluation_summary.total_evaluated > 0 && (
            <Card variant="bordered" className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="w-5 h-5 mr-2 text-indigo-600" />
                  Custom Opik Evaluators
                  <span className="ml-2 text-xs font-normal bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                    AI Quality Assessment
                  </span>
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Every generated message was evaluated by our custom Opik evaluators for quality
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Average Score */}
                  <div className="bg-white rounded-xl p-6 border border-indigo-100">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-gray-600">Average Quality Score</span>
                      <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {result.evaluation_summary.total_evaluated} messages
                      </span>
                    </div>
                    <div className="flex items-end space-x-3">
                      <span className="text-4xl font-bold text-indigo-600">
                        {(result.evaluation_summary.average_score * 100).toFixed(0)}%
                      </span>
                      <span className={cn(
                        "text-lg font-semibold mb-1",
                        result.evaluation_summary.average_score >= 0.7 ? "text-green-600" :
                        result.evaluation_summary.average_score >= 0.5 ? "text-yellow-600" :
                        "text-red-600"
                      )}>
                        {result.evaluation_summary.average_score >= 0.85 ? "Excellent" :
                         result.evaluation_summary.average_score >= 0.7 ? "Good" :
                         result.evaluation_summary.average_score >= 0.55 ? "Fair" : "Needs Work"}
                      </span>
                    </div>
                    <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                        style={{ width: `${result.evaluation_summary.average_score * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Grade Distribution */}
                  <div className="bg-white rounded-xl p-6 border border-indigo-100">
                    <span className="text-sm font-medium text-gray-600 block mb-4">Grade Distribution</span>
                    <div className="flex items-end justify-between h-24">
                      {['A', 'B', 'C', 'D', 'F'].map((grade) => {
                        const count = result.evaluation_summary?.grade_distribution?.[grade] || 0;
                        const total = result.evaluation_summary?.total_evaluated || 1;
                        const percentage = (count / total) * 100;
                        const gradeColors: Record<string, string> = {
                          A: 'bg-emerald-500',
                          B: 'bg-blue-500',
                          C: 'bg-amber-500',
                          D: 'bg-orange-500',
                          F: 'bg-red-500'
                        };
                        return (
                          <div key={grade} className="flex flex-col items-center flex-1">
                            <div className="w-full px-1">
                              <div
                                className={cn(
                                  "w-full rounded-t transition-all",
                                  gradeColors[grade]
                                )}
                                style={{ height: `${Math.max(percentage * 0.8, count > 0 ? 8 : 0)}px` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 mt-1">{grade}</span>
                            <span className="text-xs text-gray-400">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Evaluation Dimensions */}
                <div className="mt-4 p-4 bg-white rounded-lg border border-indigo-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Evaluated Dimensions
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { name: 'Strategy Alignment', desc: 'Message matches intended strategy', color: 'indigo' },
                      { name: 'Motivation Power', desc: 'Likely to motivate action', color: 'purple' },
                      { name: 'Personalization', desc: 'Feels tailored, not generic', color: 'violet' },
                      { name: 'Tone Consistency', desc: 'Tone matches strategy style', color: 'fuchsia' },
                    ].map((dim) => (
                      <div key={dim.name} className={`p-3 rounded-lg bg-${dim.color}-50 border border-${dim.color}-100`}>
                        <span className={`text-sm font-medium text-${dim.color}-700`}>{dim.name}</span>
                        <p className="text-xs text-gray-500 mt-0.5">{dim.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Strategy Rankings */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                Strategy Rankings
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Strategies ranked by how often you completed your goal when using them
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {chartData.map((strategy, index) => {
                  const isBest = index === 0;
                  const isWorst = index === chartData.length - 1;
                  const info = STRATEGY_INFO[strategy.strategy as keyof typeof STRATEGY_INFO];

                  return (
                    <div
                      key={strategy.strategy}
                      className={`p-4 rounded-lg border transition-all ${
                        isBest
                          ? 'bg-green-50 border-green-200 ring-2 ring-green-500 ring-opacity-50'
                          : isWorst && chartData.length > 2
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                            isBest ? 'bg-green-100' : isWorst && chartData.length > 2 ? 'bg-red-100' : 'bg-gray-200'
                          }`}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{strategy.icon}</span>
                              <span className="font-semibold text-gray-900">{strategy.name}</span>
                              {isBest && (
                                <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                  Best for you
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{info?.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${isBest ? 'text-green-600' : 'text-gray-900'}`}>
                            {strategy.completionRate}%
                          </p>
                          <p className="text-xs text-gray-500">
                            {strategy.successes}/{strategy.samples} completed
                          </p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isBest ? 'bg-green-500' : isWorst && chartData.length > 2 ? 'bg-red-400' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${strategy.completionRate}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Visual Chart */}
          {chartData.length > 0 && (
            <Card variant="bordered">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
                  Visual Comparison
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  See how each strategy performed at a glance
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={140}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-3 rounded-lg shadow-lg border">
                                <p className="font-semibold text-gray-900">{data.icon} {data.name}</p>
                                <p className="text-sm text-gray-600">Success Rate: <span className="font-medium text-green-600">{data.completionRate}%</span></p>
                                <p className="text-sm text-gray-600">Samples: {data.samples} check-ins</p>
                                <p className="text-sm text-gray-600">Successes: {data.successes}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="completionRate"
                        radius={[0, 4, 4, 0]}
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index === 0 ? '#22c55e' : entry.fill}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* What This Means For You */}
          <Card variant="bordered" className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                What This Means For You
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="p-1.5 bg-green-100 rounded-full">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Your Best Strategy</p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">{bestStrategyData?.icon} {bestStrategyData?.name}</span> messages
                      worked {bestStrategyData?.completionRate}% of the time. In a real app, we&apos;d use this strategy
                      80% of the time to maximize your success.
                    </p>
                  </div>
                </div>

                {worstStrategyData && chartData.length > 2 && (
                  <div className="flex items-start space-x-3">
                    <div className="p-1.5 bg-orange-100 rounded-full">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Strategies to Avoid</p>
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">{STRATEGY_ICONS[worstStrategyData?.strategy]} {worstStrategyData?.name}</span> only
                        worked {worstStrategyData?.completionRate}% of the time. We&apos;d reduce using this approach.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start space-x-3">
                  <div className="p-1.5 bg-purple-100 rounded-full">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Continuous Learning</p>
                    <p className="text-sm text-gray-600">
                      Even after finding your best strategy, we&apos;d still explore others 20% of the time.
                      This helps discover if your preferences change over time.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Simulation Log (Collapsible) */}
          <Card variant="bordered">
            <CardHeader>
              <button
                className="w-full flex items-center justify-between"
                onClick={() => setShowSimulations(!showSimulations)}
              >
                <CardTitle className="flex items-center">
                  <FlaskConical className="w-5 h-5 mr-2 text-gray-400" />
                  Detailed Simulation Log
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    {result.simulations.length} iterations
                  </span>
                  {showSimulations ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>
            </CardHeader>
            {showSimulations && (
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                  Each row shows one simulated check-in: strategy used, message quality grade, and goal completion.
                </p>
                <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-2">
                  {result.simulations.map((sim, index) => {
                    const info = STRATEGY_INFO[sim.strategy as keyof typeof STRATEGY_INFO];
                    const gradeColors: Record<string, string> = {
                      A: 'bg-emerald-100 text-emerald-700',
                      B: 'bg-blue-100 text-blue-700',
                      C: 'bg-amber-100 text-amber-700',
                      D: 'bg-orange-100 text-orange-700',
                      F: 'bg-red-100 text-red-700'
                    };
                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${
                          sim.completed ? 'bg-green-50' : 'bg-red-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-gray-400 w-8 text-xs">#{sim.iteration}</span>
                          <span className="text-lg">{STRATEGY_ICONS[sim.strategy]}</span>
                          <span className="font-medium text-gray-900">
                            {info?.name || sim.strategy}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          {/* Evaluation Grade Badge */}
                          {sim.evaluation && (
                            <span className={cn(
                              "text-xs font-bold px-2 py-0.5 rounded-full",
                              gradeColors[sim.evaluation.grade] || 'bg-gray-100 text-gray-700'
                            )}>
                              {sim.evaluation.grade}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            sim.completed
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {sim.completed ? 'Completed' : 'Skipped'}
                          </span>
                          {sim.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Run Again */}
          <div className="text-center pt-4">
            <Button
              variant="outline"
              onClick={runSimulation}
              isLoading={loading}
              size="lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Run Another Simulation
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              Each simulation produces different results based on randomized success rates
            </p>
          </div>
        </div>
      )}

      {/* Initial State - Strategy Preview */}
      {!result && !loading && (
        <Card variant="bordered" className="bg-gray-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="w-5 h-5 mr-2 text-indigo-600" />
              The 8 Motivation Strategies We Test
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Each strategy uses a different psychological approach to motivation
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(STRATEGY_INFO).map(([key, info]) => (
                <div
                  key={key}
                  className="p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-2xl">{STRATEGY_ICONS[key]}</span>
                    <h4 className="font-semibold text-gray-900 text-sm">{info.name}</h4>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{info.description}</p>
                  <div className="p-2 bg-gray-50 rounded text-xs text-gray-500 italic">
                    &quot;{info.example}&quot;
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <p className="text-gray-600 mb-4">
                Ready to see which strategy works best? Click the button above to start the simulation!
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
