import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STEPS = [
  {
    id: 'location',
    title: 'Confirmá los datos de tu local',
    description: 'Completá la dirección y horarios de tu primer local. Podés editarlos después en la configuración.',
    icon: '📍',
  },
  {
    id: 'products',
    title: 'Revisá tus primeros productos',
    description: 'Precargamos algunos productos de ejemplo. Editálos, agregá los tuyos, o eliminá los que no uses.',
    icon: '🍔',
  },
  {
    id: 'payment',
    title: 'Elegí cómo cobrar a tus clientes',
    description: 'Configurá los métodos de pago que aceptás: efectivo, MercadoPago, tarjeta.',
    icon: '💳',
  },
];

export default function WelcomeWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  function handleNext() {
    setCompleted(prev => new Set([...prev, currentStep]));
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      navigate('/mimarca', { replace: true });
    }
  }

  function handleSkip() {
    navigate('/mimarca', { replace: true });
  }

  const step = STEPS[currentStep];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🎉</div>
          <h1 className="text-2xl font-bold">¡Bienvenido a RestoStack!</h1>
          <p className="text-muted-foreground mt-1.5">
            Configurá tu local en 3 pasos. Tardás menos de 5 minutos.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`h-1.5 flex-1 rounded-full transition-colors ${
                idx <= currentStep ? 'bg-primary' : 'bg-muted'
              }`} />
              {idx < STEPS.length - 1 && (
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mx-1 text-xs transition-colors ${
                  completed.has(idx) ? 'bg-primary border-primary text-white' :
                  idx === currentStep ? 'border-primary text-primary' : 'border-muted-foreground/30'
                }`}>
                  {completed.has(idx) ? '✓' : idx + 1}
                </div>
              )}
            </div>
          ))}
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-xs transition-colors ${
            currentStep === STEPS.length - 1 ? 'border-primary text-primary' : 'border-muted-foreground/30'
          }`}>
            {STEPS.length}
          </div>
        </div>

        {/* Step content */}
        <div className="bg-card border rounded-xl p-8 shadow-sm">
          <div className="text-5xl text-center mb-4">{step.icon}</div>
          <h2 className="text-xl font-semibold text-center mb-2">{step.title}</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">{step.description}</p>

          <StepContent stepId={step.id} />

          <div className="flex flex-col gap-3 mt-6">
            <button
              onClick={handleNext}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {currentStep < STEPS.length - 1 ? 'Continuar' : 'Ir al panel →'}
            </button>
          </div>
        </div>

        <div className="text-center mt-4">
          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Saltar configuración y explorar por mi cuenta
          </button>
        </div>
      </div>
    </div>
  );
}

function StepContent({ stepId }: { stepId: string }) {
  if (stepId === 'location') {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Dirección</label>
          <input
            type="text"
            placeholder="Av. Colón 1234, Córdoba"
            className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Abre a las</label>
            <input type="time" defaultValue="09:00" className="w-full rounded-md border px-3 py-2 text-sm bg-background" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Cierra a las</label>
            <input type="time" defaultValue="23:00" className="w-full rounded-md border px-3 py-2 text-sm bg-background" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Teléfono</label>
          <input
            type="tel"
            placeholder="+54 351 123-4567"
            className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
    );
  }

  if (stepId === 'products') {
    return (
      <div className="rounded-lg bg-muted/50 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Precargamos algunos productos de ejemplo según el tipo de negocio que elegiste.
          Los vas a poder ver y editar en{' '}
          <strong>Mi Marca → Carta</strong>.
        </p>
        <div className="mt-3 flex justify-center gap-2">
          {['🍔', '🥤', '🍟'].map((emoji, i) => (
            <div key={i} className="w-12 h-12 rounded-lg bg-background border flex items-center justify-center text-xl">
              {emoji}
            </div>
          ))}
          <div className="w-12 h-12 rounded-lg bg-background border flex items-center justify-center text-sm text-muted-foreground">
            +más
          </div>
        </div>
      </div>
    );
  }

  if (stepId === 'payment') {
    return (
      <div className="space-y-2">
        {[
          { label: 'Efectivo', icon: '💵', enabled: true },
          { label: 'MercadoPago', icon: '💙', enabled: false },
          { label: 'Tarjeta de débito/crédito', icon: '💳', enabled: false },
        ].map(method => (
          <div key={method.label} className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">{method.icon}</span>
              <span className="text-sm font-medium">{method.label}</span>
            </div>
            <div className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${method.enabled ? 'bg-primary justify-end' : 'bg-muted justify-start'}`}>
              <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground pt-1">
          Podés configurar los métodos de pago en detalle desde la configuración de tu local.
        </p>
      </div>
    );
  }

  return null;
}
