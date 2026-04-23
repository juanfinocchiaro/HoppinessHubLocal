import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { useState } from 'react';

/**
 * Shows a dismissable prompt asking the user to enable push notifications.
 * Only renders when notifications are supported but not yet subscribed.
 */
export function PushNotificationPrompt() {
  const { permission, isSubscribed, subscribe, isLoading } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || isSubscribed || permission === 'denied' || permission === 'unsupported') {
    return null;
  }

  return (
    <Alert className="border-primary/30 bg-primary/5 relative">
      <Bell className="h-4 w-4 text-primary" />
      <AlertDescription className="flex items-center justify-between gap-3">
        <span className="text-sm">
          Activá las notificaciones para enterarte de comunicados, solicitudes y más.
        </span>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" onClick={subscribe} disabled={isLoading}>
            Activar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
