import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import {
  getSession,
  onAuthStateChange,
  signInWithPassword,
  signOut as signOutFromService,
  signUpWithPassword,
} from '@/services/authService';
import { setAuthTokens } from '@/services/apiClient';

interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: { user: AuthUser } | null;
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string, captchaToken?: string) => {
    const { data, error } = await signInWithPassword(email, password, captchaToken);
    if (data?.user) {
      setUser(data.user);
    }
    return { error: error as Error | null };
  };

  const emailConfirmed = !!user?.email_confirmed_at;

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    captchaToken?: string,
  ) => {
    const { data, error } = await signUpWithPassword(email, password, fullName, captchaToken);
    if (data?.user) {
      setUser(data.user);
    }
    return { error: error as Error | null };
  };

  const signOut = async () => {
    try {
      await signOutFromService();
    } catch {
      // ignore
    } finally {
      setAuthTokens(null);
      setUser(null);
    }
  };

  const session = user ? { user } : null;

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
