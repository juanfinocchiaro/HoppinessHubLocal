/**
 * SaveScheduleDialog - Confirmation dialog before saving schedule changes
 *
 * Shows affected employees and notification options
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MessageSquare, Users, Calendar, AlertCircle } from 'lucide-react';
interface AffectedEmployee {
  id: string;
  name: string;
  changesCount: number;
}

interface SaveScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  affectedEmployees: AffectedEmployee[];
  totalChanges: number;
  monthLabel: string;
  onConfirm: (notifyEmail: boolean, notifyCommunication: boolean) => Promise<void>;
  isPending?: boolean;
}

export function SaveScheduleDialog({
  open,
  onOpenChange,
  affectedEmployees,
  totalChanges,
  monthLabel,
  onConfirm,
  isPending = false,
}: SaveScheduleDialogProps) {
  // Email disabled until hoppiness.com.ar domain is verified in Resend
  const [notifyEmail] = useState(false);
  const [notifyCommunication, setNotifyCommunication] = useState(true);

  const handleConfirm = async () => {
    await onConfirm(notifyEmail, notifyCommunication);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Publicar horarios
          </DialogTitle>
          <DialogDescription>Horarios de {monthLabel}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{affectedEmployees.length} empleados</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{totalChanges} cambios</span>
            </div>
          </div>

          {/* Affected employees list */}
          {affectedEmployees.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Empleados afectados</Label>
              <ScrollArea className="h-[120px] border rounded-md p-2">
                <div className="space-y-1">
                  {affectedEmployees.map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between py-1">
                      <span className="text-sm">{emp.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {emp.changesCount} {emp.changesCount === 1 ? 'día' : 'días'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Notification options */}
          <div className="space-y-3 pt-2 border-t">
            <Label className="text-xs text-muted-foreground">Notificaciones</Label>

            {/* Email option hidden until domain is verified
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify-email"
                checked={notifyEmail}
                onCheckedChange={(checked) => setNotifyEmail(checked === true)}
              />
              <label
                htmlFor="notify-email"
                className="text-sm flex items-center gap-2 cursor-pointer"
              >
                <Mail className="w-4 h-4 text-muted-foreground" />
                Enviar email a cada empleado
              </label>
            </div>
            */}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify-comm"
                checked={notifyCommunication}
                onCheckedChange={(checked) => setNotifyCommunication(checked === true)}
              />
              <label
                htmlFor="notify-comm"
                className="text-sm flex items-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                Crear comunicado interno
              </label>
            </div>
          </div>

          {/* Warning if no notifications */}
          {!notifyEmail && !notifyCommunication && (
            <div className="flex items-start gap-2 p-2 bg-warning/10 border border-warning/30 rounded-md">
              <AlertCircle className="w-4 h-4 text-warning mt-0.5" />
              <p className="text-xs text-warning-foreground">
                Los empleados no recibirán notificación de sus horarios
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Publicar horarios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
