/**
 * DireccionesSheet — Inline address manager within the store
 */
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listAddresses,
  saveAddress,
  deleteAddress,
  type ClienteAddress,
} from '@/services/addressService';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, Plus, Pencil, Trash2, Star, ArrowLeft } from 'lucide-react';
import { SpinnerLoader, DotsLoader } from '@/components/ui/loaders';
import { toast } from 'sonner';

type Direccion = ClienteAddress;

const ETIQUETAS = ['Casa', 'Trabajo', 'Otro'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DireccionesSheet({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [etiqueta, setEtiqueta] = useState('Casa');
  const [direccion, setDireccion] = useState('');
  const [piso, setPiso] = useState('');
  const [referencia, setReferencia] = useState('');
  const [ciudad, setCiudad] = useState('Córdoba');

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['my-addresses-sheet', user?.id],
    queryFn: () => listAddresses(user!.id),
    enabled: !!user && open,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await saveAddress(
        user!.id,
        {
          etiqueta,
          direccion: direccion.trim(),
          piso: piso.trim() || null,
          referencia: referencia.trim() || null,
          ciudad: ciudad.trim() || 'Córdoba',
        },
        editId,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-addresses-sheet'] });
      qc.invalidateQueries({ queryKey: ['my-addresses'] });
      toast.success(editId ? 'Dirección actualizada' : 'Dirección guardada');
      closeForm();
    },
    onError: () => toast.error('Error al guardar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAddress(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-addresses-sheet'] });
      qc.invalidateQueries({ queryKey: ['my-addresses'] });
      toast.success('Dirección eliminada');
    },
  });

  function openNew() {
    setEditId(null);
    setEtiqueta('Casa');
    setDireccion('');
    setPiso('');
    setReferencia('');
    setCiudad('Córdoba');
    setShowForm(true);
  }

  function openEdit(addr: Direccion) {
    setEditId(addr.id);
    setEtiqueta(addr.etiqueta);
    setDireccion(addr.direccion);
    setPiso(addr.piso || '');
    setReferencia(addr.referencia || '');
    setCiudad(addr.ciudad || 'Córdoba');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) closeForm();
        onOpenChange(v);
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {showForm && (
              <button
                onClick={closeForm}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {showForm ? (editId ? 'Editar dirección' : 'Nueva dirección') : 'Mis Direcciones'}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <SpinnerLoader size="sm" text="Cargando direcciones..." />
          </div>
        ) : showForm ? (
          /* Form view */
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label>Etiqueta</Label>
              <Select value={etiqueta} onValueChange={setEtiqueta}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ETIQUETAS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dirección *</Label>
              <Input
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Av. Colón 1234"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Piso / Depto</Label>
                <Input value={piso} onChange={(e) => setPiso(e.target.value)} placeholder="2B" />
              </div>
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Input
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  placeholder="Córdoba"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Referencia</Label>
              <Input
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Frente a la plaza"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={closeForm}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={() => saveMutation.mutate()}
                disabled={!direccion.trim() || saveMutation.isPending}
              >
                {saveMutation.isPending && (
                  <span className="mr-2 inline-flex">
                    <DotsLoader />
                  </span>
                )}
                {editId ? 'Guardar' : 'Agregar'}
              </Button>
            </div>
          </div>
        ) : (
          /* List view */
          <div className="space-y-3 mt-6">
            {addresses.length === 0 && (
              <div className="py-12 text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-lg font-medium">Sin direcciones guardadas</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Guardá tus direcciones para hacer pedidos más rápido.
                </p>
              </div>
            )}

            {addresses.map((addr) => (
              <div
                key={addr.id}
                className={`flex items-start justify-between gap-3 p-3 rounded-xl border ${addr.es_principal ? 'border-primary/50 bg-primary/5' : ''}`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm">{addr.etiqueta}</span>
                      {addr.es_principal && (
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{addr.direccion}</p>
                    {addr.piso && (
                      <p className="text-[11px] text-muted-foreground">Piso: {addr.piso}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEdit(addr)}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => deleteMutation.mutate(addr.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}

            <Button
              onClick={openNew}
              className="w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Plus className="w-4 h-4" />
              Agregar dirección
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
