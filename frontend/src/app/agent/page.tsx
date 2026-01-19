'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  Brain,
  Eye,
  Lightbulb,
  Target,
  MessageSquare,
  CheckCircle2,
  BookOpen,
  Play,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
  Loader2,
  Zap,
  ArrowRight,
  RotateCw
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AgentStep {
  step: number;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  data?: any;
  isComplete: boolean;
  isActive: boolean;
}

export default function AgentPage() {
  const [goalTitle, setGoalTitle] = useState('Exercise for 30 minutes');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentResponse, setAgentResponse] = useState<any>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([1, 2, 3, 4, 5, 6]));
  const [currentStep, setCurrentStep] = useState(0);

  const runAgent = async () => {
    try {
      setLoading(true);
      setError(null);
      setAgentResponse(null);
      setCurrentStep(0);

      // Simulate step-by-step progress with visual feedback
      for (let i = 1; i <= 6; i++) {
        setCurrentStep(i);
        await new Promise(r => setTimeout(r, 600));
      }

      const userId = 'demo-' + Math.random().toString(36).substr(2, 9);

      const response = await fetch(
        `${API_URL}/api/agent/run?user_id=${userId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goal_title: goalTitle,
            goal_description: ''
          })
        }
      );

      if (!response.ok) {
        throw new Error('Agent request failed');
      }

      const data = await response.json();
      setAgentResponse(data.agent_response);
      setCurrentStep(7); // Complete

    } catch (err) {
      console.error('Agent error:', err);
      setError('Failed to run agent. Make sure backend is running with API keys configured.');
      setCurrentStep(0);
    } finally {
      setLoading(false);
    }
  };

  const toggleStep = (step: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(step)) {
      newExpanded.delete(step);
    } else {
      newExpanded.add(step);
    }
    setExpandedSteps(newExpanded);
  };

  const steps: AgentStep[] = [
    {
      step: 1,
      name: 'OBSERVE',
      description: 'Gather user history & context',
      icon: <Eye className="w-5 h-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500',
      borderColor: 'border-blue-500',
      data: agentResponse?.thought ? {
        label: 'Gathering context...',
        content: 'Analyzing user history, experiment data, and current context'
      } : null,
      isComplete: currentStep > 1,
      isActive: currentStep === 1
    },
    {
      step: 2,
      name: 'THINK',
      description: 'Reason about patterns',
      icon: <Brain className="w-5 h-5" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500',
      borderColor: 'border-purple-500',
      data: agentResponse?.thought,
      isComplete: currentStep > 2,
      isActive: currentStep === 2
    },
    {
      step: 3,
      name: 'PLAN',
      description: 'Decide on strategy',
      icon: <Target className="w-5 h-5" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-500',
      borderColor: 'border-orange-500',
      data: agentResponse?.plan,
      isComplete: currentStep > 3,
      isActive: currentStep === 3
    },
    {
      step: 4,
      name: 'ACT',
      description: 'Generate message',
      icon: <MessageSquare className="w-5 h-5" />,
      color: 'text-green-600',
      bgColor: 'bg-green-500',
      borderColor: 'border-green-500',
      data: agentResponse?.action,
      isComplete: currentStep > 4,
      isActive: currentStep === 4
    },
    {
      step: 5,
      name: 'EVALUATE',
      description: 'Self-assess quality',
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: 'text-pink-600',
      bgColor: 'bg-pink-500',
      borderColor: 'border-pink-500',
      data: agentResponse?.evaluation,
      isComplete: currentStep > 5,
      isActive: currentStep === 5
    },
    {
      step: 6,
      name: 'LEARN',
      description: 'Log for future learning',
      icon: <BookOpen className="w-5 h-5" />,
      color: 'text-teal-600',
      bgColor: 'bg-teal-500',
      borderColor: 'border-teal-500',
      data: agentResponse ? { logged: true } : null,
      isComplete: currentStep > 6,
      isActive: currentStep === 6
    }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white mb-6 shadow-lg">
          <Brain className="w-10 h-10" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">AI Coach Agent</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Watch the agent think, plan, and act through a 6-step cognitive loop - with every step traced in Opik
        </p>
      </div>

      {/* Cognitive Loop Visualization - Dark Theme */}
      <div className="mb-10">
        <Card variant="bordered" className="overflow-hidden">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                {/* Center Brain */}
                <div className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500",
                  currentStep > 0 ? "bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/30" : "bg-slate-700"
                )}>
                  <Brain className={cn(
                    "w-12 h-12 transition-all",
                    currentStep > 0 ? "text-white" : "text-slate-500"
                  )} />
                  {loading && currentStep > 0 && currentStep < 7 && (
                    <div className="absolute inset-0 rounded-full border-4 border-purple-400/30 border-t-purple-400 animate-spin" />
                  )}
                </div>
              </div>
            </div>

            {/* Steps in a row */}
            <div className="flex justify-center items-center gap-2 flex-wrap">
              {steps.map((step, index) => (
                <div key={step.step} className="flex items-center">
                  <div className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300",
                    step.isComplete && "bg-white/10",
                    step.isActive && "bg-white/20 ring-2 ring-white/50 scale-110",
                    !step.isComplete && !step.isActive && "opacity-40"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                      step.isComplete || step.isActive ? step.bgColor : "bg-slate-600"
                    )}>
                      {step.isActive && loading ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      ) : (
                        <span className="text-white">{step.icon}</span>
                      )}
                    </div>
                    <span className={cn(
                      "text-sm font-medium hidden sm:inline",
                      step.isComplete || step.isActive ? "text-white" : "text-slate-500"
                    )}>
                      {step.name}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight className={cn(
                      "w-4 h-4 mx-1 hidden sm:block",
                      currentStep > index + 1 ? "text-white/60" : "text-slate-600"
                    )} />
                  )}
                </div>
              ))}
            </div>

            {/* Status message */}
            <div className="text-center mt-6">
              {currentStep === 0 && !loading && (
                <p className="text-slate-400">Enter a goal and click "Run Agent" to start</p>
              )}
              {loading && currentStep > 0 && currentStep < 7 && (
                <p className="text-white animate-pulse">
                  Step {currentStep}: {steps[currentStep - 1]?.name}...
                </p>
              )}
              {currentStep === 7 && (
                <div className="flex items-center justify-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Agent Complete!</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Input Section */}
      <Card variant="bordered" className="mb-8 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-indigo-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-600" />
            Test the Agent
          </h2>
        </div>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                label="Your Goal"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="Enter a goal to test..."
              />
            </div>
            <div className="sm:self-end">
              <Button
                onClick={runAgent}
                isLoading={loading}
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Agent
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card variant="bordered" className="mb-6 border-red-200 bg-red-50">
          <CardContent className="flex items-center space-x-3 pt-6">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Agent Workflow - Detailed Steps */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <RotateCw className="w-5 h-5 text-primary-600" />
          Cognitive Loop Details
        </h2>

        {steps.map((step) => (
          <Card
            key={step.step}
            variant="bordered"
            className={cn(
              'transition-all duration-300 overflow-hidden',
              step.isActive && 'ring-2 ring-offset-2 shadow-lg',
              step.isActive && step.borderColor,
              step.isComplete && 'bg-gray-50/50'
            )}
          >
            <div
              className={cn(
                "flex items-center justify-between p-4 cursor-pointer transition-colors",
                step.data && "hover:bg-gray-50"
              )}
              onClick={() => step.data && toggleStep(step.step)}
            >
              <div className="flex items-center space-x-4">
                {/* Step indicator with connecting line visual */}
                <div className="relative">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center text-white transition-all shadow-md',
                    step.isComplete ? step.bgColor :
                    step.isActive ? `${step.bgColor} animate-pulse shadow-lg` :
                    'bg-gray-300'
                  )}>
                    {step.isActive && loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  {step.isComplete && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                {/* Step name and description */}
                <div>
                  <h3 className={cn(
                    'font-bold text-lg flex items-center gap-2',
                    step.isComplete || step.isActive ? 'text-gray-900' : 'text-gray-400'
                  )}>
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      step.isComplete || step.isActive ? `${step.bgColor} text-white` : "bg-gray-200 text-gray-500"
                    )}>
                      {step.step}
                    </span>
                    {step.name}
                  </h3>
                  <p className={cn(
                    "text-sm",
                    step.isComplete || step.isActive ? 'text-gray-600' : 'text-gray-400'
                  )}>
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Expand/collapse */}
              {step.data && (
                <div className={cn("transition-colors", step.color)}>
                  {expandedSteps.has(step.step) ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              )}
            </div>

            {/* Expanded content */}
            {step.data && expandedSteps.has(step.step) && (
              <div className="px-4 pb-4 pt-0 ml-16">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 text-sm border border-gray-200">
                  {/* THINK step */}
                  {step.step === 2 && step.data.observation && (
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4 border border-gray-100">
                        <span className="font-semibold text-purple-700 flex items-center gap-2 mb-2">
                          <Eye className="w-4 h-4" />
                          Observation
                        </span>
                        <p className="text-gray-700">{step.data.observation}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-gray-100">
                        <span className="font-semibold text-purple-700 flex items-center gap-2 mb-2">
                          <Brain className="w-4 h-4" />
                          Analysis
                        </span>
                        <p className="text-gray-700">{step.data.analysis}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-gray-100">
                        <span className="font-semibold text-purple-700 flex items-center gap-2 mb-2">
                          <Lightbulb className="w-4 h-4" />
                          Hypothesis
                        </span>
                        <p className="text-gray-700">{step.data.hypothesis}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-gray-100">
                        <span className="font-semibold text-purple-700 mb-2 block">Confidence</span>
                        <div className="flex items-center space-x-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all"
                              style={{ width: `${(step.data.confidence || 0) * 100}%` }}
                            />
                          </div>
                          <span className="text-purple-700 font-bold">{((step.data.confidence || 0) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PLAN step */}
                  {step.step === 3 && step.data.chosen_strategy && (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
                        <span className="font-semibold text-orange-700 mb-2 block">Chosen Strategy</span>
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full font-bold shadow-md">
                          <Target className="w-4 h-4" />
                          {step.data.chosen_strategy}
                        </span>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-gray-100">
                        <span className="font-semibold text-orange-700 mb-2 block">Reasoning</span>
                        <p className="text-gray-700">{step.data.reasoning}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-gray-100">
                        <span className="font-semibold text-orange-700 mb-2 block">Expected Effectiveness</span>
                        <div className="flex items-center space-x-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-orange-500 to-amber-500 h-3 rounded-full transition-all"
                              style={{ width: `${(step.data.expected_effectiveness || 0) * 100}%` }}
                            />
                          </div>
                          <span className="text-orange-700 font-bold">{((step.data.expected_effectiveness || 0) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ACT step */}
                  {step.step === 4 && step.data.message && (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-green-900 text-lg font-medium leading-relaxed">"{step.data.message}"</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="px-3 py-1 bg-gray-100 rounded-full">
                          <span className="text-gray-500">Tone:</span> <span className="font-medium text-gray-700">{step.data.tone}</span>
                        </span>
                        <span className="px-3 py-1 bg-gray-100 rounded-full">
                          <span className="text-gray-500">Strategy:</span> <span className="font-medium text-gray-700">{step.data.strategy_used}</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* EVALUATE step */}
                  {step.step === 5 && step.data.overall_score !== undefined && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: 'Quality', value: step.data.quality_score, color: 'pink' },
                          { label: 'Relevance', value: step.data.relevance_score, color: 'pink' },
                          { label: 'Personalization', value: step.data.personalization_score, color: 'pink' },
                          { label: 'Overall Score', value: step.data.overall_score, color: 'emerald', highlight: true },
                        ].map((metric) => (
                          <div key={metric.label} className={cn(
                            "bg-white rounded-lg p-4 border",
                            metric.highlight ? "border-emerald-200 bg-emerald-50" : "border-gray-100"
                          )}>
                            <span className={cn(
                              "text-sm font-medium block mb-2",
                              metric.highlight ? "text-emerald-700" : "text-gray-600"
                            )}>{metric.label}</span>
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className={cn(
                                    "h-2 rounded-full transition-all",
                                    metric.highlight ? "bg-emerald-500" : "bg-pink-500"
                                  )}
                                  style={{ width: `${(metric.value || 0) * 100}%` }}
                                />
                              </div>
                              <span className={cn(
                                "text-sm font-bold",
                                metric.highlight ? "text-emerald-700" : "text-gray-700"
                              )}>{((metric.value || 0) * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {step.data.improvement_suggestions?.length > 0 && (
                        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                          <span className="font-semibold text-amber-700 mb-2 block flex items-center gap-2">
                            <Lightbulb className="w-4 h-4" />
                            Improvement Suggestions
                          </span>
                          <ul className="list-disc list-inside text-amber-800 space-y-1">
                            {step.data.improvement_suggestions.map((s: string, i: number) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* LEARN step */}
                  {step.step === 6 && step.data.logged && (
                    <div className="flex items-center space-x-3 text-teal-700 bg-teal-50 rounded-lg p-4 border border-teal-200">
                      <CheckCircle2 className="w-6 h-6" />
                      <span className="font-medium">Learning signals logged to Opik for future model improvement</span>
                    </div>
                  )}

                  {/* OBSERVE step placeholder */}
                  {step.step === 1 && step.data.label && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <p className="text-blue-700">{step.data.content}</p>
                    </div>
                  )}
                </div>

                {/* Opik trace indicator */}
                <div className="mt-3 text-xs text-gray-400 flex items-center space-x-2">
                  <Sparkles className="w-3 h-3" />
                  <span>Traced in Opik: <code className="bg-gray-100 px-1.5 py-0.5 rounded">agent_{step.name.toLowerCase()}</code></span>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Success message */}
      {currentStep === 7 && (
        <Card variant="bordered" className="mt-8 overflow-hidden border-0 shadow-xl">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-8 text-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Agent Complete!</h3>
            <p className="text-emerald-100 mb-4">
              The full cognitive loop has been traced in your Opik dashboard
            </p>
            <div className="flex items-center justify-center gap-2 text-sm bg-white/10 rounded-full px-4 py-2 inline-flex">
              <Sparkles className="w-4 h-4" />
              <span>6 steps traced with full LLM observability</span>
            </div>
          </div>
        </Card>
      )}

      {/* Info box - How it works */}
      {!agentResponse && !loading && (
        <Card variant="bordered" className="mt-8 bg-gradient-to-br from-slate-50 to-gray-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              How the AI Coach Agent Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm mb-6">
              Unlike simple chatbots, this agent follows a cognitive architecture inspired by how humans think and learn:
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {steps.map((step) => (
                <div key={step.step} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-100">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0", step.bgColor)}>
                    {step.icon}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900 text-sm">{step.name}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
