import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import {
  getSession,
  onAuthStateChange,
  signInWithPassword,
  signOut as signOutFromService,
  signUpWithPassword,
} from '@/services/authService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  emailConfirmed: boolean;
  signIn: (
    email: string,
    password: string,
    captchaToken?: string,
  ) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    captchaToken?: string,
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use onAuthStateChange as the single source of truth.
    // getSession() is only needed to trigger the INITIAL_SESSION event
    // when no auth event has fired yet.
    const {
      data: { subscription },
    } = onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Trigger initial session check — the result is handled by the
    // listener above (fires INITIAL_SESSION event), avoiding double state updates.
    getSession();

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string, captchaToken?: string) => {
    const { error } = await signInWithPassword(email, password, captchaToken);
    return { error: error as Error | null };
  };

  const emailConfirmed = !!user?.email_confirmed_at;

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    captchaToken?: string,
  ) => {
    const { error } = await signUpWithPassword(email, password, fullName, captchaToken);
    return { error: error as Error | null };
  };

  const signOut = async () => {
    try {
      await signOutFromService();
    } catch {
      // Even if signOut fails (e.g. offline), clear local state
      // so the user can always leave the session
    } finally {
      setSession(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, emailConfirmed, signIn, signUp, signOut }}
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
