import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { savePushSubscription } from '@/services/notificationsService';

type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';

interface UsePushNotificationsResult {
  permission: PushPermission;
  isSubscribed: boolean;
  subscribe: () => Promise<void>;
  isLoading: boolean;
}

/**
 * Hook to manage push notification subscription.
 * Handles permission request, SW subscription, and persisting the
 * subscription endpoint to the database for server-side delivery.
 *
 * Requires:
 * - A `push_subscriptions` table in Supabase (user_id, endpoint, keys, created_at)
 * - VITE_VAPID_PUBLIC_KEY env var with the VAPID public key
 */
export function usePushNotifications(): UsePushNotificationsResult {
  const { user } = useAuth();
  const [permission, setPermission] = useState<PushPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as PushPermission);

    navigator.serviceWorker.ready
      .then(async (reg) => {
        const sub = await (reg as any).pushManager.getSubscription();
        setIsSubscribed(!!sub);
      })
      .catch(() => {});
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (subscription: PushSubscription) => {
      if (!user?.id) throw new Error('Not authenticated');

      const subJson = subscription.toJSON();

      await savePushSubscription(user.id, {
        endpoint: subJson.endpoint,
        keys: subJson.keys as Record<string, string>,
      });
    },
  });

  const { mutateAsync: saveSub } = saveMutation;

  const subscribe = useCallback(async () => {
    if (permission === 'unsupported') return;

    try {
      const result = await Notification.requestPermission();
      setPermission(result as PushPermission);

      if (result !== 'granted') return;

      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        if (import.meta.env.DEV) console.warn('VITE_VAPID_PUBLIC_KEY not configured');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let subscription = await (reg as any).pushManager.getSubscription();

      if (!subscription) {
        subscription = await (reg as any).pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        });
      }

      await saveSub(subscription);
      setIsSubscribed(true);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Push subscription error:', err);
    }
  }, [permission, saveSub]);

  return {
    permission,
    isSubscribed,
    subscribe,
    isLoading: saveMutation.isPending,
  };
}
