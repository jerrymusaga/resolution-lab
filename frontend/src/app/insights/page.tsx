'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import Progress from '@/components/ui/Progress';
import StrategyCard from '@/components/StrategyCard';
import { 
  getOrCreateUserId, 
  getUserInsights,
  getStrategyComparison,
  getRecommendation
} from '@/lib/api';
import { UserInsights, InsightsComparison } from '@/types';
import { formatPercent, getStrategyColor } from '@/lib/utils';
import { 
  BarChart3, 
  TrendingUp, 
  FlaskConical,
  Sparkles,
  Target,
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
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

export default function InsightsPage() {
  const [userId, setUserId] = useState<string>('');
  const [insights, setInsights] = useState<UserInsights | null>(null);
  const [comparison, setComparison] = useState<InsightsComparison | null>(null);
  const [recommendation, setRecommendation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = getOrCreateUserId();
    setUserId(id);
    loadInsights(id);
  }, []);

  const loadInsights = async (uid: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const [insightsData, comparisonData, recData] = await Promise.all([
        getUserInsights(uid).catch(() => null),
        getStrategyComparison(uid).catch(() => null),
        getRecommendation(uid).catch(() => ({ recommendation: '' })),
      ]);
      
      setInsights(insightsData);
      setComparison(comparisonData);
      setRecommendation(recData?.recommendation || '');
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
      name: c.strategy_name.split(' ')[0], // Shorten names for chart
      fullName: c.strategy_name,
      completionRate: c.completion_rate * 100,
      effectiveness: c.effectiveness_score * 100,
      samples: c.sample_size,
      fill: getStrategyColor(index),
    })) || [];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-200 rounded-xl" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasEnoughData = (insights?.data_points_collected || 0) >= 5;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Insights</h1>
          <p className="text-gray-500 mt-1">
            Personal experiment results - discover what motivates you
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

      {/* Not enough data message */}
      {!hasEnoughData && (
        <Card variant="bordered" className="mb-8 bg-gradient-to-r from-primary-50 to-purple-50">
          <CardContent className="text-center py-8">
            <FlaskConical className="w-12 h-12 text-primary-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Still Collecting Data
            </h3>
            <p className="text-gray-600 mb-4 max-w-md mx-auto">
              We need at least 10-20 check-ins to find reliable patterns in what motivates you.
              <br />
              <span className="font-medium">
                Current: {insights?.data_points_collected || 0} data points
              </span>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/goals">
                <Button>
                  <Target className="w-4 h-4 mr-2" />
                  Do a Check-in
                </Button>
              </Link>
              <Link href="/experiment">
                <Button variant="outline">
                  Try Simulation Demo
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Card variant="bordered">
          <CardContent className="text-center py-4">
            <p className="text-3xl font-bold text-gray-900">
              {insights?.data_points_collected || 0}
            </p>
            <p className="text-sm text-gray-500">Data Points</p>
          </CardContent>
        </Card>
        
        <Card variant="bordered">
          <CardContent className="text-center py-4">
            <p className="text-3xl font-bold text-gray-900">
              {insights?.strategies_tested || 0}/8
            </p>
            <p className="text-sm text-gray-500">Strategies Tested</p>
          </CardContent>
        </Card>
        
        <Card variant="bordered">
          <CardContent className="text-center py-4">
            <p className="text-3xl font-bold text-primary-600">
              {formatPercent(insights?.overall_completion_rate || 0)}
            </p>
            <p className="text-sm text-gray-500">Overall Success</p>
          </CardContent>
        </Card>
        
        <Card variant="bordered">
          <CardContent className="text-center py-4">
            <p className={`text-lg font-bold ${insights?.experiment_phase === 'optimizing' ? 'text-green-600' : 'text-yellow-600'}`}>
              {insights?.experiment_phase === 'optimizing' ? '🎯 Optimizing' : '🔬 Exploring'}
            </p>
            <p className="text-sm text-gray-500">Experiment Phase</p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendation */}
      {recommendation && hasEnoughData && (
        <Card variant="elevated" className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900 mb-1">Your Personal Insight</h3>
              <p className="text-green-800">{recommendation}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <Card variant="bordered" className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-primary-600" />
              Strategy Performance Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number" 
                    domain={[0, 100]} 
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={80}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Completion Rate']}
                    labelFormatter={(label) => label}
                  />
                  <Bar 
                    dataKey="completionRate" 
                    name="completionRate"
                    radius={[0, 4, 4, 0]}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-gray-500 text-center mt-4">
              Completion rate by strategy • Higher is better
            </p>
          </CardContent>
        </Card>
      )}

      {/* Strategy Cards */}
      {insights && insights.strategy_stats.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
            Strategy Breakdown
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {insights.strategy_stats.map((stat, index) => (
              <StrategyCard
                key={stat.strategy}
                stats={stat}
                rank={index + 1}
                isBest={stat.strategy === insights.best_strategy}
                isWorst={stat.strategy === insights.worst_strategy}
              />
            ))}
          </div>
        </div>
      )}

      {/* No strategies tested yet */}
      {(!insights || insights.strategy_stats.length === 0) && !error && (
        <Card variant="bordered" className="text-center py-12">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No data yet</h3>
          <p className="text-gray-500 mb-4">
            Start checking in on your goals to see strategy insights
          </p>
          <Link href="/goals">
            <Button>
              Go to Goals
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
