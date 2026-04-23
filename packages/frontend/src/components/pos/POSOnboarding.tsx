import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, ShoppingBag, CreditCard, ChefHat, Settings } from 'lucide-react';

const STORAGE_KEY = 'hoppiness_pos_onboarding_seen';

const steps = [
  {
    icon: Settings,
    title: 'Configurá el pedido',
    description: 'Elegí el canal de venta y tipo de servicio antes de agregar productos.',
  },
  {
    icon: ShoppingBag,
    title: 'Armá la cuenta',
    description: 'Buscá productos por nombre o categoría y agregalos a la cuenta.',
  },
  {
    icon: CreditCard,
    title: 'Registrá el pago',
    description: 'Podés dividir el pago entre efectivo, tarjeta y otros medios.',
  },
  {
    icon: ChefHat,
    title: 'Enviá a cocina',
    description: 'Cuando esté todo listo, enviá el pedido. Se imprime automáticamente.',
  },
];

export function POSOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const Icon = step.icon;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={dismiss}
    >
      <div
        className="bg-card rounded-xl shadow-elevated max-w-sm w-full p-6 space-y-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <Button variant="ghost" size="icon-xs" onClick={dismiss}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div>
          <h3 className="text-lg font-bold">{step.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentStep ? 'w-6 bg-primary' : 'w-1.5 bg-muted'
                }`}
              />
            ))}
          </div>
          {isLast ? (
            <Button size="sm" onClick={dismiss}>
              ¡Empezar!
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setCurrentStep((s) => s + 1)}>
              Siguiente <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
