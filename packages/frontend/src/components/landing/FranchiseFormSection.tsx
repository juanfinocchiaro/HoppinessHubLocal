import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, CheckCircle, Rocket } from 'lucide-react';
import { insertContactMessage } from '@/services/contactService';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';

export function FranchiseFormSection() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    hasExperience: '',
    investmentRange: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim() ||
      !formData.city.trim()
    ) {
      toast.error('Completá todos los campos obligatorios');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Ingresá un email válido');
      return;
    }

    setLoading(true);

    try {
      const { error } = await insertContactMessage({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        subject: 'franquicia',
        message:
          formData.message.trim() || `Experiencia: ${formData.hasExperience || 'No especificado'}`,
        franchise_has_zone: formData.city.trim(),
        franchise_investment_capital: formData.investmentRange || null,
      });

      if (error) throw error;

      setSuccess(true);
      toast.success('¡Gracias por tu interés! Te contactaremos en menos de 24hs.');
    } catch (err) {
      handleError(err, { userMessage: 'Error al enviar', context: 'FranchiseFormSection.handleSubmit' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <section id="formulario-franquicia" className="py-20 px-4 bg-primary">
        <div className="container mx-auto max-w-2xl">
          <div className="bg-white rounded-2xl p-12 text-center shadow-elevated">
            <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-accent" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-primary">¡Mensaje enviado!</h3>
            <p className="text-muted-foreground">
              Un asesor se comunicará con vos en menos de 24 horas para brindarte toda la
              información sobre franquicias.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="formulario-franquicia" className="py-20 px-4 bg-primary">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center text-white mb-10">
          <h2 className="text-4xl font-black mb-4 font-brand">¿QUERÃ‰S TU PROPIA FRANQUICIA?</h2>
          <p className="text-xl text-white/90">
            Completá el formulario y un asesor se comunicará en menos de 24hs.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-8 shadow-elevated space-y-6"
        >
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="franchise-name">Nombre completo *</Label>
              <Input
                id="franchise-name"
                placeholder="Tu nombre"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="franchise-email">Email *</Label>
              <Input
                id="franchise-email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                maxLength={255}
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="franchise-phone">Teléfono (con código de área) *</Label>
              <Input
                id="franchise-phone"
                type="tel"
                placeholder="+54 351..."
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                maxLength={50}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="franchise-city">Ciudad donde te gustaría abrir *</Label>
              <Input
                id="franchise-city"
                placeholder="Ej: Córdoba, Rosario..."
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                maxLength={100}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>¿Tenés experiencia en gastronomía?</Label>
            <Select
              value={formData.hasExperience}
              onValueChange={(value) => setFormData({ ...formData, hasExperience: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná una opción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="si">Sí, tengo experiencia</SelectItem>
                <SelectItem value="un_poco">Un poco de experiencia</SelectItem>
                <SelectItem value="no">No, pero quiero aprender</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Inversión disponible aproximada</Label>
            <RadioGroup
              value={formData.investmentRange}
              onValueChange={(value) => setFormData({ ...formData, investmentRange: value })}
              className="grid grid-cols-2 gap-3"
            >
              <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-secondary/50">
                <RadioGroupItem value="menos_40k" id="inv1" />
                <Label htmlFor="inv1" className="cursor-pointer text-sm">
                  Menos de USD 40.000
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-secondary/50">
                <RadioGroupItem value="40k_60k" id="inv2" />
                <Label htmlFor="inv2" className="cursor-pointer text-sm">
                  USD 40.000 - 60.000
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-secondary/50">
                <RadioGroupItem value="60k_80k" id="inv3" />
                <Label htmlFor="inv3" className="cursor-pointer text-sm">
                  USD 60.000 - 80.000
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-secondary/50">
                <RadioGroupItem value="mas_80k" id="inv4" />
                <Label htmlFor="inv4" className="cursor-pointer text-sm">
                  Más de USD 80.000
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="franchise-message">Mensaje adicional (opcional)</Label>
            <Textarea
              id="franchise-message"
              placeholder="Contanos un poco sobre vos y tu proyecto..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              maxLength={1000}
              rows={3}
            />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Rocket className="h-5 w-5 mr-2" />
                Enviar consulta
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Al enviar este formulario aceptás que nos comuniquemos con vos para brindarte
            información sobre franquicias.
          </p>
        </form>
      </div>
    </section>
  );
}
