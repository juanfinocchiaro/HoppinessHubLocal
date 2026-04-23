import { useEffect, useRef } from 'react';
import { lovable } from '@/integrations/lovable';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';
import { getSession, onAuthStateChange } from '@/services/authService';

/**
 * AuthPopup — Minimal page opened in a popup window for Google OAuth.
 * Flow:
 * 1. On mount, initiates Google OAuth (redirects within the popup)
 * 2. After Google callback, detects session
 * 3. Posts message to opener window and closes itself
 */
export default function AuthPopup() {
  const initiated = useRef(false);

  useEffect(() => {
    // Check if we already have a session (returning from Google redirect)
    const checkSession = async () => {
      const {
        data: { session },
      } = await getSession();
      if (session) {
        // Notify the opener window
        if (window.opener) {
          window.opener.postMessage(
            { type: 'AUTH_COMPLETE', success: true },
            window.location.origin,
          );
        }
        window.close();
        return;
      }

      // No session yet — initiate OAuth (only once)
      if (!initiated.current) {
        initiated.current = true;
        try {
          const result = await lovable.auth.signInWithOAuth('google', {
            redirect_uri: `${window.location.origin}/auth-popup`,
          });
          if (result.error) {
            if (window.opener) {
              window.opener.postMessage(
                { type: 'AUTH_COMPLETE', success: false },
                window.location.origin,
              );
            }
            window.close();
          }
        } catch {
          if (window.opener) {
            window.opener.postMessage(
              { type: 'AUTH_COMPLETE', success: false },
              window.location.origin,
            );
          }
          window.close();
        }
      }
    };

    checkSession();
  }, []);

  // Also listen for auth state changes (covers the callback case)
  useEffect(() => {
    const {
      data: { subscription },
    } = onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        if (window.opener) {
          window.opener.postMessage(
            { type: 'AUTH_COMPLETE', success: true },
            window.location.origin,
          );
        }
        window.close();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <img src={logoHoppiness} alt="Hoppiness Club" className="w-16 h-16 mx-auto rounded-full" />
        <p className="text-muted-foreground text-sm">Conectando con Google...</p>
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  );
}
