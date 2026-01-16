'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { 
  FlaskConical, 
  BarChart3, 
  Sparkles, 
  Target,
  Brain,
  Zap,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-purple-800 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full filter blur-3xl opacity-20 animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-400 rounded-full filter blur-3xl opacity-20 animate-pulse-slow" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm mb-8">
              <FlaskConical className="w-4 h-4" />
              <span>AI-Powered Behavioral Experiments</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Discover What Actually
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                Motivates You
              </span>
            </h1>
            
            <p className="mt-6 text-xl text-primary-100 max-w-2xl mx-auto">
              Stop guessing. Start experimenting. Resolution Lab runs real behavioral 
              experiments to find YOUR personal motivation formula.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="bg-white text-primary-700 hover:bg-gray-100">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/experiment">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  See Demo
                </Button>
              </Link>
            </div>
            
            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div>
                <div className="text-3xl font-bold">8</div>
                <div className="text-sm text-primary-200">Motivation Strategies</div>
              </div>
              <div>
                <div className="text-3xl font-bold">AI</div>
                <div className="text-sm text-primary-200">Personalized Messages</div>
              </div>
              <div>
                <div className="text-3xl font-bold">Real</div>
                <div className="text-sm text-primary-200">Experiment Data</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">The Problem with Generic Advice</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              "Just set reminders" doesn't work for everyone. What motivates your friend 
              might actually demotivate you.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">😴</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Gentle Reminders</h3>
              <p className="text-gray-600">Work for some people, fade into background noise for others</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">😰</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Streak Pressure</h3>
              <p className="text-gray-600">Motivates gamers, stresses out perfectionists</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🤷</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Social Comparison</h3>
              <p className="text-gray-600">Inspires competitors, demoralizes others</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm mb-4">
              <Sparkles className="w-4 h-4" />
              <span>Our Solution</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Run Experiments on Yourself</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Like A/B testing, but for your motivation. We systematically test different 
              strategies and show you the data.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Set Your Goals</h3>
              <p className="text-gray-600 text-sm">Define what you want to achieve - exercise, reading, meditation, anything.</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Tests Strategies</h3>
              <p className="text-gray-600 text-sm">Our AI tries 8 different motivation styles using personalized messages.</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">You Check In</h3>
              <p className="text-gray-600 text-sm">Simple yes/no responses. We track what works and what doesn't.</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">See Your Data</h3>
              <p className="text-gray-600 text-sm">View your personal experiment results. "Accountability works 73% for you."</p>
            </div>
          </div>
        </div>
      </section>

      {/* Strategies Preview */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">8 Motivation Strategies We Test</h2>
            <p className="mt-4 text-lg text-gray-600">Each based on behavioral science research</p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Gentle Reminder', emoji: '🌟', color: 'bg-blue-50' },
              { name: 'Direct Accountability', emoji: '✅', color: 'bg-green-50' },
              { name: 'Streak Gamification', emoji: '🔥', color: 'bg-orange-50' },
              { name: 'Social Proof', emoji: '👥', color: 'bg-purple-50' },
              { name: 'Loss Framing', emoji: '⚠️', color: 'bg-red-50' },
              { name: 'Reward Preview', emoji: '🎁', color: 'bg-yellow-50' },
              { name: 'Identity-Based', emoji: '💪', color: 'bg-indigo-50' },
              { name: 'Micro-Commitment', emoji: '🎯', color: 'bg-teal-50' },
            ].map((strategy) => (
              <div key={strategy.name} className={`${strategy.color} rounded-lg p-4 text-center`}>
                <span className="text-2xl">{strategy.emoji}</span>
                <p className="mt-2 font-medium text-gray-900">{strategy.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Zap className="w-12 h-12 text-yellow-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Formula?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Start your personal motivation experiment today. It's free.
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="bg-primary-500 hover:bg-primary-600">
              Start Your Experiment
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold">ResolutionLab</span>
            </div>
            <p className="text-sm">
              Built with 🧪 for the Comet AI Agents Hackathon
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
