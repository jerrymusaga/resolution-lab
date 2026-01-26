'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    // Only consider redirecting after auth loading is complete
    if (!loading && !user) {
      // Add a small delay to allow for session to be established from OAuth callback
      const timer = setTimeout(() => {
        // Double-check user is still not set
        if (!user) {
          setShouldRedirect(true);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, loading]);

  useEffect(() => {
    if (shouldRedirect) {
      router.push('/login');
    }
  }, [shouldRedirect, router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
        <p className="mt-4 text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user && !shouldRedirect) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
        <p className="mt-4 text-gray-500">Checking authentication...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
        <p className="mt-4 text-gray-500">Redirecting to login...</p>
      </div>
    );
  }

  return <>{children}</>;
}
