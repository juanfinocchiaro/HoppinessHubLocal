import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { SpinnerLoader } from '@/components/ui/loaders';
import {
  getSession,
  onAuthStateChange,
  setSession,
  signOut,
  updateUserPassword,
} from '@/services/authService';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const isValidRef = useRef<boolean | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // IMPORTANT: Set up listener BEFORE checking session
    // This ensures we catch the PASSWORD_RECOVERY event from Supabase
    const {
      data: { subscription },
    } = onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        isValidRef.current = true;
        setIsValidSession(true);
      } else if (event === 'SIGNED_IN' && session) {
        isValidRef.current = true;
        setIsValidSession(true);
      }
    });

    // Check if we have a valid recovery session
    const checkSession = async () => {
      // Small delay to allow onAuthStateChange to process first
      await new Promise((resolve) => setTimeout(resolve, 500));

      const {
        data: { session },
      } = await getSession();

      if (session) {
        isValidRef.current = true;
        setIsValidSession(true);
        return;
      }

      // Check URL hash for recovery token (Supabase sends it in the hash)
      const hash = window.location.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');

        if (error) {
          toast.error(errorDescription || 'El link es inválido o expiró');
          setIsValidSession(false);
          return;
        }

        if (accessToken && type === 'recovery') {
          // Try to set the session manually
          try {
            const refreshToken = hashParams.get('refresh_token');
            if (refreshToken) {
              const { error: sessionError } = await setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (!sessionError) {
                setIsValidSession(true);
                // Clean up the URL
                window.history.replaceState(null, '', window.location.pathname);
                return;
              }
            }
          } catch {
            // Session recovery failed - will show invalid link UI
          }
        }
      }

      if (isValidRef.current === null) {
        setIsValidSession(false);
      }
    };

    checkSession();

    return () => {
      subscription.unsubscribe();
      clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error('Completá todos los campos');
      return;
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const { error } = await updateUserPassword(password);

      if (error) {
        toast.error('Error al actualizar la contraseña: ' + error.message);
      } else {
        setSuccess(true);
        toast.success('Contraseña actualizada correctamente');

        // Sign out and redirect to login after 2 seconds
        redirectTimerRef.current = setTimeout(async () => {
          await signOut();
          navigate('/ingresar');
        }, 2000);
      }
    } catch {
      toast.error('Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-4">
          <SpinnerLoader size="md" text="Verificando link..." />
        </div>
      </AuthLayout>
    );
  }

  // Invalid or expired link
  if (isValidSession === false) {
    return (
      <AuthLayout>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-destructive">
              Link inválido o expirado
            </CardTitle>
            <CardDescription>
              El link de recuperación ya no es válido. Por favor, solicitá uno nuevo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/olvide-password')}>
              Solicitar nuevo link
            </Button>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {success ? '¡Listo!' : 'Nueva contraseña'}
          </CardTitle>
          <CardDescription>
            {success
              ? 'Tu contraseña fue actualizada correctamente'
              : 'Ingresá tu nueva contraseña'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {success ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <p className="text-center text-muted-foreground">Redirigiendo al login...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repetí la contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  'Guardar nueva contraseña'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
