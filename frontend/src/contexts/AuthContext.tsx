'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getSupabase, User } from '@/lib/supabase';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If supabase is not configured, skip auth
    const client = getSupabase();
    if (!client) {
      setLoading(false);
      return;
    }

    let initialSessionHandled = false;

    // Listen for auth changes - this handles ALL auth events including initial session
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      console.log('Auth state changed:', event, session?.user?.email);

      // Update session and user state
      setSession(session);
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name,
          avatar_url: session.user.user_metadata?.avatar_url,
        });
      } else {
        setUser(null);
      }

      // Only set loading to false after initial session is handled
      if (event === 'INITIAL_SESSION') {
        initialSessionHandled = true;
        setLoading(false);
      } else if (initialSessionHandled) {
        setLoading(false);
      }
    });

    // Fallback: if INITIAL_SESSION doesn't fire within 2 seconds, stop loading
    const timeout = setTimeout(() => {
      if (!initialSessionHandled) {
        console.log('Auth timeout - setting loading to false');
        setLoading(false);
      }
    }, 2000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const signInWithGoogle = async () => {
    const client = getSupabase();
    if (!client) {
      console.error('Supabase not configured');
      return;
    }
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const client = getSupabase();
    if (!client) {
      setUser(null);
      setSession(null);
      return;
    }
    const { error } = await client.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
    setUser(null);
    setSession(null);
  };

  const getAccessToken = () => {
    return session?.access_token || null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signInWithGoogle,
        signOut,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
