/**
 * PerfilSheet — Single unified profile editor (inline, no navigation away).
 * Includes personal data, birth date, and password change.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProfile, updateProfile } from '@/services/profileService';
import { updateUserPassword } from '@/services/authService';
import { linkGuestOrders } from '@/services/userOnboardingService';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Save, User, Mail, Lock, Eye, EyeOff, Calendar as CalendarIcon } from 'lucide-react';
import { SpinnerLoader, DotsLoader } from '@/components/ui/loaders';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PerfilSheet({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Password section
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile-sheet', user?.id],
    queryFn: async () => {
      const { data, error } = await fetchProfile(user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setAvatarUrl(profile.avatar_url || null);
      setBirthDate(profile.birth_date ? new Date(profile.birth_date) : undefined);
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const { error } = await updateProfile(user!.id, {
        full_name: fullName,
        phone,
        birth_date: birthDate ? format(birthDate, 'yyyy-MM-dd') : null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      if (phone) {
        linkGuestOrders().catch(() => {});
      }
      toast.success('Perfil actualizado');
      onOpenChange(false);
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      const { error } = await updateUserPassword(newPassword);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Contraseña actualizada');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    },
    onError: () => toast.error('Error al cambiar la contraseña'),
  });

  const handlePasswordSubmit = () => {
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    changePassword.mutate();
  };

  const initials = fullName
    ? fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Mi Perfil</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <SpinnerLoader size="sm" />
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                <AvatarFallback className="text-lg bg-primary/10 text-primary">
                  {fullName ? initials : <User className="w-6 h-6" />}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{fullName || 'Sin nombre'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <Separator />

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Email
              </Label>
              <Input value={user?.email || ''} disabled className="bg-muted" />
              <p className="text-[11px] text-muted-foreground">El email no se puede modificar</p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="sheet-name">Nombre completo</Label>
              <Input
                id="sheet-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="sheet-phone">Teléfono</Label>
              <Input
                id="sheet-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="351-1234567"
              />
            </div>

            {/* Birth date */}
            <div className="space-y-2">
              <Label>Fecha de nacimiento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !birthDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {birthDate
                      ? format(birthDate, "d 'de' MMMM, yyyy", { locale: es })
                      : 'Seleccionar fecha...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={birthDate}
                    onSelect={setBirthDate}
                    disabled={(date) => date > new Date() || date < new Date('1920-01-01')}
                    initialFocus
                    captionLayout="dropdown-buttons"
                    fromYear={1920}
                    toYear={new Date().getFullYear()}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button
              className="w-full"
              onClick={() => updateProfileMutation.mutate()}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? (
                <span className="mr-2 inline-flex">
                  <DotsLoader />
                </span>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar cambios
            </Button>

            <Separator />

            {/* Password section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Seguridad</span>
                </div>
                {!showPasswordSection && (
                  <Button variant="outline" size="sm" onClick={() => setShowPasswordSection(true)}>
                    Cambiar contraseña
                  </Button>
                )}
              </div>

              {showPasswordSection && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="sheet-new-pw">Nueva contraseña</Label>
                    <div className="relative">
                      <Input
                        id="sheet-new-pw"
                        type={showPasswords ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPasswords(!showPasswords)}
                      >
                        {showPasswords ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sheet-confirm-pw">Confirmar contraseña</Label>
                    <Input
                      id="sheet-confirm-pw"
                      type={showPasswords ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repetir contraseña"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={() => {
                        setShowPasswordSection(false);
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handlePasswordSubmit}
                      disabled={changePassword.isPending || !newPassword || !confirmPassword}
                    >
                      {changePassword.isPending ? (
                        <span className="mr-2 inline-flex">
                          <DotsLoader />
                        </span>
                      ) : (
                        <Lock className="w-4 h-4 mr-2" />
                      )}
                      Guardar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
