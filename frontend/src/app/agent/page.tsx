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
  Loader2
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AgentStep {
  step: number;
  name: string;
  icon: React.ReactNode;
  color: string;
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

      // Simulate step-by-step progress
      for (let i = 1; i <= 6; i++) {
        setCurrentStep(i);
        await new Promise(r => setTimeout(r, 500));
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
      icon: <Eye className="w-5 h-5" />,
      color: 'bg-blue-500',
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
      icon: <Brain className="w-5 h-5" />,
      color: 'bg-purple-500',
      data: agentResponse?.thought,
      isComplete: currentStep > 2,
      isActive: currentStep === 2
    },
    {
      step: 3,
      name: 'PLAN',
      icon: <Target className="w-5 h-5" />,
      color: 'bg-orange-500',
      data: agentResponse?.plan,
      isComplete: currentStep > 3,
      isActive: currentStep === 3
    },
    {
      step: 4,
      name: 'ACT',
      icon: <MessageSquare className="w-5 h-5" />,
      color: 'bg-green-500',
      data: agentResponse?.action,
      isComplete: currentStep > 4,
      isActive: currentStep === 4
    },
    {
      step: 5,
      name: 'EVALUATE',
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: 'bg-pink-500',
      data: agentResponse?.evaluation,
      isComplete: currentStep > 5,
      isActive: currentStep === 5
    },
    {
      step: 6,
      name: 'LEARN',
      icon: <BookOpen className="w-5 h-5" />,
      color: 'bg-teal-500',
      data: agentResponse ? { logged: true } : null,
      isComplete: currentStep > 6,
      isActive: currentStep === 6
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-4 py-2 rounded-full text-sm mb-4">
          <Brain className="w-4 h-4" />
          <span>AI Agent Demo</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">AI Coach Agent</h1>
        <p className="text-gray-500 mt-2 max-w-2xl mx-auto">
          Watch the agent think, plan, and act - with every step traced in Opik
        </p>
      </div>

      {/* Input */}
      <Card variant="bordered" className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                label="Your Goal"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="Enter a goal..."
              />
            </div>
            <div className="sm:self-end">
              <Button 
                onClick={runAgent} 
                isLoading={loading}
                size="lg"
                className="w-full sm:w-auto"
              >
                <Play className="w-4 h-4 mr-2" />
                Run Agent
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

      {/* Agent Workflow Visualization */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card 
            key={step.step}
            variant="bordered" 
            className={cn(
              'transition-all duration-300',
              step.isActive && 'ring-2 ring-primary-500 shadow-lg',
              step.isComplete && 'bg-gray-50'
            )}
          >
            <div 
              className="flex items-center justify-between p-4 cursor-pointer"
              onClick={() => step.data && toggleStep(step.step)}
            >
              <div className="flex items-center space-x-4">
                {/* Step indicator */}
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-white transition-all',
                  step.isComplete ? step.color : 
                  step.isActive ? `${step.color} animate-pulse` :
                  'bg-gray-300'
                )}>
                  {step.isActive && loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    step.icon
                  )}
                </div>
                
                {/* Step name */}
                <div>
                  <h3 className={cn(
                    'font-semibold',
                    step.isComplete || step.isActive ? 'text-gray-900' : 'text-gray-400'
                  )}>
                    Step {step.step}: {step.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {step.step === 1 && 'Gather user history & context'}
                    {step.step === 2 && 'Reason about patterns'}
                    {step.step === 3 && 'Decide on strategy'}
                    {step.step === 4 && 'Generate message'}
                    {step.step === 5 && 'Self-assess quality'}
                    {step.step === 6 && 'Log for future learning'}
                  </p>
                </div>
              </div>

              {/* Expand/collapse */}
              {step.data && (
                <div className="text-gray-400">
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
              <div className="px-4 pb-4 pt-0 ml-14">
                <div className="bg-gray-100 rounded-lg p-4 text-sm">
                  {/* THINK step */}
                  {step.step === 2 && step.data.observation && (
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium text-gray-700">Observation:</span>
                        <p className="text-gray-600 mt-1">{step.data.observation}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Analysis:</span>
                        <p className="text-gray-600 mt-1">{step.data.analysis}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Hypothesis:</span>
                        <p className="text-gray-600 mt-1">{step.data.hypothesis}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-700">Confidence:</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${(step.data.confidence || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-gray-600">{((step.data.confidence || 0) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  )}

                  {/* PLAN step */}
                  {step.step === 3 && step.data.chosen_strategy && (
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium text-gray-700">Chosen Strategy:</span>
                        <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                          {step.data.chosen_strategy}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Reasoning:</span>
                        <p className="text-gray-600 mt-1">{step.data.reasoning}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Expected Effectiveness:</span>
                        <span className="ml-2 text-gray-600">{((step.data.expected_effectiveness || 0) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  )}

                  {/* ACT step */}
                  {step.step === 4 && step.data.message && (
                    <div className="space-y-3">
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                        <p className="text-green-800 text-lg font-medium">"{step.data.message}"</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-gray-500">Tone: <span className="font-medium text-gray-700">{step.data.tone}</span></span>
                        <span className="text-gray-500">Strategy: <span className="font-medium text-gray-700">{step.data.strategy_used}</span></span>
                      </div>
                    </div>
                  )}

                  {/* EVALUATE step */}
                  {step.step === 5 && step.data.overall_score !== undefined && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-500">Quality</span>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div className="bg-pink-500 h-2 rounded-full" style={{ width: `${(step.data.quality_score || 0) * 100}%` }} />
                            </div>
                            <span className="text-sm font-medium">{((step.data.quality_score || 0) * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Relevance</span>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div className="bg-pink-500 h-2 rounded-full" style={{ width: `${(step.data.relevance_score || 0) * 100}%` }} />
                            </div>
                            <span className="text-sm font-medium">{((step.data.relevance_score || 0) * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Personalization</span>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div className="bg-pink-500 h-2 rounded-full" style={{ width: `${(step.data.personalization_score || 0) * 100}%` }} />
                            </div>
                            <span className="text-sm font-medium">{((step.data.personalization_score || 0) * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 font-medium">Overall Score</span>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(step.data.overall_score || 0) * 100}%` }} />
                            </div>
                            <span className="text-sm font-bold">{((step.data.overall_score || 0) * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                      {step.data.improvement_suggestions?.length > 0 && (
                        <div>
                          <span className="font-medium text-gray-700">Suggestions:</span>
                          <ul className="list-disc list-inside text-gray-600 mt-1">
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
                    <div className="flex items-center space-x-2 text-teal-700">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Learning signals logged to Opik for future model improvement</span>
                    </div>
                  )}

                  {/* OBSERVE step placeholder */}
                  {step.step === 1 && step.data.label && (
                    <p className="text-gray-600">{step.data.content}</p>
                  )}
                </div>

                {/* Opik trace indicator */}
                <div className="mt-2 text-xs text-gray-400 flex items-center space-x-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Traced in Opik: agent_{step.name.toLowerCase()}</span>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Success message */}
      {currentStep === 7 && (
        <Card variant="elevated" className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-green-900">Agent Complete!</h3>
            <p className="text-green-700 mt-1">
              Check your Opik dashboard to see the full trace with all 6 steps
            </p>
          </CardContent>
        </Card>
      )}

      {/* Info box */}
      {!agentResponse && !loading && (
        <Card variant="bordered" className="mt-8 bg-gray-50">
          <CardHeader>
            <CardTitle className="text-base">How the AI Coach Agent Works</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm mb-4">
              Unlike simple chatbots, this agent follows a cognitive architecture inspired by how humans think:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start space-x-2">
                <Eye className="w-4 h-4 text-blue-500 mt-0.5" />
                <span><strong>OBSERVE</strong> - Gathers all relevant context</span>
              </div>
              <div className="flex items-start space-x-2">
                <Brain className="w-4 h-4 text-purple-500 mt-0.5" />
                <span><strong>THINK</strong> - Reasons with Chain-of-Thought</span>
              </div>
              <div className="flex items-start space-x-2">
                <Target className="w-4 h-4 text-orange-500 mt-0.5" />
                <span><strong>PLAN</strong> - Decides strategy with bandit algo</span>
              </div>
              <div className="flex items-start space-x-2">
                <MessageSquare className="w-4 h-4 text-green-500 mt-0.5" />
                <span><strong>ACT</strong> - Generates personalized message</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-pink-500 mt-0.5" />
                <span><strong>EVALUATE</strong> - Self-assesses with LLM-judge</span>
              </div>
              <div className="flex items-start space-x-2">
                <BookOpen className="w-4 h-4 text-teal-500 mt-0.5" />
                <span><strong>LEARN</strong> - Logs signals for improvement</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
