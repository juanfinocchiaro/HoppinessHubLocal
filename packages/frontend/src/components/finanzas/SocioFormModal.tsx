import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSocioMutations, type SocioFormData } from '@/hooks/useSocios';
import type { Tables } from '@/types/database';

type Socio = Tables<'partners'>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  socio?: Socio | null;
}

export function SocioFormModal({ open, onOpenChange, branchId, socio }: Props) {
  const { createSocio, updateSocio } = useSocioMutations();
  const isEdit = !!socio;

  const [form, setForm] = useState({
    name: '',
    cuit: '',
    email: '',
    phone: '',
    ownership_percentage: '',
    fecha_ingreso: new Date().toISOString().split('T')[0],
    limite_retiro_mensual: '',
  });

  useEffect(() => {
    if (socio) {
      setForm({
        name: socio.name || '',
        cuit: socio.cuit || '',
        email: socio.email || '',
        phone: socio.phone || '',
        ownership_percentage: String(socio.ownership_percentage),
        fecha_ingreso: socio.start_date,
        limite_retiro_mensual: socio.limite_retiro_mensual
          ? String(socio.limite_retiro_mensual)
          : '',
      });
    } else {
      setForm({
        name: '',
        cuit: '',
        email: '',
        phone: '',
        ownership_percentage: '',
        fecha_ingreso: new Date().toISOString().split('T')[0],
        limite_retiro_mensual: '',
      });
    }
  }, [socio, open]);

  const handleSubmit = async () => {
    if (!form.name || !form.ownership_percentage) return;

    const payload: SocioFormData = {
      branch_id: branchId,
      name: form.name,
      cuit: form.cuit || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      ownership_percentage: parseFloat(form.ownership_percentage),
      fecha_ingreso: form.fecha_ingreso,
      limite_retiro_mensual: form.limite_retiro_mensual
        ? parseFloat(form.limite_retiro_mensual)
        : null,
    };

    if (isEdit) {
      await updateSocio.mutateAsync({ id: socio!.id, data: payload });
    } else {
      await createSocio.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Socio' : 'Nuevo Socio'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Nombre *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>CUIT</Label>
              <Input
                value={form.cuit}
                onChange={(e) => setForm({ ...form, cuit: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Teléfono</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Participación % *</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.ownership_percentage}
                onChange={(e) => setForm({ ...form, ownership_percentage: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Fecha Ingreso</Label>
              <Input
                type="date"
                value={form.fecha_ingreso}
                onChange={(e) => setForm({ ...form, fecha_ingreso: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Límite Retiro Mensual</Label>
              <Input
                type="number"
                min="0"
                value={form.limite_retiro_mensual}
                onChange={(e) => setForm({ ...form, limite_retiro_mensual: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !form.name ||
              !form.ownership_percentage ||
              createSocio.isPending ||
              updateSocio.isPending
            }
          >
            {isEdit ? 'Guardar' : 'Crear'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
