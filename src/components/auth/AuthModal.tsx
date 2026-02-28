import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGooglePopupAuth } from '@/hooks/useGooglePopupAuth';
import { linkGuestOrders } from '@/services/userOnboardingService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { LogIn, Mail, UserPlus } from 'lucide-react';
import { DotsLoader } from '@/components/ui/loaders';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';
import { z } from 'zod';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { TurnstileWidget } from './TurnstileWidget';
import {
  clearFailedLoginAttempts,
  getFailedLoginAttempts,
  LOGIN_CAPTCHA_THRESHOLD,
  registerFailedLoginAttempt,
} from '@/lib/loginAttemptTracker';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'Mínimo 6 caracteres');

export function AuthModal() {
  const { isOpen, closeAuthModal, onSuccess } = useAuthModal();
  const { user, signIn, signUp } = useAuth();

  // Close modal when user becomes authenticated (handles Google OAuth redirect too).
  // Also trigger link-guest-orders to retroactively link orders made as guest.
  useEffect(() => {
    if (user && isOpen) {
      linkGuestOrders().catch(() => {});
      resetForm();
      closeAuthModal();
      onSuccess?.();
    }
  }, [user, isOpen]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleGoogleSuccess = () => {
    resetForm();
    closeAuthModal();
    onSuccess?.();
  };
  const { signInWithGooglePopup, loading: googleLoading } = useGooglePopupAuth(handleGoogleSuccess);
  const [signupCaptchaToken, setSignupCaptchaToken] = useState('');
  const [loginCaptchaToken, setLoginCaptchaToken] = useState('');
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
  const requiresLoginCaptcha = !!turnstileSiteKey && failedLoginAttempts >= LOGIN_CAPTCHA_THRESHOLD;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setSignupCaptchaToken('');
    setLoginCaptchaToken('');
    setFailedLoginAttempts(0);
    setSignupSuccess(false);
    setIsSubmitting(false);
    // googleLoading is managed by useGooglePopupAuth hook
  };

  useEffect(() => {
    setFailedLoginAttempts(getFailedLoginAttempts(email));
    setLoginCaptchaToken('');
  }, [email]);

  const handleSuccess = () => {
    resetForm();
    closeAuthModal();
    onSuccess?.();
  };

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
      handleSuccess();
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

    if (turnstileSiteKey && !signupCaptchaToken) {
      toast.error('Completá la verificación de seguridad');
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUp(email, password, fullName, signupCaptchaToken || undefined);
    setIsSubmitting(false);

    if (error) {
      setSignupCaptchaToken('');
      if (error.message.includes('already registered')) {
        toast.error('Este email ya está registrado');
      } else {
        toast.error(error.message);
      }
    } else {
      setSignupSuccess(true);
      toast.success('Cuenta creada. Revisá tu email para confirmar.');
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          resetForm();
          closeAuthModal();
        }
      }}
    >
      <DialogContent className="sm:max-w-md p-0 gap-0 border-none bg-transparent shadow-none [&>button]:hidden">
        <div className="bg-background rounded-2xl shadow-elevated overflow-hidden border">
          <div className="p-6 pb-2 text-center">
            <img
              src={logoHoppiness}
              alt="Hoppiness Club"
              className="w-16 h-16 mx-auto rounded-full shadow-elevated mb-3"
            />
            <h2 className="text-xl font-bold text-foreground">Bienvenido</h2>
            <p className="text-muted-foreground text-sm mt-1">Accedé a Hoppiness</p>
          </div>

          <div className="px-6 pb-6">
            {/* Google Sign-In */}
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl text-sm font-medium mb-3 gap-3"
              onClick={signInWithGooglePopup}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <DotsLoader />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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

            <div className="flex items-center gap-3 mb-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">o con email</span>
              <Separator className="flex-1" />
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50 p-1 rounded-xl">
                <TabsTrigger
                  value="login"
                  className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm"
                >
                  Iniciar Sesión
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm"
                >
                  Registrarse
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="modal-login-email" className="text-sm">
                      Email
                    </Label>
                    <Input
                      id="modal-login-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="modal-login-password" className="text-sm">
                      Contraseña
                    </Label>
                    <Input
                      id="modal-login-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10 rounded-xl"
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <Link
                      to="/olvide-password"
                      onClick={closeAuthModal}
                      className="text-xs text-primary hover:text-primary/80 hover:underline"
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
                    className="w-full h-10 rounded-xl font-semibold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <DotsLoader /> : <LogIn className="w-4 h-4 mr-2" />}
                    Ingresar
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                {signupSuccess ? (
                  <div className="text-center py-4 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                      <Mail className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className="font-semibold text-lg">Revisá tu email</h3>
                    <p className="text-sm text-muted-foreground">
                      Te enviamos un link de confirmación a <strong>{email}</strong>. Confirmá tu
                      cuenta para acceder a todas las funciones.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={() => {
                        resetForm();
                        closeAuthModal();
                        onSuccess?.();
                      }}
                    >
                      Entendido
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSignup} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="modal-signup-name" className="text-sm">
                        Nombre completo
                      </Label>
                      <Input
                        id="modal-signup-name"
                        type="text"
                        placeholder="Juan Pérez"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-10 rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="modal-signup-email" className="text-sm">
                        Email
                      </Label>
                      <Input
                        id="modal-signup-email"
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-10 rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="modal-signup-password" className="text-sm">
                        Contraseña
                      </Label>
                      <Input
                        id="modal-signup-password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-10 rounded-xl"
                        required
                      />
                    </div>
                    {turnstileSiteKey && (
                      <TurnstileWidget
                        siteKey={turnstileSiteKey}
                        onVerify={setSignupCaptchaToken}
                        onExpire={() => setSignupCaptchaToken('')}
                      />
                    )}
                    <Button
                      type="submit"
                      className="w-full h-10 rounded-xl font-semibold"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <DotsLoader /> : <UserPlus className="w-4 h-4 mr-2" />}
                      Crear cuenta
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
