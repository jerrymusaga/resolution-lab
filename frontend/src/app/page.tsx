'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import {
  FlaskConical,
  BarChart3,
  Sparkles,
  Target,
  Brain,
  Zap,
  ArrowRight,
  CheckCircle2,
  Loader2
} from 'lucide-react';

export default function HomePage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
      </div>
    );
  }

  // If user is logged in, show loading (will redirect)
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
        <p className="ml-3 text-surface-400">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-purple-800 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full filter blur-3xl opacity-20 animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-brand-400 rounded-full filter blur-3xl opacity-20 animate-pulse-slow" />

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

            <p className="mt-6 text-xl text-white/80 max-w-2xl mx-auto">
              Stop guessing. Start experimenting. Resolution Lab runs real behavioral
              experiments to find YOUR personal motivation formula.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-white text-brand-700 hover:bg-gray-100"
                onClick={signInWithGoogle}
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div>
                <div className="text-3xl font-bold">8</div>
                <div className="text-sm text-white/70">Motivation Strategies</div>
              </div>
              <div>
                <div className="text-3xl font-bold">AI</div>
                <div className="text-sm text-white/70">Personalized Messages</div>
              </div>
              <div>
                <div className="text-3xl font-bold">Real</div>
                <div className="text-sm text-white/70">Experiment Data</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-surface-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white">The Problem with Generic Advice</h2>
            <p className="mt-4 text-lg text-surface-300 max-w-2xl mx-auto">
              "Just set reminders" doesn't work for everyone. What motivates your friend
              might actually demotivate you.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-red-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">😴</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Gentle Reminders</h3>
              <p className="text-surface-300">Work for some people, fade into background noise for others</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-yellow-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">😰</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Streak Pressure</h3>
              <p className="text-surface-300">Motivates gamers, stresses out perfectionists</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🤷</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Social Comparison</h3>
              <p className="text-surface-300">Inspires competitors, demoralizes others</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 bg-surface-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-brand-500/15 text-brand-400 px-4 py-2 rounded-full text-sm mb-4">
              <Sparkles className="w-4 h-4" />
              <span>Our Solution</span>
            </div>
            <h2 className="text-3xl font-bold text-white">Run Experiments on Yourself</h2>
            <p className="mt-4 text-lg text-surface-300 max-w-2xl mx-auto">
              Like A/B testing, but for your motivation. We systematically test different
              strategies and show you the data.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-surface-700 rounded-xl p-6 border border-white/[0.06]">
              <div className="w-12 h-12 bg-brand-500/15 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-brand-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Set Your Goals</h3>
              <p className="text-surface-300 text-sm">Define what you want to achieve - exercise, reading, meditation, anything.</p>
            </div>

            <div className="bg-surface-700 rounded-xl p-6 border border-white/[0.06]">
              <div className="w-12 h-12 bg-purple-500/15 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">AI Tests Strategies</h3>
              <p className="text-surface-300 text-sm">Our AI tries 8 different motivation styles using personalized messages.</p>
            </div>

            <div className="bg-surface-700 rounded-xl p-6 border border-white/[0.06]">
              <div className="w-12 h-12 bg-green-500/15 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">You Check In</h3>
              <p className="text-surface-300 text-sm">Simple yes/no responses. We track what works and what doesn't.</p>
            </div>

            <div className="bg-surface-700 rounded-xl p-6 border border-white/[0.06]">
              <div className="w-12 h-12 bg-orange-500/15 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">See Your Data</h3>
              <p className="text-surface-300 text-sm">View your personal experiment results. "Accountability works 73% for you."</p>
            </div>
          </div>
        </div>
      </section>

      {/* Strategies Preview */}
      <section className="py-20 bg-surface-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white">8 Motivation Strategies We Test</h2>
            <p className="mt-4 text-lg text-surface-300">Each based on behavioral science research</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Gentle Reminder', emoji: '🌟', color: 'bg-blue-500/10 border-blue-500/20' },
              { name: 'Direct Accountability', emoji: '✅', color: 'bg-green-500/10 border-green-500/20' },
              { name: 'Streak Gamification', emoji: '🔥', color: 'bg-orange-500/10 border-orange-500/20' },
              { name: 'Social Proof', emoji: '👥', color: 'bg-purple-500/10 border-purple-500/20' },
              { name: 'Loss Framing', emoji: '⚠️', color: 'bg-red-500/10 border-red-500/20' },
              { name: 'Reward Preview', emoji: '🎁', color: 'bg-yellow-500/10 border-yellow-500/20' },
              { name: 'Identity-Based', emoji: '💪', color: 'bg-indigo-500/10 border-indigo-500/20' },
              { name: 'Micro-Commitment', emoji: '🎯', color: 'bg-teal-500/10 border-teal-500/20' },
            ].map((strategy) => (
              <div key={strategy.name} className={`${strategy.color} border rounded-lg p-4 text-center`}>
                <span className="text-2xl">{strategy.emoji}</span>
                <p className="mt-2 font-medium text-white">{strategy.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-brand-600 via-brand-700 to-purple-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Zap className="w-12 h-12 text-yellow-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Formula?</h2>
          <p className="text-xl text-white/80 mb-8">
            Start your personal motivation experiment today. It's free.
          </p>
          <Button
            size="lg"
            className="bg-white text-brand-700 hover:bg-gray-100"
            onClick={signInWithGoogle}
          >
            Start Your Experiment
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-950 text-surface-400 py-12 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-600 rounded-lg flex items-center justify-center">
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
