import { useState } from 'react';
import { createBranch } from '@/services/adminService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

interface NewBranchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function NewBranchModal({ open, onOpenChange, onCreated }: NewBranchModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !address.trim()) {
      toast.error('Nombre y dirección son obligatorios');
      return;
    }

    setSaving(true);
    const slug = generateSlug(name);

    try {
      await createBranch({
        name: name.trim(),
        address: address.trim(),
        city: city.trim() || null,
        slug,
        is_active: true,
      });
    } catch (error: any) {
      if (error?.code === '23505') {
        toast.error('Ya existe una sucursal con ese nombre');
      } else {
        toast.error('Error al crear la sucursal');
      }
      setSaving(false);
      return;
    }

    toast.success('Sucursal creada. Hacé click en ella para completar los datos.');
    setName('');
    setAddress('');
    setCity('');
    setSaving(false);
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Sucursal</DialogTitle>
          <DialogDescription>Creá una nueva sucursal con los datos básicos</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la sucursal *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: General Paz"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección *</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ej: Av. Colón 1234"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Ciudad / Zona</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ej: Córdoba"
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <p>
              Después de crear, hacé click en la sucursal para completar: horarios, equipo, datos
              fiscales.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Creando...' : 'Crear Sucursal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
