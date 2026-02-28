import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { usePOSPortal } from './POSPortalContext';
import { Check, Loader2, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SendingStage = 'creating' | 'invoicing' | 'printing' | 'done';

export function SendDialogContent({
  phase,
  currentStage,
  willInvoice,
  willPrint,
  totalQty,
  totalItems,
  onCancel,
  onConfirm,
}: {
  phase: 'confirm' | 'progress';
  currentStage: SendingStage | null;
  willInvoice: boolean;
  willPrint: boolean;
  totalQty: number;
  totalItems: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const containerRef = usePOSPortal();

  const stages: { key: SendingStage; label: string; doneLabel: string }[] = [
    { key: 'creating', label: 'Registrando pedido...', doneLabel: 'Pedido registrado' },
    ...(willInvoice
      ? [{ key: 'invoicing' as const, label: 'Facturando...', doneLabel: 'Facturado' }]
      : []),
    ...(willPrint
      ? [{ key: 'printing' as const, label: 'Imprimiendo...', doneLabel: 'Impreso' }]
      : []),
  ];

  const stageOrder = stages.map((s) => s.key);
  const currentIdx =
    currentStage === 'done'
      ? stageOrder.length
      : currentStage
        ? stageOrder.indexOf(currentStage)
        : -1;

  return (
    <DialogPrimitive.Portal container={containerRef?.current ?? undefined}>
      <DialogPrimitive.Overlay className="absolute inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className="absolute left-[50%] top-[50%] z-50 grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-elevated duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg"
        onPointerDownOutside={(e) => {
          if (phase === 'progress') e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (phase === 'progress') e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (phase === 'progress') e.preventDefault();
        }}
      >
        {phase === 'confirm' ? (
          <>
            <div className="space-y-2">
              <DialogPrimitive.Title className="text-lg font-semibold">
                ¿Enviar pedido a cocina?
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-muted-foreground">
                {totalQty} items · $ {totalItems.toLocaleString('es-AR')}
                <br />
                Una vez enviado no se podrán agregar más items.
              </DialogPrimitive.Description>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onCancel}>
                Volver
              </Button>
              <Button onClick={onConfirm} className="bg-success hover:bg-success/90 text-white">
                Sí, enviar a cocina
              </Button>
            </div>
          </>
        ) : (
          <div className="py-2">
            <div className="space-y-0">
              {stages.map((stage, i) => {
                const isDone = currentIdx > i;
                const isActive = currentIdx === i;
                return (
                  <div key={stage.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300',
                          isDone && 'bg-emerald-100 text-emerald-600',
                          isActive && 'bg-blue-100 text-blue-600',
                          !isDone && !isActive && 'bg-muted text-muted-foreground',
                        )}
                      >
                        {isDone ? (
                          <Check className="h-4 w-4" />
                        ) : isActive ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CircleDot className="h-3.5 w-3.5" />
                        )}
                      </div>
                      {i < stages.length - 1 && (
                        <div
                          className={cn(
                            'w-0.5 h-5 transition-colors duration-300',
                            isDone ? 'bg-emerald-300' : 'bg-muted',
                          )}
                        />
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-sm pt-1 transition-colors duration-300',
                        isDone && 'text-emerald-700 font-medium',
                        isActive && 'text-foreground font-medium',
                        !isDone && !isActive && 'text-muted-foreground',
                      )}
                    >
                      {isDone ? stage.doneLabel : isActive ? stage.label : stage.doneLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            {currentStage === 'done' && (
              <div className="flex flex-col items-center gap-2 mt-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="h-6 w-6 text-emerald-600" />
                </div>
                <span className="text-base font-semibold text-emerald-700">Pedido enviado</span>
              </div>
            )}
          </div>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
