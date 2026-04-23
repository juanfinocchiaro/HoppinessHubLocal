import { useQuery } from '@tanstack/react-query';
import { fetchProfileCompleteness, fetchEmployeeDataCompleteness } from '@/services/profileService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Circle, UserCog } from 'lucide-react';

interface ProfileCompletenessCardProps {
  userId: string;
}

interface CompletionField {
  key: string;
  label: string;
  filled: boolean;
}

export function ProfileCompletenessCard({ userId }: ProfileCompletenessCardProps) {
  const { data: profile } = useQuery({
    queryKey: ['profile-completeness', userId],
    queryFn: () => fetchProfileCompleteness(userId),
    enabled: !!userId,
  });

  const { data: employeeData } = useQuery({
    queryKey: ['employee-data-completeness', userId],
    queryFn: () => fetchEmployeeDataCompleteness(userId),
    enabled: !!userId,
  });

  if (!profile) return null;

  const ed = employeeData;

  const fields: CompletionField[] = [
    { key: 'phone', label: 'Teléfono', filled: !!profile.phone },
    { key: 'dni', label: 'DNI', filled: !!(profile.dni || ed?.dni) },
    {
      key: 'birth_date',
      label: 'Fecha de nacimiento',
      filled: !!(profile.birth_date || ed?.birth_date),
    },
    {
      key: 'emergency',
      label: 'Contacto de emergencia',
      filled: !!(profile.emergency_contact_name || ed?.emergency_contact),
    },
    {
      key: 'emergency_phone',
      label: 'Teléfono de emergencia',
      filled: !!(profile.emergency_contact_phone || ed?.emergency_phone),
    },
    { key: 'banking', label: 'Datos bancarios (CBU)', filled: !!(profile.cbu || ed?.cbu) },
    { key: 'cuil', label: 'CUIL', filled: !!ed?.cuil },
  ];

  const filledCount = fields.filter((f) => f.filled).length;
  const percentage = Math.round((filledCount / fields.length) * 100);

  if (percentage === 100) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCog className="w-4 h-4 text-muted-foreground" />
          Completá tu perfil
          <span className="ml-auto text-sm font-normal text-muted-foreground">{percentage}%</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={percentage} className="h-2" />
        <div className="grid gap-1">
          {fields
            .filter((f) => !f.filled)
            .map((f) => (
              <div key={f.key} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Circle className="w-3.5 h-3.5 shrink-0" />
                {f.label}
              </div>
            ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Pedile a tu encargado que cargue los datos faltantes en la ficha de tu local.
        </p>
      </CardContent>
    </Card>
  );
}
