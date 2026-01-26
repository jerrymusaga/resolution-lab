'use client';

import Link from 'next/link';

export default function AuthErrorPage() {
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            Authentication Error
          </h1>
          <p className="text-gray-400 mb-6">
            There was a problem signing you in. This could happen if:
          </p>

          <ul className="text-left text-gray-400 text-sm mb-6 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-red-400">•</span>
              The sign-in link has expired
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400">•</span>
              You denied access during authorization
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400">•</span>
              There was a network issue
            </li>
          </ul>

          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              Try Again
            </Link>
            <Link
              href="/"
              className="block w-full py-3 px-4 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-all"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
