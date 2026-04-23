import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Sun, Moon, Sunrise, Sunset } from 'lucide-react';
import {
  useBranchShiftConfig,
  useUpdateBranchShiftConfig,
  ALL_SHIFTS,
} from '@/hooks/useShiftConfig';

interface ShiftConfigCardProps {
  branchId: string;
}

const SHIFT_ICONS: Record<string, React.ReactNode> = {
  morning: <Sunrise className="w-5 h-5 text-orange-500" />,
  midday: <Sun className="w-5 h-5 text-yellow-500" />,
  night: <Moon className="w-5 h-5 text-blue-500" />,
  overnight: <Sunset className="w-5 h-5 text-purple-500" />,
};

const SHIFT_TIMES: Record<string, string> = {
  morning: '06:00 - 11:00',
  midday: '11:00 - 18:00',
  night: '18:00 - 01:00',
  overnight: '01:00 - 06:00',
};

export function ShiftConfigCard({ branchId }: ShiftConfigCardProps) {
  const { data: config, isLoading } = useBranchShiftConfig(branchId);
  const updateMutation = useUpdateBranchShiftConfig(branchId);

  const handleToggle = (
    configKey: 'shifts_morning_enabled' | 'shifts_overnight_enabled',
    value: boolean,
  ) => {
    updateMutation.mutate({ [configKey]: value });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Turnos Habilitados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Turnos Habilitados
        </CardTitle>
        <CardDescription>
          Configura qué turnos se utilizan en este local para la carga de ventas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {ALL_SHIFTS.map((shift) => {
            const isConfigurable = !!shift.configKey;
            const isEnabled =
              shift.defaultEnabled ||
              (shift.configKey === 'shifts_morning_enabled' && config?.shifts_morning_enabled) ||
              (shift.configKey === 'shifts_overnight_enabled' && config?.shifts_overnight_enabled);

            return (
              <div
                key={shift.value}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  isEnabled ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-muted'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${isEnabled ? 'bg-background' : 'bg-muted'}`}>
                    {SHIFT_ICONS[shift.value]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{shift.label}</span>
                      {!isConfigurable && (
                        <Badge variant="secondary" className="text-xs">
                          Siempre activo
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {SHIFT_TIMES[shift.value]}
                    </span>
                  </div>
                </div>

                {isConfigurable ? (
                  <div className="flex items-center gap-3">
                    <Label htmlFor={shift.value} className="text-sm text-muted-foreground">
                      {isEnabled ? 'Habilitado' : 'Deshabilitado'}
                    </Label>
                    <Switch
                      id={shift.value}
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleToggle(shift.configKey!, checked)}
                      disabled={updateMutation.isPending}
                    />
                  </div>
                ) : (
                  <Badge variant={isEnabled ? 'default' : 'outline'}>Activo</Badge>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <p className="font-medium mb-1">💡 Sobre los turnos</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Mediodía y Noche</strong> siempre están activos
            </li>
            <li>
              <strong>Mañana</strong> es para locales que abren temprano
            </li>
            <li>
              <strong>Trasnoche</strong> es para locales que cierran muy tarde
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
