/**
 * FichajeEmpleado - Página de fichaje con validación de reglamento
 *
 * URL: /fichaje/:branchCode
 *
 * Flujo:
 * 1. Empleado escanea QR estático del local
 * 2. Ingresa su PIN de 4 dígitos (auto-submit al completar)
 * 3. Sistema valida PIN y verifica reglamento pendiente
 * 4. Si hay reglamento pendiente > 5 días â†’ bloquea
 * 5. Captura selfie y la sube a storage al registrar el fichaje
 * 6. Elige ENTRADA o SALIDA manualmente
 * 7. Se registra el fichaje
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  fetchBranchForClock,
  validateClockPin,
  checkRegulationStatus as checkRegulationStatusService,
  validateManagerOverridePin,
} from '@/services/hrService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Camera,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  AlertTriangle,
  FileWarning,
  ShieldCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';
import { SpinnerLoader } from '@/components/ui/loaders';

type Step = 'pin' | 'regulation-warning' | 'regulation-blocked' | 'camera' | 'success' | 'error';

interface ValidatedUser {
  user_id: string;
  full_name: string;
  branch_id: string;
  branch_name: string;
}

interface BranchData {
  id: string;
  name: string;
  clock_code: string;
}

interface RegulationStatus {
  hasPending: boolean;
  daysSinceUpload: number;
  isBlocked: boolean;
}

export default function FichajeEmpleado() {
  const { branchCode } = useParams<{ branchCode: string }>();
  const [step, setStep] = useState<Step>('pin');
  const [pin, setPin] = useState('');
  const [validatedUser, setValidatedUser] = useState<ValidatedUser | null>(null);
  const [entryType, setEntryType] = useState<'clock_in' | 'clock_out' | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [regulationStatus, setRegulationStatus] = useState<RegulationStatus | null>(null);
  const [showManagerPinInput, setShowManagerPinInput] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [managerOverride, setManagerOverride] = useState<{ name: string } | null>(null);
  const [managerValidating, setManagerValidating] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Fetch branch data
  const {
    data: branch,
    isLoading: loadingBranch,
    error: branchError,
  } = useQuery({
    queryKey: ['branch-by-code', branchCode],
    queryFn: async () => {
      const data = await fetchBranchForClock(branchCode!);
      if (!data || data.length === 0) return null;
      return data[0] as BranchData;
    },
    enabled: !!branchCode,
  });

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Camera error:', err);
      toast.error('No se pudo acceder a la cámara');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.7);
        setCapturedPhoto(dataUrl);
        stopCamera();
      }
    }
  }, [stopCamera]);

  const checkRegulationStatus = useCallback(async (userId: string): Promise<RegulationStatus> => {
    try {
      return await checkRegulationStatusService(userId);
    } catch (error) {
      console.warn('Error checking regulation status:', error);
      return { hasPending: false, daysSinceUpload: 0, isBlocked: false };
    }
  }, []);

  const validatePinMutation = useMutation({
    mutationFn: async (pinValue: string) => {
      const data = await validateClockPin(branchCode!, pinValue);
      if (!data || data.length === 0) {
        throw new Error(
          'PIN incorrecto. Verificá que hayas configurado tu PIN para esta sucursal.',
        );
      }

      return data[0] as ValidatedUser;
    },
    onSuccess: async (userData) => {
      setValidatedUser(userData);

      const regStatus = await checkRegulationStatus(userData.user_id);
      setRegulationStatus(regStatus);

      if (regStatus.isBlocked) {
        setStep('regulation-blocked');
      } else if (regStatus.hasPending) {
        setStep('regulation-warning');
      } else {
        setStep('camera');
        startCamera();
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setPin('');
    },
  });

  const [scheduleLabel, setScheduleLabel] = useState<string | null>(null);
  const [shiftDurationMin, setShiftDurationMin] = useState<number | null>(null);

  const clockMutation = useMutation({
    mutationFn: async () => {
      if (!validatedUser) throw new Error('Usuario no validado');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/register-clock-entry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
        },
        body: JSON.stringify({
          branch_code: branchCode,
          pin: pin,
          user_agent: navigator.userAgent,
          photo_base64: capturedPhoto || undefined,
          override_manager_name: managerOverride?.name || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar fichaje');
      }

      return data as {
        entry_type: 'clock_in' | 'clock_out';
        schedule_label: string | null;
        shift_duration_min: number | null;
      };
    },
    onSuccess: (data) => {
      setEntryType(data.entry_type);
      setScheduleLabel(data.schedule_label);
      setShiftDurationMin(data.shift_duration_min);
      setStep('success');
    },
    onError: (error: Error) => {
      toast.error(`Error al fichar: ${error.message}`);
    },
  });

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      toast.error('El PIN debe tener 4 dígitos');
      return;
    }
    validatePinMutation.mutate(pin);
  };

  const handleContinueFromWarning = () => {
    setStep('camera');
    startCamera();
  };

  const handleClock = async () => {
    if (!capturedPhoto) {
      toast.error('Primero tomá una selfie');
      return;
    }
    clockMutation.mutate();
  };

  if (loadingBranch) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <SpinnerLoader size="lg" />
      </div>
    );
  }

  if (!branch || branchError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Local no encontrado</h1>
            <p className="text-muted-foreground">
              El código "{branchCode || '(vacío)'}" no existe o no está activo.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Verificá que estás escaneando el QR correcto.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <img src={logoHoppiness} alt="Hoppiness" className="h-12 mb-6" />

      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <CardTitle className="flex items-center justify-center gap-2">
            <Clock className="w-5 h-5" />
            Fichaje - {branch.name}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Step 1: PIN Entry */}
          {step === 'pin' && (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-muted-foreground">Ingresá tu PIN de fichaje</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">PIN (4 dígitos)</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setPin(value);
                    if (value.length === 4) {
                      validatePinMutation.mutate(value);
                    }
                  }}
                  placeholder="â€¢â€¢â€¢â€¢"
                  className="text-center text-2xl tracking-widest"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={pin.length !== 4 || validatePinMutation.isPending}
              >
                {validatePinMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Continuar
              </Button>
            </form>
          )}

          {/* Regulation Warning (days 1-5) */}
          {step === 'regulation-warning' && regulationStatus && (
            <div className="space-y-4">
              <div className="text-center">
                <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Reglamento Pendiente</h2>
                <p className="text-muted-foreground">
                  Tenés <strong>{5 - regulationStatus.daysSinceUpload} días</strong> para firmar el
                  nuevo reglamento.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Contactá a tu encargado para firmarlo.
                </p>
              </div>

              <Alert className="border-amber-500/50 bg-amber-500/10">
                <FileWarning className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-amber-700">
                  Si no firmás el reglamento en {5 - regulationStatus.daysSinceUpload} días, no
                  podrás fichar.
                </AlertDescription>
              </Alert>

              <Button onClick={handleContinueFromWarning} className="w-full">
                Continuar de todos modos
              </Button>
            </div>
          )}

          {/* Regulation Blocked (day 6+) */}
          {step === 'regulation-blocked' && (
            <div className="space-y-4 text-center">
              <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
              <h2 className="text-xl font-bold">Fichaje Bloqueado</h2>
              <p className="text-muted-foreground">
                No podés fichar hasta firmar el nuevo reglamento.
              </p>
              <Alert variant="destructive">
                <AlertDescription>Contactá a tu encargado para poder fichar.</AlertDescription>
              </Alert>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-border w-full" />
                <span className="bg-card px-3 text-xs text-muted-foreground absolute">ó</span>
              </div>

              {!showManagerPinInput ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowManagerPinInput(true)}
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Autorizar como encargado
                </Button>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="manager-pin">PIN del encargado (4 dígitos)</Label>
                  <Input
                    id="manager-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={managerPin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setManagerPin(value);
                      if (value.length === 4) {
                        setManagerValidating(true);
                        validateManagerOverridePin(branchCode!, value)
                          .then((result) => {
                            if (result) {
                              setManagerOverride({ name: result.full_name });
                              toast.success(`Autorizado por ${result.full_name}`);
                              setStep('camera');
                              startCamera();
                            } else {
                              toast.error('PIN de encargado incorrecto');
                              setManagerPin('');
                            }
                          })
                          .catch(() => {
                            toast.error('Error al validar PIN');
                            setManagerPin('');
                          })
                          .finally(() => setManagerValidating(false));
                      }
                    }}
                    placeholder="••••"
                    className="text-center text-2xl tracking-widest"
                    autoFocus
                    disabled={managerValidating}
                  />
                  {managerValidating && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Validando...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Camera + Clock buttons */}
          {step === 'camera' && validatedUser && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-lg font-medium">
                  ¡Hola {validatedUser.full_name.split(' ')[0]}!
                </p>
                <p className="text-muted-foreground text-sm">Sacate una selfie para fichar</p>
              </div>

              {/* Camera View */}
              <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
                {!capturedPhoto ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <Button
                      onClick={capturePhoto}
                      size="lg"
                      className="absolute bottom-4 left-1/2 -translate-x-1/2"
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      Capturar
                    </Button>
                  </>
                ) : (
                  <>
                    <img src={capturedPhoto} alt="Selfie" className="w-full h-full object-cover" />
                    <Button
                      onClick={() => {
                        setCapturedPhoto(null);
                        startCamera();
                      }}
                      variant="secondary"
                      size="sm"
                      className="absolute bottom-4 left-1/2 -translate-x-1/2"
                    >
                      Repetir
                    </Button>
                  </>
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />

              {capturedPhoto && (
                <Button
                  className="w-full h-auto py-4 text-lg"
                  onClick={handleClock}
                  disabled={clockMutation.isPending}
                >
                  {clockMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Clock className="w-5 h-5 mr-2" />
                  )}
                  Fichar
                </Button>
              )}

              <p className="text-center text-xs text-muted-foreground">
                {format(new Date(), 'HH:mm - EEE d MMM', { locale: es })}
              </p>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 'success' && validatedUser && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
              <div>
                <p className="text-lg font-semibold">¡Fichaje registrado!</p>
                <p className="text-muted-foreground">{validatedUser.full_name}</p>
                <p className="font-medium mt-2">
                  {entryType === 'clock_in' ? 'Entrada' : 'Salida'}: {format(new Date(), 'HH:mm')}
                </p>
                {scheduleLabel && (
                  <p className="text-sm text-muted-foreground">
                    Turno {scheduleLabel}
                  </p>
                )}
                {shiftDurationMin != null && entryType === 'clock_out' && (
                  <p className="text-sm text-muted-foreground">
                    Trabajaste {Math.floor(shiftDurationMin / 60)}h {shiftDurationMin % 60}m
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>

              {entryType === 'clock_in' ? (
                <div className="space-y-2">
                  <p className="text-primary font-medium">¡Buen turno!</p>
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                    Recordá que está prohibido el uso de teléfono a partir de este momento.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-primary font-medium">¡Gracias por tu trabajo hoy!</p>
                  <p className="text-sm text-muted-foreground">Descansá bien, nos vemos pronto.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
