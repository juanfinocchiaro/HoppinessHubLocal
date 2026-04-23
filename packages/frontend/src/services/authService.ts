import { api, apiGet, apiPost, setAuthTokens } from './apiClient';

export async function signInWithPassword(email: string, password: string, _captchaToken?: string) {
  try {
    const result = await apiPost('/auth/login', { email, password });
    if (result.tokens) {
      setAuthTokens(result.tokens);
    }
    return { data: result, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

export async function signUpWithPassword(email: string, password: string, fullName: string, _captchaToken?: string) {
  try {
    const result = await apiPost('/auth/signup', { email, password, full_name: fullName });
    if (result.tokens) {
      setAuthTokens(result.tokens);
    }
    return { data: result, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

export async function signUpWithInvitation(email: string, password: string, fullName: string, invitationToken: string) {
  try {
    const result = await apiPost('/auth/signup', {
      email,
      password,
      full_name: fullName,
      invitation_token: invitationToken,
    });
    if (result.tokens) {
      setAuthTokens(result.tokens);
    }
    return { data: result, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

export async function signOut() {
  setAuthTokens(null);
  return { error: null };
}

export async function getSession() {
  try {
    const user = await apiGet('/auth/me');
    return { data: { session: { user } }, error: null };
  } catch {
    return { data: { session: null }, error: null };
  }
}

export async function getUser() {
  try {
    const user = await apiGet('/auth/me');
    return { data: { user }, error: null };
  } catch {
    return { data: { user: null }, error: null };
  }
}

export async function updateUserPassword(password: string) {
  try {
    await apiPost('/auth/change-password', { new_password: password });
    return { data: {}, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

export async function resetPasswordForEmail(_email: string) {
  // For local-only usage, password reset sends no email.
  // The user can change their password directly if logged in.
  return { data: {}, error: null };
}

export async function resendEmailConfirmation(_email: string) {
  // No-op for local mode - emails are auto-confirmed
  return { data: {}, error: null };
}

export async function setSession(_tokens: { access_token: string; refresh_token: string }) {
  // For compatibility with old Lovable/Google OAuth flow
  // Not needed in local mode
  return { data: { session: null }, error: null };
}

type AuthCallback = (event: string, session: any) => void;

export function onAuthStateChange(callback: AuthCallback) {
  // Check stored token on mount
  const stored = localStorage.getItem('hoppiness_auth');
  if (stored) {
    getSession().then(({ data }) => {
      if (data?.session?.user) {
        callback('INITIAL_SESSION', { user: data.session.user });
      } else {
        callback('SIGNED_OUT', null);
      }
    });
  } else {
    setTimeout(() => callback('INITIAL_SESSION', null), 0);
  }

  // Listen for storage changes (e.g. logout in another tab)
  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'hoppiness_auth') {
      if (!e.newValue) {
        callback('SIGNED_OUT', null);
      }
    }
  };
  window.addEventListener('storage', handleStorage);

  return {
    data: {
      subscription: {
        unsubscribe: () => window.removeEventListener('storage', handleStorage),
      },
    },
  };
}
