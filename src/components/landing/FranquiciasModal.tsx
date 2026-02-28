import { useState } from 'react';
import { Link } from 'react-router-dom';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Store, CheckCircle, ArrowRight } from 'lucide-react';
import { insertContactMessage } from '@/services/contactService';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';

interface FranquiciasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FranquiciasModal({ open, onOpenChange }: FranquiciasModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    hasExperience: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.phone || !formData.city) {
      toast.error('Completá todos los campos obligatorios');
      return;
    }

    setLoading(true);

    try {
      const { error } = await insertContactMessage({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: 'franquicia',
        message:
          formData.message ||
          `Ciudad: ${formData.city}. Experiencia en gastronomía: ${formData.hasExperience || 'No especificado'}`,
        franchise_has_zone: formData.city,
      });

      if (error) throw error;

      setSuccess(true);
      toast.success('¡Gracias por tu interés! Te contactaremos pronto.');
    } catch (err) {
      handleError(err, { userMessage: 'Error al enviar', context: 'FranquiciasModal.handleSubmit' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setFormData({ name: '', email: '', phone: '', city: '', hasExperience: '', message: '' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Franquicias Hoppiness</DialogTitle>
              <DialogDescription>Abrí tu propio Hoppiness Club</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">¡Mensaje enviado!</h3>
            <p className="text-muted-foreground text-sm">
              Nos pondremos en contacto contigo a la brevedad para brindarte toda la información.
            </p>
            <div className="flex flex-col gap-2 mt-6">
              <Link to="/franquicias">
                <Button className="w-full">
                  Ver más sobre franquicias
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Button variant="outline" onClick={handleClose}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">¿Por qué Hoppiness?</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>â€¢ Marca consolidada con 5+ sucursales</li>
                <li>â€¢ Sistema de gestión integral incluido</li>
                <li>â€¢ Acompañamiento continuo</li>
              </ul>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo *</Label>
                <Input
                  id="name"
                  placeholder="Tu nombre"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
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
                <Label htmlFor="city">Ciudad donde te gustaría abrir *</Label>
                <Input
                  id="city"
                  placeholder="Ej: Córdoba, Rosario, Buenos Aires..."
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">¿Tenés experiencia en gastronomía?</Label>
                <Select
                  value={formData.hasExperience}
                  onValueChange={(value) => setFormData({ ...formData, hasExperience: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná una opción" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="si">Sí, tengo experiencia</SelectItem>
                    <SelectItem value="no">No, pero quiero aprender</SelectItem>
                    <SelectItem value="parcial">Algo de experiencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensaje / Consultas (opcional)</Label>
                <Textarea
                  id="message"
                  placeholder="Contanos un poco sobre vos..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={3}
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
                'Enviar consulta'
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
