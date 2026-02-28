import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchOnboardingStatus, completeOnboarding } from '@/services/userOnboardingService';
import { useAuth } from '@/hooks/useAuth';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Clock,
  Calendar,
  MessageSquare,
  DollarSign,
  Users,
  BarChart3,
  Store,
  CheckCircle2,
  ArrowRight,
  Rocket,
} from 'lucide-react';

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function getStepsForRole(
  isOperational: boolean,
  isFranquiciado: boolean,
  hasMultipleBranches: boolean,
): OnboardingStep[] {
  const common: OnboardingStep[] = [
    {
      icon: <Rocket className="w-12 h-12 text-primary" />,
      title: '¡Bienvenido a Hoppiness!',
      description: 'Te mostramos rápidamente las secciones principales para que puedas empezar.',
    },
  ];

  if (isOperational) {
    return [
      ...common,
      {
        icon: <Clock className="w-12 h-12 text-blue-500" />,
        title: 'Fichajes',
        description:
          'Escaneá el QR de tu local para fichar entrada y salida. Tu PIN de fichaje lo podés ver en la pantalla de inicio.',
      },
      {
        icon: <Calendar className="w-12 h-12 text-green-500" />,
        title: 'Horarios y Solicitudes',
        description:
          'Consultá tu horario semanal y pedí días libres o cambios desde la sección "Solicitudes".',
      },
      {
        icon: <DollarSign className="w-12 h-12 text-amber-500" />,
        title: 'Adelantos',
        description:
          'Podés solicitar un adelanto de sueldo desde "Solicitudes > Adelantos". Tu encargado lo aprobará.',
      },
      {
        icon: <MessageSquare className="w-12 h-12 text-purple-500" />,
        title: 'Comunicados',
        description:
          'Revisá los comunicados con frecuencia. Los urgentes aparecerán como alerta cuando inicies sesión.',
      },
    ];
  }

  if (isFranquiciado) {
    const steps: OnboardingStep[] = [
      ...common,
      {
        icon: <Store className="w-12 h-12 text-blue-500" />,
        title: 'Tus Locales',
        description:
          'Desde la pantalla de inicio podés acceder a cada local para ver ventas, equipo, gastos y más.',
      },
      {
        icon: <Users className="w-12 h-12 text-green-500" />,
        title: 'Gestión de Equipo',
        description:
          'En cada local, la sección "Equipo" te permite ver fichajes, horarios, apercibimientos y adelantos.',
      },
    ];

    if (hasMultipleBranches) {
      steps.push({
        icon: <BarChart3 className="w-12 h-12 text-amber-500" />,
        title: 'Comparativo',
        description:
          'Usá la sección "Comparativo" para ver el rendimiento de tus locales lado a lado.',
      });
    }

    return steps;
  }

  return common;
}

export function OnboardingWizard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { branchRoles } = usePermissionsWithImpersonation();

  const isOnlyFranquiciado =
    branchRoles.length > 0 && branchRoles.every((r) => r.local_role === 'franquiciado');
  const isOperational = branchRoles.length > 0 && !isOnlyFranquiciado;
  const hasMultipleBranches = branchRoles.length >= 2;

  const { data: profile, isLoading } = useQuery({
    queryKey: ['onboarding-status', user?.id],
    queryFn: () => fetchOnboardingStatus(user!.id),
    enabled: !!user?.id,
    staleTime: Infinity,
  });

  const completeMutation = useMutation({
    mutationFn: () => completeOnboarding(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
    },
  });

  const [currentStep, setCurrentStep] = useState(0);

  const steps = getStepsForRole(isOperational, isOnlyFranquiciado, hasMultipleBranches);

  const shouldShow =
    !isLoading && profile && !profile.onboarding_completed_at && branchRoles.length > 0;

  if (!shouldShow) return null;

  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;
  const step = steps[currentStep];

  const handleNext = () => {
    if (isLastStep) {
      completeMutation.mutate();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    completeMutation.mutate();
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) handleSkip();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Onboarding</DialogTitle>
          <DialogDescription className="sr-only">Tutorial de bienvenida</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center text-center space-y-4 py-4">
          {step.icon}
          <h2 className="text-xl font-bold">{step.title}</h2>
          <p className="text-muted-foreground leading-relaxed">{step.description}</p>
        </div>

        <Progress value={progress} className="h-1.5" />

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            Omitir
          </Button>
          <div className="text-xs text-muted-foreground">
            {currentStep + 1} / {steps.length}
          </div>
          <Button onClick={handleNext} className="gap-1">
            {isLastStep ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                ¡Empezar!
              </>
            ) : (
              <>
                Siguiente
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
