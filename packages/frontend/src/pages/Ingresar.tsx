import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoleLanding } from '@/hooks/useRoleLanding';
import { useGooglePopupAuth } from '@/hooks/useGooglePopupAuth';
import { linkGuestOrders } from '@/services/userOnboardingService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, LogIn, UserPlus } from 'lucide-react';
import { DotsLoader } from '@/components/ui/loaders';
import { toast } from 'sonner';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';
import { z } from 'zod';
import { TurnstileWidget } from '@/components/auth/TurnstileWidget';
import {
  clearFailedLoginAttempts,
  getFailedLoginAttempts,
  LOGIN_CAPTCHA_THRESHOLD,
  registerFailedLoginAttempt,
} from '@/lib/loginAttemptTracker';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'Mínimo 6 caracteres');

export default function Ingresar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, signIn, signUp } = useAuth();
  const { avatarInfo, loading: roleLoading } = useRoleLanding();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signInWithGooglePopup, loading: googleLoading } = useGooglePopupAuth();
  const [loginCaptchaToken, setLoginCaptchaToken] = useState('');
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
  const requiresLoginCaptcha = !!turnstileSiteKey && failedLoginAttempts >= LOGIN_CAPTCHA_THRESHOLD;

  // Redirigir usuarios autenticados a su landing ideal según su rol.
  // También vincula pedidos históricos hechos como invitado con el teléfono/email del usuario.
  useEffect(() => {
    if (!loading && !roleLoading && user) {
      linkGuestOrders().catch(() => {});

      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      if (from && from !== '/ingresar') {
        navigate(from, { replace: true });
        return;
      }

      navigate(avatarInfo.landingPath, { replace: true });
    }
  }, [user, loading, roleLoading, avatarInfo.landingPath, navigate, location.state]);

  useEffect(() => {
    setFailedLoginAttempts(getFailedLoginAttempts(email));
    setLoginCaptchaToken('');
  }, [email]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    if (requiresLoginCaptcha && !loginCaptchaToken) {
      toast.error('Completá la verificación de seguridad');
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(email, password, loginCaptchaToken || undefined);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        const nextAttempts = registerFailedLoginAttempt(email);
        setFailedLoginAttempts(nextAttempts);
        setLoginCaptchaToken('');
        toast.error('Email o contraseña incorrectos');
      } else {
        toast.error(error.message);
      }
    } else {
      clearFailedLoginAttempts(email);
      setFailedLoginAttempts(0);
      setLoginCaptchaToken('');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      if (!fullName.trim()) throw new Error('Nombre requerido');
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else if (err instanceof Error) {
        toast.error(err.message);
      }
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUp(email, password, fullName);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Este email ya está registrado');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Cuenta creada exitosamente');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-accent">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <img
            src={logoHoppiness}
            alt="Hoppiness Club"
            className="w-24 h-24 object-contain rounded-full"
          />
          <p className="text-white/80 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/95 to-accent flex flex-col relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-accent/10 rounded-full blur-2xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <Link to="/">
          <Button
            variant="ghost"
            className="text-white/90 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al inicio
          </Button>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          {/* Logo Section */}
          <div className="text-center mb-8">
            <img
              src={logoHoppiness}
              alt="Hoppiness Club"
              className="w-24 h-24 mx-auto rounded-full shadow-elevated"
            />
          </div>

          {/* Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-elevated overflow-hidden border border-white/50">
            <div className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground">Bienvenido</h2>
                <p className="text-muted-foreground mt-1">Accedé a Hoppiness</p>
              </div>

              {/* Google Sign-In */}
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl text-base font-medium mb-4 gap-3"
                onClick={signInWithGooglePopup}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <DotsLoader />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Continuar con Google
              </Button>

              <div className="flex items-center gap-3 mb-4">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">o con email</span>
                <Separator className="flex-1" />
              </div>

              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1 rounded-xl">
                  <TabsTrigger
                    value="login"
                    className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                  >
                    Iniciar Sesión
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                  >
                    Registrarse
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-0">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-medium">
                        Email
                      </Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 rounded-xl border-muted-foreground/20 focus:border-primary transition-colors"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-medium">
                        Contraseña
                      </Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 rounded-xl border-muted-foreground/20 focus:border-primary transition-colors"
                        required
                      />
                    </div>
                    <div className="flex justify-end">
                      <Link
                        to="/olvide-password"
                        className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                      >
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </div>
                    {requiresLoginCaptcha && (
                      <TurnstileWidget
                        siteKey={turnstileSiteKey}
                        onVerify={setLoginCaptchaToken}
                        onExpire={() => setLoginCaptchaToken('')}
                      />
                    )}
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary/90 transition-all shadow-elevated"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <DotsLoader /> : <LogIn className="w-5 h-5 mr-2" />}
                      Ingresar
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-0">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-sm font-medium">
                        Nombre completo
                      </Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Juan Pérez"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-12 rounded-xl border-muted-foreground/20 focus:border-primary transition-colors"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-medium">
                        Email
                      </Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 rounded-xl border-muted-foreground/20 focus:border-primary transition-colors"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm font-medium">
                        Contraseña
                      </Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 rounded-xl border-muted-foreground/20 focus:border-primary transition-colors"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary/90 transition-all shadow-elevated"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <DotsLoader /> : <UserPlus className="w-5 h-5 mr-2" />}
                      Crear cuenta
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Footer text */}
          <p className="text-center text-white/40 text-xs mt-6">
            © 2024 Hoppiness Club. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
