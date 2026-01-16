'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@/components/ui';
import Progress from '@/components/ui/Progress';
import { getOrCreateUserId, simulateExperiment } from '@/lib/api';
import { SimulationResult, STRATEGY_INFO } from '@/types';
import { formatPercent, getStrategyColor } from '@/lib/utils';
import { 
  FlaskConical, 
  Play,
  BarChart3,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
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

export default function ExperimentPage() {
  const [goalTitle, setGoalTitle] = useState('Exercise for 30 minutes');
  const [numInterventions, setNumInterventions] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [showSimulations, setShowSimulations] = useState(false);

  const runSimulation = async () => {
    try {
      setLoading(true);
      setError(null);
      
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

  // Prepare chart data
  const chartData = result?.insights.strategy_stats
    .filter(s => s.total_interventions > 0)
    .sort((a, b) => b.completion_rate - a.completion_rate)
    .map((s, index) => ({
      name: s.strategy.split('_')[0],
      fullName: STRATEGY_INFO[s.strategy as keyof typeof STRATEGY_INFO]?.name || s.strategy,
      completionRate: s.completion_rate * 100,
      effectiveness: s.effectiveness_score * 100,
      samples: s.total_interventions,
      fill: getStrategyColor(index),
    })) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm mb-4">
          <FlaskConical className="w-4 h-4" />
          <span>Simulation Mode</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Experiment Simulator</h1>
        <p className="text-gray-500 mt-2 max-w-2xl mx-auto">
          See how Resolution Lab's multi-armed bandit algorithm learns your preferences 
          through simulated check-ins. No API keys needed!
        </p>
      </div>

      {/* Configuration */}
      <Card variant="bordered" className="mb-8">
        <CardHeader>
          <CardTitle>Configure Simulation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Input
                label="Goal Title"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="Enter a goal to simulate"
              />
            </div>
            <div>
              <Input
                label="Number of Check-ins"
                type="number"
                min={10}
                max={100}
                value={numInterventions}
                onChange={(e) => setNumInterventions(parseInt(e.target.value) || 30)}
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              This simulates {numInterventions} check-ins with varying success rates per strategy
            </p>
            <Button 
              onClick={runSimulation} 
              isLoading={loading}
              size="lg"
            >
              <Play className="w-4 h-4 mr-2" />
              Run Simulation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card variant="bordered" className="mb-6 border-red-200 bg-red-50">
          <CardContent className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-red-700 font-medium">Connection Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary */}
          <Card variant="elevated" className="bg-gradient-to-r from-primary-50 to-purple-50">
            <CardContent className="py-6">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <Sparkles className="w-8 h-8 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-900">Simulation Complete!</h2>
              </div>
              
              <div className="grid md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {result.insights.total_interventions}
                  </p>
                  <p className="text-sm text-gray-500">Check-ins Simulated</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {result.insights.strategies_tested}
                  </p>
                  <p className="text-sm text-gray-500">Strategies Tested</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-green-600">
                    {STRATEGY_INFO[result.insights.best_strategy as keyof typeof STRATEGY_INFO]?.name || result.insights.best_strategy || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500">Best Strategy Found</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {result.insights.experiment_phase === 'optimizing' ? '🎯' : '🔬'}
                  </p>
                  <p className="text-sm text-gray-500 capitalize">
                    {result.insights.experiment_phase} Phase
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chart */}
          {chartData.length > 0 && (
            <Card variant="bordered">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-primary-600" />
                  Strategy Performance Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 30, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis 
                        type="number" 
                        domain={[0, 100]} 
                        tickFormatter={(v) => `${v}%`}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={100}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Completion Rate']}
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0]) {
                            return `${payload[0].payload.fullName} (${payload[0].payload.samples} samples)`;
                          }
                          return label;
                        }}
                      />
                      <Bar 
                        dataKey="completionRate" 
                        radius={[0, 4, 4, 0]}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Strategy Stats Grid */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Results</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {result.insights.strategy_stats
                .sort((a, b) => b.completion_rate - a.completion_rate)
                .map((stat, index) => {
                  const info = STRATEGY_INFO[stat.strategy as keyof typeof STRATEGY_INFO];
                  const isBest = stat.strategy === result.insights.best_strategy;
                  
                  return (
                    <Card 
                      key={stat.strategy} 
                      variant="bordered"
                      className={isBest ? 'ring-2 ring-green-500 bg-green-50' : ''}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                          {isBest && (
                            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                              Best
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-2">
                          {info?.name || stat.strategy}
                        </h4>
                        <Progress 
                          value={stat.completion_rate} 
                          max={1} 
                          size="sm" 
                          showLabel 
                        />
                        <div className="mt-2 flex justify-between text-xs text-gray-500">
                          <span>{stat.successful_completions}/{stat.total_interventions} successes</span>
                          <span>Score: {stat.effectiveness_score.toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>

          {/* Individual Simulations Log */}
          <Card variant="bordered">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Simulation Log</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowSimulations(!showSimulations)}
                >
                  {showSimulations ? 'Hide' : 'Show'} Details
                </Button>
              </div>
            </CardHeader>
            {showSimulations && (
              <CardContent>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {result.simulations.map((sim, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg text-sm"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-400 w-8">#{sim.iteration}</span>
                        <span className="font-medium">
                          {STRATEGY_INFO[sim.strategy as keyof typeof STRATEGY_INFO]?.name || sim.strategy}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-gray-500">
                          Score: {sim.effectiveness.toFixed(2)}
                        </span>
                        {sim.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Run Again */}
          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={runSimulation}
              isLoading={loading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Run Another Simulation
            </Button>
          </div>
        </div>
      )}

      {/* How it works */}
      {!result && (
        <Card variant="bordered" className="bg-gray-50">
          <CardHeader>
            <CardTitle>How the Experiment Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-primary-600">1</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Explore Phase</h4>
                <p className="text-sm text-gray-600">
                  The algorithm tries each of the 8 strategies at least 3 times to gather baseline data
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-purple-600">2</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Learn Patterns</h4>
                <p className="text-sm text-gray-600">
                  It calculates effectiveness scores based on completion rate, response time, and sentiment
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-green-600">3</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Optimize</h4>
                <p className="text-sm text-gray-600">
                  Uses epsilon-greedy: 80% best strategy, 20% exploration to keep learning
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
