'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = getSupabase();
      if (!supabase) {
        setError('Supabase not configured');
        return;
      }

      // Get the code from URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const errorParam = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      if (errorParam) {
        console.error('OAuth error:', errorParam, errorDescription);
        setError(errorDescription || errorParam);
        return;
      }

      if (code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Error exchanging code:', error);
            setError(error.message);
            return;
          }
          // Success - redirect to dashboard
          router.push('/dashboard');
        } catch (err) {
          console.error('Exception during code exchange:', err);
          setError('Failed to complete sign in');
        }
      } else {
        // No code - check if we have a session from hash fragment (implicit flow)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(sessionError.message);
          return;
        }
        if (session) {
          router.push('/dashboard');
        } else {
          setError('No authentication code received');
        }
      }
    };

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="max-w-md w-full mx-4">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Sign In Failed</h1>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
        <p className="text-white text-lg">Completing sign in...</p>
      </div>
    </div>
  );
}
