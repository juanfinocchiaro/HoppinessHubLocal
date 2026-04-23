import { useCallback, useState } from 'react';

/**
 * Hook that would open Google OAuth in a popup window.
 * In local mode, Google OAuth is not available — sign in with email/password instead.
 */
export function useGooglePopupAuth(_onSuccess?: () => void) {
  const [loading] = useState(false);

  const signInWithGooglePopup = useCallback(async () => {
    console.warn('Google OAuth is not available in local mode. Use email/password login.');
  }, []);

  return { signInWithGooglePopup, loading };
}
