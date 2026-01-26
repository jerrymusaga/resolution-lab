'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, User } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

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
    const client = supabase;
    if (!client) {
      setLoading(false);
      return;
    }

    // Get initial session - using getUser() which validates with Supabase Auth server
    const initializeAuth = async () => {
      try {
        // First get the session from cookies
        const { data: { session: currentSession } } = await client.auth.getSession();

        if (currentSession) {
          setSession(currentSession);
          setUser({
            id: currentSession.user.id,
            email: currentSession.user.email || '',
            full_name: currentSession.user.user_metadata?.full_name,
            avatar_url: currentSession.user.user_metadata?.avatar_url,
          });
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes - this handles sign in, sign out, token refresh
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
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
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const client = supabase;
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
    const client = supabase;
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
