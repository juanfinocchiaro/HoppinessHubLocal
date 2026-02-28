import { useCallback, useEffect, useRef, useState } from 'react';
import { lovable } from '@/integrations/lovable';
import { getSession } from '@/services/authService';

/**
 * Hook that opens Google OAuth in a popup window instead of redirecting.
 * Falls back to redirect if popup is blocked.
 */
export function useGooglePopupAuth(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Listen for postMessage from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'AUTH_COMPLETE') {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        popupRef.current = null;
        setLoading(false);

        if (event.data.success) {
          // Refresh the session in the main window
          getSession().then(() => {
            onSuccess?.();
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess]);

  const signInWithGooglePopup = useCallback(async () => {
    setLoading(true);

    // Try to open popup
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      '/auth-popup',
      'google-auth-popup',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`,
    );

    if (!popup || popup.closed) {
      // Popup blocked — fallback to redirect
      console.warn('Popup blocked, falling back to redirect');
      try {
        const result = await lovable.auth.signInWithOAuth('google', {
          redirect_uri: window.location.origin,
        });
        if (result.error) {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
      return;
    }

    popupRef.current = popup;

    // Poll to detect if user closed popup manually
    pollingRef.current = setInterval(() => {
      if (popup.closed) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = null;
        popupRef.current = null;
        setLoading(false);
      }
    }, 500);
  }, []);

  return { signInWithGooglePopup, loading };
}
