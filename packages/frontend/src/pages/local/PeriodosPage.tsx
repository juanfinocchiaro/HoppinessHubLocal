import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Lock, Unlock, CalendarDays } from 'lucide-react';
import { usePeriodos, usePeriodoMutations } from '@/hooks/usePeriodos';
import { EmptyState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getCurrentPeriodo } from '@/types/compra';

export default function PeriodosPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: periodos, isLoading } = usePeriodos(branchId!);
  const { create, cerrar, reabrir } = usePeriodoMutations();

  const [newPeriodoOpen, setNewPeriodoOpen] = useState(false);
  const [newPeriodo, setNewPeriodo] = useState(getCurrentPeriodo());

  const [actionModal, setActionModal] = useState<{ type: 'cerrar' | 'reabrir'; id: string } | null>(
    null,
  );
  const [motivo, setMotivo] = useState('');

  const handleCreate = async () => {
    await create.mutateAsync({ branchId: branchId!, periodo: newPeriodo });
    setNewPeriodoOpen(false);
  };

  const handleAction = async () => {
    if (!actionModal) return;
    if (actionModal.type === 'cerrar') {
      await cerrar.mutateAsync({ id: actionModal.id, motivo });
    } else {
      await reabrir.mutateAsync({ id: actionModal.id, motivo });
    }
    setActionModal(null);
    setMotivo('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Períodos"
        subtitle="Gestión de períodos contables mensuales"
        actions={
          <Button onClick={() => setNewPeriodoOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nuevo Período
          </Button>
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha Cierre</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !periodos?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40">
                  <EmptyState
                    icon={CalendarDays}
                    title="Sin períodos"
                    description="Creá el primer período contable"
                  />
                </TableCell>
              </TableRow>
            ) : (
              periodos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono font-medium">{p.period}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'abierto' ? 'default' : 'secondary'}>
                      {p.status === 'abierto' ? '🟢 Abierto' : '🔒 Cerrado'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.closed_at ? new Date(p.closed_at).toLocaleDateString('es-AR') : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {p.close_reason || p.reopen_reason || '-'}
                  </TableCell>
                  <TableCell>
                    {p.status === 'abierto' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActionModal({ type: 'cerrar', id: p.id })}
                      >
                        <Lock className="w-4 h-4 mr-1" /> Cerrar
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActionModal({ type: 'reabrir', id: p.id })}
                      >
                        <Unlock className="w-4 h-4 mr-1" /> Reabrir
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* New Período Modal */}
      <Dialog open={newPeriodoOpen} onOpenChange={setNewPeriodoOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuevo Período</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Período (YYYY-MM)</Label>
              <Input
                value={newPeriodo}
                onChange={(e) => setNewPeriodo(e.target.value)}
                placeholder="2026-02"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNewPeriodoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!newPeriodo || create.isPending}>
              Crear
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cerrar/Reabrir Modal */}
      <Dialog
        open={!!actionModal}
        onOpenChange={() => {
          setActionModal(null);
          setMotivo('');
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {actionModal?.type === 'cerrar' ? 'Cerrar Período' : 'Reabrir Período'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Motivo {actionModal?.type === 'reabrir' ? '*' : '(opcional)'}</Label>
              <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setActionModal(null);
                setMotivo('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant={actionModal?.type === 'cerrar' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={
                (actionModal?.type === 'reabrir' && !motivo) ||
                cerrar.isPending ||
                reabrir.isPending
              }
            >
              {actionModal?.type === 'cerrar' ? 'Cerrar' : 'Reabrir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
