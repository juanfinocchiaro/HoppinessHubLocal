import { MapPinOff, ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface SuggestedBranch {
  id: string;
  name: string;
  slug: string;
}

interface DeliveryUnavailableProps {
  onSwitchToPickup: () => void;
  onChangeAddress: () => void;
  reason?: string;
  suggestedBranch?: SuggestedBranch | null;
}

export function DeliveryUnavailable({
  onSwitchToPickup,
  onChangeAddress,
  reason,
  suggestedBranch,
}: DeliveryUnavailableProps) {
  const navigate = useNavigate();

  // Barrio asignado a otro local → mostrar sugerencia
  if (reason === 'assigned_other_branch' && suggestedBranch) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-4 space-y-3 text-center">
        <div className="flex justify-center">
          <MapPinOff className="h-8 w-8 text-amber-500" />
        </div>
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
          Tu zona es atendida por otro local
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-500">
          El local <strong>{suggestedBranch.name}</strong> cubre tu barrio.
        </p>
        <div className="flex flex-col gap-2">
          <Button
            variant="default"
            size="sm"
            className="gap-2"
            onClick={() => navigate(`/pedir/${suggestedBranch.slug}`)}
          >
            Pedir desde {suggestedBranch.name}
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onChangeAddress}>
            Cambiar dirección
          </Button>
        </div>
      </div>
    );
  }

  if (reason === 'outside_hours') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-4 space-y-3 text-center">
        <div className="flex justify-center">
          <Clock className="h-8 w-8 text-amber-500" />
        </div>
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
          Delivery no disponible en este horario
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-500">
          Podés elegir retiro en local o intentar más tarde.
        </p>
        <div className="flex flex-col gap-2">
          <Button variant="default" size="sm" onClick={onSwitchToPickup}>
            Elegir Retiro en local
          </Button>
        </div>
      </div>
    );
  }

  // Caso genérico
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-4 space-y-3 text-center">
      <div className="flex justify-center">
        <MapPinOff className="h-8 w-8 text-red-400" />
      </div>
      <p className="text-sm font-medium text-red-700 dark:text-red-400">
        Por el momento no tenemos cobertura en tu zona.
      </p>
      <div className="flex flex-col gap-2">
        <Button variant="default" size="sm" onClick={onSwitchToPickup}>
          Elegir Retiro en local
        </Button>
        <Button variant="outline" size="sm" onClick={onChangeAddress}>
          Cambiar dirección
        </Button>
      </div>
    </div>
  );
}
