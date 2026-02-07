'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import {
  Activity,
  ExternalLink,
  CheckCircle2,
  FlaskConical,
  Brain,
  MessageSquare,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface OpikStats {
  workspace: string;
  project_name: string;
  dashboard_url: string;
  traces_url: string;
  api_configured: boolean;
  evaluators?: string[];
}

// Custom evaluator descriptions
const EVALUATOR_INFO: Record<string, { name: string; description: string; icon: React.ReactNode }> = {
  MotivationalMessageEvaluator: {
    name: 'Message Quality',
    description: 'Evaluates motivational messages for personalization, actionability, and emotional tone',
    icon: <MessageSquare className="w-4 h-4" />,
  },
  InsightQualityEvaluator: {
    name: 'Insight Quality',
    description: 'Assesses AI-generated insights for accuracy, relevance, and data-grounding',
    icon: <Brain className="w-4 h-4" />,
  },
  AgentReasoningEvaluator: {
    name: 'Agent Reasoning',
    description: 'Evaluates the 6-step reasoning chain (Observe→Think→Plan→Act→Evaluate→Learn)',
    icon: <FlaskConical className="w-4 h-4" />,
  },
};

export default function OpikDashboard() {
  const [stats, setStats] = useState<OpikStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/opik/info`);
        if (!response.ok) {
          if (response.status === 503) {
            setError('Opik not configured');
          } else {
            throw new Error('Failed to fetch Opik stats');
          }
          return;
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch Opik stats:', err);
        setError('Could not connect to backend');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Card variant="bordered" className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
        <CardContent className="py-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto" />
          <p className="text-sm text-surface-400 mt-2">Loading Opik metrics...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats?.api_configured) {
    return (
      <Card variant="bordered" className="bg-surface-800 border-white/[0.06]">
        <CardContent className="py-6 text-center">
          <AlertCircle className="w-8 h-8 text-surface-400 mx-auto mb-2" />
          <p className="text-sm text-surface-400">Opik observability not configured</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="bordered" className="overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white px-6 py-4 -m-6 mb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Opik Observability</h3>
              <p className="text-white/80 text-sm">AI performance monitoring & evaluation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
              {stats.project_name}
            </span>
          </div>
        </div>
      </div>

      <CardContent className="p-6 mt-6">
        {/* Quick Links */}
        <div className="flex flex-wrap gap-3 mb-6">
          <a
            href={stats.dashboard_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/15 hover:bg-violet-500/25 text-violet-400 rounded-lg font-medium text-sm transition-colors border border-violet-500/20"
          >
            <Activity className="w-4 h-4" />
            View Dashboard
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={stats.traces_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 rounded-lg font-medium text-sm transition-colors border border-purple-500/20"
          >
            <FlaskConical className="w-4 h-4" />
            View Traces
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Custom Evaluators */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Custom Opik Evaluators
          </h4>
          <div className="space-y-3">
            {(stats.evaluators || Object.keys(EVALUATOR_INFO)).map((evaluator) => {
              const info = EVALUATOR_INFO[evaluator] || {
                name: evaluator,
                description: 'Custom evaluator',
                icon: <CheckCircle2 className="w-4 h-4" />,
              };
              return (
                <div
                  key={evaluator}
                  className="flex items-start gap-3 p-3 bg-surface-700 rounded-lg border border-white/[0.06]"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center text-violet-400 flex-shrink-0">
                    {info.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-white text-sm">{info.name}</p>
                    <p className="text-xs text-surface-400 mt-0.5">{info.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Features */}
        <div className="mt-6 pt-6 border-t border-white/[0.06]">
          <h4 className="text-sm font-semibold text-white mb-3">What's Being Tracked</h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              'LLM calls & latency',
              'Strategy selections',
              'User outcomes',
              'Evaluator scores',
              'Agent reasoning steps',
              'Error rates',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-surface-300">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
