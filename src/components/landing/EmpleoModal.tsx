import { useState, useEffect } from 'react';
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
import { Loader2, Users, CheckCircle, Upload, FileText } from 'lucide-react';
import { insertContactMessage, uploadCV } from '@/services/contactService';
import { fetchPublicBranchIdAndName } from '@/services/publicBranchService';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';

interface EmpleoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Branch {
  id: string;
  name: string;
}

export function EmpleoModal({ open, onOpenChange }: EmpleoModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    branchId: '',
    position: '',
    linkedinUrl: '',
    motivation: '',
  });

  useEffect(() => {
    const loadBranches = async () => {
      const data = await fetchPublicBranchIdAndName();
      setBranches(data);
    };

    if (open) loadBranches();
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!validTypes.includes(file.type)) {
        toast.error('Solo se permiten archivos PDF, DOC o DOCX');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('El archivo no puede superar 5MB');
        return;
      }
      setCvFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.phone || !formData.branchId) {
      toast.error('Completá todos los campos obligatorios');
      return;
    }

    if (!cvFile) {
      toast.error('Es necesario adjuntar tu CV');
      return;
    }

    setLoading(true);

    try {
      let cvUrl = '';
      try {
        cvUrl = await uploadCV(cvFile, formData.email);
      } catch (uploadError) {
        if (import.meta.env.DEV) console.error('Upload error:', uploadError);
      }

      const { error } = await insertContactMessage({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: 'empleo',
        message: formData.motivation || 'Sin mensaje adicional',
        employment_branch_id: formData.branchId,
        employment_position: formData.position,
        employment_cv_link: cvUrl || '',
        employment_motivation: formData.motivation,
      });

      if (error) throw error;

      setSuccess(true);
      toast.success('¡Postulación enviada! Te contactaremos pronto.');
    } catch (err) {
      handleError(err, { userMessage: 'Error al enviar', context: 'EmpleoModal.handleSubmit' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setCvFile(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      branchId: '',
      position: '',
      linkedinUrl: '',
      motivation: '',
    });
    onOpenChange(false);
  };

  const positions = [
    { value: 'cocina', label: 'Cocina' },
    { value: 'caja', label: 'Caja' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'limpieza', label: 'Limpieza' },
    { value: 'encargado', label: 'Encargado' },
    { value: 'otro', label: 'Otro' },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Trabajá con nosotros</DialogTitle>
              <DialogDescription>Sumate al equipo Hoppiness</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">¡Postulación enviada!</h3>
            <p className="text-muted-foreground text-sm">
              Gracias por tu interés en ser parte del equipo Hoppiness.
              <br />
              Te contactaremos a la brevedad.
            </p>
            <Button variant="outline" onClick={handleClose} className="mt-4">
              Cerrar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label htmlFor="branch">¿En qué local te gustaría trabajar? *</Label>
                <Select
                  value={formData.branchId}
                  onValueChange={(value) => setFormData({ ...formData, branchId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná un local" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        Hoppiness {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">¿Qué puesto te interesa?</Label>
                <Select
                  value={formData.position}
                  onValueChange={(value) => setFormData({ ...formData, position: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná un puesto" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((pos) => (
                      <SelectItem key={pos.value} value={pos.value}>
                        {pos.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cv">Adjuntar CV * (PDF, DOC, DOCX - máx 5MB)</Label>
                <div className="relative">
                  <Input
                    id="cv"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => document.getElementById('cv')?.click()}
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn (opcional)</Label>
                <Input
                  id="linkedin"
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivation">¿Por qué querés trabajar en Hoppiness?</Label>
                <Textarea
                  id="motivation"
                  placeholder="Contanos un poco sobre vos y por qué te gustaría ser parte del equipo..."
                  value={formData.motivation}
                  onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
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
                'Enviar postulación'
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
