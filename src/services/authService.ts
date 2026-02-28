import { supabase } from './supabaseClient';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

type AuthStateCallback = (event: AuthChangeEvent, session: Session | null) => void;

export async function getSession() {
  return supabase.auth.getSession();
}

export async function getUser() {
  return supabase.auth.getUser();
}

export function onAuthStateChange(callback: AuthStateCallback) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function setSession(tokens: { access_token: string; refresh_token: string }) {
  return supabase.auth.setSession(tokens);
}

export async function updateUserPassword(password: string) {
  return supabase.auth.updateUser({ password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function resetPasswordForEmail(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

export async function resendEmailConfirmation(email: string) {
  return supabase.auth.resend({ type: 'signup', email });
}

export async function signUpWithInvitation(
  email: string,
  password: string,
  fullName: string,
  invitationToken: string,
) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/`,
      data: {
        full_name: fullName,
        invitation_token: invitationToken,
      },
    },
  });
}

export async function signInWithPassword(
  email: string,
  password: string,
  captchaToken?: string,
) {
  return supabase.auth.signInWithPassword({
    email,
    password,
    options: {
      captchaToken,
    },
  });
}

export async function signUpWithPassword(
  email: string,
  password: string,
  fullName: string,
  captchaToken?: string,
) {
  const redirectUrl = `${window.location.origin}/`;
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      captchaToken,
      data: {
        full_name: fullName,
      },
    },
  });
}
