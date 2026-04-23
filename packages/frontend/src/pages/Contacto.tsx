import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';
import {
  submitContactMessage,
  sendContactNotification,
  uploadCV,
} from '@/services/contactService';
import { fetchPublicBranchNames } from '@/services/publicBranchService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Send,
  CalendarIcon,
  MessageCircle,
  Store,
  Users,
  ShoppingBag,
  Handshake,
  Upload,
  FileText,
  Loader2,
} from 'lucide-react';
import { SEO } from '@/components/SEO';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { cn } from '@/lib/utils';
import ImpersonationBanner from '@/components/admin/ImpersonationBanner';

type SubjectType = 'consulta' | 'franquicia' | 'empleo' | 'pedidos' | 'proveedor';
type BranchPublicStatus = 'active' | 'coming_soon' | 'hidden';

interface FormData {
  name: string;
  email: string;
  phone: string;
  subject: SubjectType | '';
  message: string;
  // Franchise fields
  franchise_has_zone: string;
  franchise_has_location: string;
  franchise_investment_capital: string;
  // Employment fields
  employment_branch_id: string;
  employment_position: string;
  employment_cv_link: string;
  employment_motivation: string;
  // Order issue fields
  order_branch_id: string;
  order_number: string;
  order_date: Date | undefined;
  order_issue: string;
  // Supplier fields
  supplier_company: string;
  supplier_category: string;
  supplier_coverage: string;
  supplier_website: string;
}

const initialFormData: FormData = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
  franchise_has_zone: '',
  franchise_has_location: '',
  franchise_investment_capital: '',
  employment_branch_id: '',
  employment_position: '',
  employment_cv_link: '',
  employment_motivation: '',
  order_branch_id: '',
  order_number: '',
  order_date: undefined,
  order_issue: '',
  supplier_company: '',
  supplier_category: '',
  supplier_coverage: '',
  supplier_website: '',
};

const subjectOptions = [
  {
    value: 'consulta' as SubjectType,
    label: 'Consulta general',
    icon: MessageCircle,
    description: 'Preguntas, sugerencias o comentarios',
  },
  {
    value: 'franquicia' as SubjectType,
    label: 'Franquicias',
    icon: Store,
    description: 'Quiero abrir mi propio Hoppiness',
  },
  {
    value: 'empleo' as SubjectType,
    label: 'Trabajá con nosotros',
    icon: Users,
    description: 'Quiero ser parte del equipo',
  },
  {
    value: 'pedidos' as SubjectType,
    label: 'Problema con pedido',
    icon: ShoppingBag,
    description: 'Reportar un inconveniente',
  },
  {
    value: 'proveedor' as SubjectType,
    label: 'Proveedores',
    icon: Handshake,
    description: 'Quiero ser proveedor',
  },
];

export default function Contacto() {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);

  // Fetch branches for dropdowns
  const { data: branches } = useQuery({
    queryKey: ['branches-public'],
    queryFn: () =>
      fetchPublicBranchNames() as Promise<
        { id: string; name: string; public_status: BranchPublicStatus }[]
      >,
  });

  // Detect URL params
  useEffect(() => {
    const asuntoParam = searchParams.get('asunto');
    if (
      asuntoParam &&
      ['consulta', 'franquicia', 'empleo', 'pedidos', 'proveedor'].includes(asuntoParam)
    ) {
      setFormData((prev) => ({ ...prev, subject: asuntoParam as SubjectType }));
      setOpenAccordion(asuntoParam);
    }
  }, [searchParams]);

  const franchiseZoneOptions = [
    { value: 'tengo_ubicacion', label: 'Sí, ya tengo ubicación' },
    { value: 'algunas_opciones', label: 'Tengo algunas opciones' },
    { value: 'buscando', label: 'No, estoy buscando' },
    { value: 'asesoren', label: 'Prefiero que me asesoren' },
  ];

  const franchiseLocationOptions = [
    { value: 'local_propio', label: 'Sí, tengo local propio' },
    { value: 'local_alquilado', label: 'Sí, tengo local alquilado' },
    { value: 'buscando', label: 'No, pero estoy buscando' },
    { value: 'necesito_ayuda', label: 'No, necesito ayuda para encontrar' },
  ];

  const franchiseCapitalOptions = [
    { value: 'menos_30k', label: 'Menos de $30.000 USD' },
    { value: '30k_50k', label: '$30.000 - $50.000 USD' },
    { value: '50k_80k', label: '$50.000 - $80.000 USD' },
    { value: 'mas_80k', label: 'Más de $80.000 USD' },
    { value: 'no_decir', label: 'Prefiero no decir' },
  ];

  const employmentPositionOptions = [
    { value: 'cocina', label: 'Cocina' },
    { value: 'caja', label: 'Caja / Atención' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'encargado', label: 'Encargado' },
    { value: 'otro', label: 'Otro' },
  ];

  const getSuccessMessage = (subject: SubjectType) => {
    switch (subject) {
      case 'franquicia':
        return {
          title: '¡Excelente decisión!',
          description:
            'Un asesor comercial te contactará en menos de 48 horas para coordinar una reunión.',
        };
      case 'empleo':
        return {
          title: '¡Gracias por querer ser parte del equipo!',
          description:
            'Revisaremos tu postulación y te contactaremos si hay una vacante que coincida con tu perfil.',
        };
      case 'pedidos':
        return {
          title: 'Lamentamos el inconveniente',
          description:
            'Nuestro equipo revisará tu caso y te contactará a la brevedad para solucionarlo.',
        };
      case 'proveedor':
        return {
          title: '¡Propuesta recibida!',
          description:
            'Nuestro equipo de compras evaluará tu propuesta y te contactará si hay interés.',
        };
      default:
        return {
          title: '¡Mensaje enviado!',
          description: 'Te responderemos en menos de 24 horas.',
        };
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!validTypes.includes(file.type)) {
        toast.error('Formato no válido â€” Solo se permiten archivos PDF, DOC o DOCX');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Archivo muy grande â€” El archivo no puede superar 5MB');
        return;
      }
      setCvFile(file);
    }
  };

  const handleAccordionChange = (value: string | undefined) => {
    setOpenAccordion(value);
    if (value) {
      setFormData((prev) => ({
        ...initialFormData,
        name: prev.name,
        email: prev.email,
        phone: prev.phone,
        subject: value as SubjectType,
      }));
    } else {
      setFormData((prev) => ({
        ...initialFormData,
        name: prev.name,
        email: prev.email,
        phone: prev.phone,
      }));
    }
    setCvFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject) {
      toast.error('Seleccioná un tipo de consulta');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Ingresá un email válido');
      return;
    }

    const phoneClean = formData.phone.replace(/[\s\-()]/g, '');
    if (phoneClean.length < 8) {
      toast.error('Ingresá un teléfono válido');
      return;
    }

    setLoading(true);

    try {
      let cvUrl = '';

      if (cvFile && formData.subject === 'empleo') {
        try {
          cvUrl = await uploadCV(cvFile, formData.email);
        } catch (error) {
      handleError(error, { userMessage: 'Error al subir el CV. Intentá de nuevo.', context: 'Contacto' });
          setLoading(false);
          return;
        }
      }

      const insertData: Record<string, unknown> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
      };

      // Add subject-specific fields
      switch (formData.subject) {
        case 'consulta':
          insertData.message = formData.message;
          break;
        case 'franquicia':
          insertData.franchise_has_zone = formData.franchise_has_zone || null;
          insertData.franchise_has_location = formData.franchise_has_location || null;
          insertData.franchise_investment_capital = formData.franchise_investment_capital || null;
          insertData.message = formData.message || null;
          break;
        case 'empleo':
          insertData.employment_branch_id = formData.employment_branch_id || null;
          insertData.employment_position = formData.employment_position || null;
          insertData.employment_cv_link = cvUrl || formData.employment_cv_link || null;
          insertData.employment_motivation = formData.employment_motivation || null;
          break;
        case 'pedidos':
          insertData.order_branch_id = formData.order_branch_id || null;
          insertData.order_number = formData.order_number || null;
          insertData.order_date = formData.order_date
            ? format(formData.order_date, 'yyyy-MM-dd')
            : null;
          insertData.order_issue = formData.order_issue;
          break;
        case 'proveedor':
          insertData.message = `
Empresa: ${formData.supplier_company}
Rubro: ${formData.supplier_category}
Zona de cobertura: ${formData.supplier_coverage || 'No especificada'}
Web: ${formData.supplier_website || 'No especificada'}

Mensaje:
${formData.message || 'Sin mensaje adicional'}
          `.trim();
          break;
      }

      const { data, error } = await submitContactMessage(insertData);

      if (error) throw error;

      try {
        await sendContactNotification(data);
      } catch (emailErr) {
        console.warn('Email notification failed:', emailErr);
      }

      const successMsg = getSuccessMessage(formData.subject);
      toast.success(successMsg.title, { description: successMsg.description });

      setSubmitted(true);
    } catch (error) {
      handleError(error, { userMessage: 'Error', context: 'Contacto' });
    } finally {
      setLoading(false);
    }
  };

  // Render form fields based on subject
  const renderFormFields = (subject: SubjectType) => {
    return (
      <form onSubmit={handleSubmit} className="space-y-5 pt-4">
        {/* Base fields */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`name-${subject}`}>Nombre *</Label>
            <Input
              id={`name-${subject}`}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Tu nombre"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`email-${subject}`}>Email *</Label>
            <Input
              id={`email-${subject}`}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="tu@email.com"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`phone-${subject}`}>Teléfono *</Label>
          <Input
            id={`phone-${subject}`}
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+54 351..."
            required
          />
        </div>

        {/* Conditional fields based on subject */}
        {subject === 'consulta' && (
          <div className="space-y-2">
            <Label htmlFor="message">Mensaje *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Contanos en qué podemos ayudarte..."
              rows={5}
              required
            />
          </div>
        )}

        {subject === 'franquicia' && (
          <>
            <div className="space-y-2">
              <Label>¿Ya tenés una zona en mente?</Label>
              <Select
                value={formData.franchise_has_zone}
                onValueChange={(value) => setFormData({ ...formData, franchise_has_zone: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná una opción" />
                </SelectTrigger>
                <SelectContent>
                  {franchiseZoneOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>¿Tenés local disponible?</Label>
              <Select
                value={formData.franchise_has_location}
                onValueChange={(value) =>
                  setFormData({ ...formData, franchise_has_location: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná una opción" />
                </SelectTrigger>
                <SelectContent>
                  {franchiseLocationOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>¿Cuál es tu capital disponible para invertir?</Label>
              <Select
                value={formData.franchise_investment_capital}
                onValueChange={(value) =>
                  setFormData({ ...formData, franchise_investment_capital: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná una opción" />
                </SelectTrigger>
                <SelectContent>
                  {franchiseCapitalOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message-franchise">Comentarios adicionales (opcional)</Label>
              <Textarea
                id="message-franchise"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="¿Algo más que quieras contarnos?"
                rows={3}
              />
            </div>
          </>
        )}

        {subject === 'empleo' && (
          <>
            <div className="space-y-2">
              <Label>¿En qué local te gustaría trabajar? *</Label>
              <Select
                value={formData.employment_branch_id}
                onValueChange={(value) => setFormData({ ...formData, employment_branch_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná un local" />
                </SelectTrigger>
                <SelectContent>
                  {branches?.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      Hoppiness {branch.name}
                      {branch.public_status === 'coming_soon' ? ' (PRÃ“XIMAMENTE)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>¿Qué puesto te interesa?</Label>
              <Select
                value={formData.employment_position}
                onValueChange={(value) => setFormData({ ...formData, employment_position: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná un puesto" />
                </SelectTrigger>
                <SelectContent>
                  {employmentPositionOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Adjuntar CV * (PDF, DOC, DOCX - máx 5MB)</Label>
              <Input
                id={`cv-${subject}`}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => document.getElementById(`cv-${subject}`)?.click()}
              >
                {cvFile ? (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    {cvFile.name}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Seleccionar archivo
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn (opcional)</Label>
              <Input
                id="linkedin"
                type="url"
                value={formData.employment_cv_link}
                onChange={(e) => setFormData({ ...formData, employment_cv_link: e.target.value })}
                placeholder="https://linkedin.com/in/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivation">¿Por qué querés trabajar en Hoppiness?</Label>
              <Textarea
                id="motivation"
                value={formData.employment_motivation}
                onChange={(e) =>
                  setFormData({ ...formData, employment_motivation: e.target.value })
                }
                placeholder="Contanos un poco sobre vos..."
                rows={3}
              />
            </div>
          </>
        )}

        {subject === 'pedidos' && (
          <>
            <div className="space-y-2">
              <Label>¿En qué local hiciste el pedido?</Label>
              <Select
                value={formData.order_branch_id}
                onValueChange={(value) => setFormData({ ...formData, order_branch_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná un local" />
                </SelectTrigger>
                <SelectContent>
                  {branches?.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      Hoppiness {branch.name}
                      {branch.public_status === 'coming_soon' ? ' (PRÃ“XIMAMENTE)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Número de pedido</Label>
                <Input
                  id="orderNumber"
                  value={formData.order_number}
                  onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                  placeholder="#12345"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha del pedido</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !formData.order_date && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.order_date ? (
                        format(formData.order_date, 'PPP', { locale: es })
                      ) : (
                        <span>Seleccioná fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.order_date}
                      onSelect={(date) => setFormData({ ...formData, order_date: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderIssue">¿Cuál fue el problema? *</Label>
              <Textarea
                id="orderIssue"
                value={formData.order_issue}
                onChange={(e) => setFormData({ ...formData, order_issue: e.target.value })}
                placeholder="Describí el inconveniente lo más detallado posible..."
                rows={4}
                required
              />
            </div>
          </>
        )}

        {subject === 'proveedor' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="company">Nombre de la empresa *</Label>
              <Input
                id="company"
                value={formData.supplier_company}
                onChange={(e) => setFormData({ ...formData, supplier_company: e.target.value })}
                placeholder="Tu empresa"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Rubro / Productos que ofrecen *</Label>
              <Input
                id="category"
                value={formData.supplier_category}
                onChange={(e) => setFormData({ ...formData, supplier_category: e.target.value })}
                placeholder="Ej: Carnes, Bebidas, Insumos..."
                required
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coverage">Zona de cobertura</Label>
                <Input
                  id="coverage"
                  value={formData.supplier_coverage}
                  onChange={(e) => setFormData({ ...formData, supplier_coverage: e.target.value })}
                  placeholder="Ej: Córdoba Capital"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Sitio web</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.supplier_website}
                  onChange={(e) => setFormData({ ...formData, supplier_website: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proposal">Propuesta comercial</Label>
              <Textarea
                id="proposal"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Contanos sobre tu empresa, productos, precios..."
                rows={4}
              />
            </div>
          </>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Enviar mensaje
            </>
          )}
        </Button>
      </form>
    );
  };

  if (submitted) {
    const successMsg = getSuccessMessage(formData.subject as SubjectType);
    return (
      <div className="min-h-screen bg-background">
        <SEO
          title="Contacto"
          description="Contactanos para consultas, franquicias, empleo, proveedores o problemas con pedidos. Te respondemos en menos de 24 horas."
          path="/contacto"
        />
        <ImpersonationBanner />

        <section className="py-20 px-4">
          <div className="container mx-auto max-w-lg text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Send className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-black mb-4 font-brand text-primary">{successMsg.title}</h1>
            <p className="text-lg text-muted-foreground mb-8">{successMsg.description}</p>
            <Button
              onClick={() => {
                setFormData(initialFormData);
                setCvFile(null);
                setSubmitted(false);
                setOpenAccordion(undefined);
              }}
            >
              Enviar otro mensaje
            </Button>
          </div>
        </section>

        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Contacto"
        description="Contactanos para consultas, franquicias, empleo, proveedores o problemas con pedidos. Te respondemos en menos de 24 horas."
        path="/contacto"
      />
      <ImpersonationBanner />

      {/* Hero */}
      <section className="py-16 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-black text-primary-foreground mb-4 font-brand">
            CONTACTANOS
          </h1>
          <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
            Estamos para ayudarte. Escribinos y te respondemos lo antes posible.
          </p>
        </div>
      </section>

      {/* Main Content - Title left, Accordion right */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-[300px_1fr] gap-12 items-start">
            {/* Title Column */}
            <div className="lg:sticky lg:top-8">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                ¿Sobre qué querés contactarnos?
              </h2>
              <p className="text-muted-foreground">
                Seleccioná una opción y completá el formulario correspondiente.
              </p>
            </div>

            {/* Accordion Column */}
            <div>
              <Card className="shadow-elevated">
                <CardContent className="p-6">
                  <Accordion
                    type="single"
                    collapsible
                    value={openAccordion}
                    onValueChange={handleAccordionChange}
                  >
                    {subjectOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <AccordionItem
                          key={option.value}
                          value={option.value}
                          className="border-b last:border-0"
                        >
                          <AccordionTrigger className="hover:no-underline py-4">
                            <div className="flex items-center gap-4">
                              <div
                                className={cn(
                                  'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                                  openAccordion === option.value
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground',
                                )}
                              >
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="text-left">
                                <p
                                  className={cn(
                                    'font-semibold',
                                    openAccordion === option.value
                                      ? 'text-primary'
                                      : 'text-foreground',
                                  )}
                                >
                                  {option.label}
                                </p>
                                <p className="text-sm text-muted-foreground font-normal">
                                  {option.description}
                                </p>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-6">
                            {renderFormFields(option.value)}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
