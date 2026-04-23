import { useEffect } from 'react';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';
import { getSession, onAuthStateChange } from '@/services/authService';

/**
 * AuthPopup — Minimal page opened in a popup window for OAuth.
 * In local mode, Google OAuth is not available. If a session already exists
 * (e.g. from email/password login), it notifies the opener and closes.
 * Otherwise it shows a message and closes after a short delay.
 */
export default function AuthPopup() {
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await getSession();
      if (session) {
        if (window.opener) {
          window.opener.postMessage(
            { type: 'AUTH_COMPLETE', success: true },
            window.location.origin,
          );
        }
        window.close();
        return;
      }

      // No external OAuth provider in local mode — notify failure and close
      if (window.opener) {
        window.opener.postMessage(
          { type: 'AUTH_COMPLETE', success: false },
          window.location.origin,
        );
      }
      setTimeout(() => window.close(), 1500);
    };

    checkSession();
  }, []);

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
        <p className="text-muted-foreground text-sm">
          Google OAuth no disponible en modo local.
        </p>
        <p className="text-muted-foreground text-xs">
          Usá email y contraseña para iniciar sesión.
        </p>
      </div>
    </div>
  );
}
