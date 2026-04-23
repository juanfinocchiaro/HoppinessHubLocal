/**
 * PostPurchaseSignup — Banner shown on TrackingPage for guest users
 * to encourage account creation after placing an order.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { linkGuestOrders } from '@/services/userOnboardingService';
import { useGooglePopupAuth } from '@/hooks/useGooglePopupAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UserPlus, X } from 'lucide-react';

interface Props {
  trackingCode: string;
}

export function PostPurchaseSignup({ trackingCode }: Props) {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const { signInWithGooglePopup, loading } = useGooglePopupAuth();

  // When user logs in (e.g. after Google OAuth redirect), link guest orders
  useEffect(() => {
    if (!user || !trackingCode) return;
    linkGuestOrders({ tracking_code: trackingCode }).catch(() => {});
  }, [user, trackingCode]);

  // Don't show if already logged in or dismissed
  if (user || dismissed) return null;

  const handleGoogle = () => {
    signInWithGooglePopup();
  };

  return (
    <Card className="border-primary/30 bg-primary/5 relative">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/50 text-muted-foreground"
      >
        <X className="w-4 h-4" />
      </button>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">¡Creá tu cuenta!</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Guardá tus datos, volvé a pedir con un tap y seguí tus pedidos desde tu cuenta.
        </p>
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleGoogle}
            variant="outline"
            className="w-full gap-2"
            disabled={loading}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar con Google
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setDismissed(true)}
          >
            Ahora no
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
