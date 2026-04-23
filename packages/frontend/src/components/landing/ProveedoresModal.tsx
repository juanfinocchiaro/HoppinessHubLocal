import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Handshake, CheckCircle } from 'lucide-react';
import { insertContactMessage } from '@/services/contactService';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';

interface ProveedoresModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProveedoresModal({ open, onOpenChange }: ProveedoresModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    category: '',
    coverageArea: '',
    website: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.companyName ||
      !formData.contactName ||
      !formData.email ||
      !formData.phone ||
      !formData.category
    ) {
      toast.error('Completá todos los campos obligatorios');
      return;
    }

    setLoading(true);

    try {
      // Save to contact_messages table (reusing existing infrastructure)
      const { error } = await insertContactMessage({
        name: `${formData.companyName} - ${formData.contactName}`,
        email: formData.email,
        phone: formData.phone,
        subject: 'proveedor',
        message: `
Empresa: ${formData.companyName}
Contacto: ${formData.contactName}
Rubro: ${formData.category}
Zona de cobertura: ${formData.coverageArea || 'No especificada'}
Web: ${formData.website || 'No especificada'}

Mensaje:
${formData.message || 'Sin mensaje adicional'}
        `.trim(),
      });

      if (error) throw error;

      setSuccess(true);
      toast.success('¡Gracias por contactarnos! Evaluaremos tu propuesta.');
    } catch (err) {
      handleError(err, { userMessage: 'Error al enviar', context: 'ProveedoresModal.handleSubmit' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setFormData({
      companyName: '',
      contactName: '',
      email: '',
      phone: '',
      category: '',
      coverageArea: '',
      website: '',
      message: '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Handshake className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Proveedores</DialogTitle>
              <DialogDescription>¿Querés ser proveedor de Hoppiness?</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">¡Propuesta recibida!</h3>
            <p className="text-muted-foreground text-sm">
              Nuestro equipo de compras evaluará tu propuesta y se pondrá en contacto si hay
              interés.
            </p>
            <Button variant="outline" onClick={handleClose} className="mt-4">
              Cerrar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nombre de la empresa *</Label>
                <Input
                  id="companyName"
                  placeholder="Tu empresa"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactName">Nombre del contacto *</Label>
                <Input
                  id="contactName"
                  placeholder="Tu nombre"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contacto@empresa.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+54 351..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Rubro / ¿Qué productos o servicios ofrecen? *</Label>
                <Input
                  id="category"
                  placeholder="Ej: Carnes, Bebidas, Insumos de limpieza..."
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coverageArea">Zona de cobertura</Label>
                <Input
                  id="coverageArea"
                  placeholder="Ej: Córdoba Capital, Gran Córdoba, Nacional..."
                  value={formData.coverageArea}
                  onChange={(e) => setFormData({ ...formData, coverageArea: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Sitio web (opcional)</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://..."
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensaje / Propuesta comercial</Label>
                <Textarea
                  id="message"
                  placeholder="Contanos sobre tu empresa, productos, precios, etc."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar propuesta'
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
