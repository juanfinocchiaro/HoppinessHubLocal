import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import type { ClockEntry } from './types';

interface DeleteEntryDialogProps {
  entry: ClockEntry | null;
  isPending: boolean;
  onConfirm: (entryId: string) => void;
  onClose: () => void;
}

export function DeleteEntryDialog({ entry, isPending, onConfirm, onClose }: DeleteEntryDialogProps) {
  return (
    <AlertDialog open={!!entry} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar fichaje</AlertDialogTitle>
          <AlertDialogDescription>
            {entry && (
              <>
                Vas a eliminar el fichaje de{' '}
                <strong>{entry.entry_type === 'clock_in' ? 'entrada' : 'salida'}</strong> de{' '}
                <strong>{entry.user_name}</strong> del{' '}
                <strong>{format(new Date(entry.created_at), "dd/MM 'a las' HH:mm")}</strong>.
                Esta acción no se puede deshacer.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => entry && onConfirm(entry.id)}
            disabled={isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isPending ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
