import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trash2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  useEmployeeConsumptionsByMonth,
  useEmployeeConsumptionMutations,
} from '@/hooks/useEmployeeConsumptions';
import { EmployeeConsumptionModal } from './EmployeeConsumptionModal';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  userId: string;
  userName: string;
  year: number;
  month: number;
}

export function EmployeeConsumptionListModal({
  open, onOpenChange, branchId, userId, userName, year, month,
}: Props) {
  const { data: allConsumptions = [], isLoading } = useEmployeeConsumptionsByMonth(branchId, year, month);
  const { softDelete } = useEmployeeConsumptionMutations();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const userConsumptions = allConsumptions.filter((c) => c.user_id === userId);
  const total = userConsumptions.reduce((sum, c) => sum + Number(c.amount), 0);

  const monthLabel = format(new Date(year, month), 'MMMM yyyy', { locale: es });

  const handleDelete = () => {
    if (!deleteTarget) return;
    softDelete.mutate(deleteTarget);
    setDeleteTarget(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span>Consumos — {userName}</span>
              <Button size="sm" variant="outline" onClick={() => setShowAddModal(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Nuevo
              </Button>
            </DialogTitle>
            <p className="text-sm text-muted-foreground capitalize">{monthLabel}</p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Cargando…</p>
            ) : userConsumptions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sin consumos registrados este mes
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs text-right">Monto</TableHead>
                    <TableHead className="text-xs">Descripción</TableHead>
                    <TableHead className="text-xs">Origen</TableHead>
                    <TableHead className="text-xs w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userConsumptions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm py-2">
                        {format(new Date(c.consumption_date + 'T12:00:00'), 'd MMM', { locale: es })}
                      </TableCell>
                      <TableCell className="text-sm py-2 text-right font-medium">
                        ${Number(c.amount).toLocaleString('es-AR')}
                      </TableCell>
                      <TableCell className="text-sm py-2 text-muted-foreground max-w-[160px] truncate">
                        {c.description || '-'}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant="outline" className="text-[10px]">
                          {c.source === 'manual' ? 'Manual' : 'Auto'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(c.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {userConsumptions.length > 0 && (
            <div className="border-t pt-3 flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Total del mes</span>
              <span className="font-bold text-base">${total.toLocaleString('es-AR')}</span>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Eliminar consumo"
        description="¿Estás seguro de que querés eliminar este consumo? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={handleDelete}
      />

      {showAddModal && (
        <EmployeeConsumptionModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
          branchId={branchId}
          userId={userId}
          userName={userName}
        />
      )}
    </>
  );
}
