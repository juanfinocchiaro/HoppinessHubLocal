import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { resendEmailConfirmation } from '@/services/authService';
import { Mail, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function EmailConfirmBanner() {
  const { user, emailConfirmed } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);

  if (!user || emailConfirmed || dismissed) return null;
  if (user.app_metadata?.provider === 'google') return null;

  const handleResend = async () => {
    setResending(true);
    const { error } = await resendEmailConfirmation(user.email!);
    setResending(false);
    if (error) {
      toast.error('No se pudo reenviar el email');
    } else {
      toast.success('Email de confirmación reenviado');
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Mail className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800 truncate">
          Confirmá tu email para acceder a todas las funciones.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 text-xs h-7"
          onClick={handleResend}
          disabled={resending}
        >
          {resending ? 'Enviando...' : 'Reenviar'}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-amber-500 hover:text-amber-700"
          onClick={() => setDismissed(true)}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
