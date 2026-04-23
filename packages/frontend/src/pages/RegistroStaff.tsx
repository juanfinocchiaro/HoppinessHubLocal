import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { signUpWithInvitation } from '@/services/authService';
import { updateStaffProfile } from '@/services/profileService';
import {
  acceptInvitation,
  uploadStaffDocument,
  upsertBranchRole,
} from '@/services/staffService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { handleError, devWarn } from '@/lib/errorHandler';
import {
  Loader2,
  User,
  Phone,
  CreditCard,
  Upload,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { SpinnerLoader } from '@/components/ui/loaders';

interface InvitationData {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  branch_id: string;
  branch_name: string;
  status: string;
  expires_at: string;
}

const roleLabels: Record<string, string> = {
  encargado: 'Encargado',
  cajero: 'Cajero',
  empleado: 'Empleado',
};

export default function RegistroStaff() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    password: '',
    confirmPassword: '',
    phone: '',
    dni: '',
    address: '',
    birth_date: '',
    cuit: '',
    cbu: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  const [dniFront, setDniFront] = useState<File | null>(null);
  const [dniBack, setDniBack] = useState<File | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    async function verifyInvitation() {
      if (!token) {
        setError('Token de invitación no proporcionado');
        setLoading(false);
        return;
      }

      try {
        const { validateInvitationToken } = await import('@/services/staffService');
        const { data, error: fetchError } = await validateInvitationToken(token);

        if (fetchError || !data || data.length === 0) {
          setError('Invitación no encontrada o inválida');
          setLoading(false);
          return;
        }

        const invitationData = data[0];

        // Check if expired
        if (new Date(invitationData.expires_at) < new Date()) {
          setError('Esta invitación ha expirado');
          setLoading(false);
          return;
        }

        // Check if already used
        if (invitationData.status !== 'pending') {
          setError('Esta invitación ya fue utilizada');
          setLoading(false);
          return;
        }

        setInvitation(invitationData);
      } catch {
        setError('Error al verificar la invitación');
      } finally {
        setLoading(false);
      }
    }

    verifyInvitation();
  }, [token]);

  const handleFileChange = (type: 'front' | 'back', file: File | null) => {
    if (type === 'front') {
      setDniFront(file);
    } else {
      setDniBack(file);
    }
  };

  const uploadFile = async (file: File, userId: string, type: 'front' | 'back') => {
    return uploadStaffDocument(file, userId, type);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitation) return;

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!acceptedTerms) {
      toast.error('Debés aceptar los términos y condiciones');
      return;
    }

    if (!dniFront || !dniBack) {
      toast.error('Debés subir las fotos del DNI (frente y dorso)');
      return;
    }

    setSubmitting(true);

    try {
      const { data: authData, error: signUpError } = await signUpWithInvitation(
        invitation.email,
        formData.password,
        formData.full_name,
        token!,
      );

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          toast.error('Este email ya está registrado. Intentá iniciar sesión.');
        } else {
          throw signUpError;
        }
        return;
      }

      if (!authData.user) {
        throw new Error('Error al crear usuario');
      }

      const userId = authData.user.id;

      // 2. Upload DNI photos
      let dniFrontUrl = '';
      let dniBackUrl = '';

      try {
        dniFrontUrl = await uploadFile(dniFront, userId, 'front');
        dniBackUrl = await uploadFile(dniBack, userId, 'back');
      } catch (uploadError) {
        devWarn('Error uploading files:', uploadError);
        // Continue anyway, files can be uploaded later
      }

      const { error: profileError } = await updateStaffProfile(userId, {
        full_name: formData.full_name,
        phone: formData.phone,
        dni: formData.dni,
        address: formData.address,
        birth_date: formData.birth_date || null,
        cuit: formData.cuit,
        cbu: formData.cbu,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        dni_front_url: dniFrontUrl,
        dni_back_url: dniBackUrl,
        accepted_terms_at: new Date().toISOString(),
        invitation_token: token,
      });

      if (profileError) {
        devWarn('Profile update error:', profileError);
      }

      // 4. Assign role
      const localRoleMap: Record<
        string,
        'encargado' | 'cajero' | 'empleado' | 'contador_local' | 'franquiciado'
      > = {
        encargado: 'encargado',
        cajero: 'cajero',
        kds: 'empleado',
        empleado: 'empleado',
      };

      const localRole = localRoleMap[invitation.role] || 'empleado';

      const { error: branchRoleError } = await upsertBranchRole(userId, invitation.branch_id, localRole);
      if (branchRoleError) devWarn('Branch role error:', branchRoleError);


      await acceptInvitation(invitation.id, userId);

      toast.success('¡Registro completado! Revisá tu email para confirmar la cuenta.');
      navigate('/ingresar?registered=true');
    } catch (error: any) {
      handleError(error, {
        userMessage: error.message || 'Error al completar el registro',
        context: 'RegistroStaff.handleSubmit',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <SpinnerLoader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Invitación Inválida</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => navigate('/')}>Volver al inicio</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-primary/10 p-4 rounded-full">
                <User className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Completá tu Registro</CardTitle>
            <CardDescription>
              Te invitaron a unirte al equipo de{' '}
              <span className="font-semibold text-foreground">{invitation?.branch_name}</span> como{' '}
              <Badge variant="secondary">
                {roleLabels[invitation?.role || ''] || invitation?.role}
              </Badge>
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Account Info */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Datos de Cuenta
                </h3>

                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={invitation?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Contraseña *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, password: e.target.value }))
                      }
                      required
                      minLength={6}
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Personal Info */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Datos Personales
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="full_name">Nombre Completo *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, full_name: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="dni">DNI *</Label>
                    <Input
                      id="dni"
                      value={formData.dni}
                      onChange={(e) => setFormData((prev) => ({ ...prev, dni: e.target.value }))}
                      required
                      placeholder="12345678"
                    />
                  </div>

                  <div>
                    <Label htmlFor="birth_date">Fecha de Nacimiento *</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, birth_date: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Teléfono *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                      required
                      placeholder="+54 11 1234-5678"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cuit">CUIL/CUIT *</Label>
                    <Input
                      id="cuit"
                      value={formData.cuit}
                      onChange={(e) => setFormData((prev) => ({ ...prev, cuit: e.target.value }))}
                      required
                      placeholder="20-12345678-9"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="address">Dirección Completa *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, address: e.target.value }))
                      }
                      required
                      placeholder="Calle 123, Ciudad, Provincia"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Financial Info */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Datos Bancarios
                </h3>

                <div>
                  <Label htmlFor="cbu">CBU/Alias (para cobrar tu sueldo) *</Label>
                  <Input
                    id="cbu"
                    value={formData.cbu}
                    onChange={(e) => setFormData((prev) => ({ ...prev, cbu: e.target.value }))}
                    required
                    placeholder="CBU o Alias de MercadoPago/Banco"
                  />
                </div>
              </div>

              <Separator />

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contacto de Emergencia
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="emergency_contact_name">Nombre *</Label>
                    <Input
                      id="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, emergency_contact_name: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="emergency_contact_phone">Teléfono *</Label>
                    <Input
                      id="emergency_contact_phone"
                      type="tel"
                      value={formData.emergency_contact_phone}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          emergency_contact_phone: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* DNI Upload */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Foto del DNI
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Frente del DNI *</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange('front', e.target.files?.[0] || null)}
                      className="cursor-pointer"
                    />
                    {dniFront && (
                      <p className="text-xs text-muted-foreground mt-1">{dniFront.name}</p>
                    )}
                  </div>

                  <div>
                    <Label>Dorso del DNI *</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange('back', e.target.files?.[0] || null)}
                      className="cursor-pointer"
                    />
                    {dniBack && (
                      <p className="text-xs text-muted-foreground mt-1">{dniBack.name}</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Terms */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                />
                <label htmlFor="terms" className="text-sm leading-5 cursor-pointer">
                  Acepto los términos y condiciones de trabajo, y autorizo el tratamiento de mis
                  datos personales según la política de privacidad.
                </label>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Completar Registro'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
