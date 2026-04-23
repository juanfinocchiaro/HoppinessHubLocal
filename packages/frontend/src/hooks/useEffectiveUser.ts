/**
 * useEffectiveUser - Retorna el usuario efectivo para visualización y queries de lectura
 *
 * En modo normal: retorna datos de useAuth
 * En modo impersonación: retorna datos del targetUser
 *
 * USO CORRECTO:
 * - Queries de lectura (SELECT) que filtran por user_id → useEffectiveUser().id
 * - Visualización de nombre/email/avatar → useEffectiveUser()
 *
 * NO usar para:
 * - Mutations (INSERT/UPDATE/DELETE) que requieren user_id = auth.uid() en RLS
 *   → usar useAuth().user.id en su lugar
 * - Creación de registros donde importa quién lo hizo (created_by, published_by)
 *   → usar useAuth().user.id en su lugar
 */
import { useAuth } from './useAuth';
import { useImpersonation } from '@/contexts/ImpersonationContext';

export interface EffectiveUser {
  id: string | null;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  isImpersonated: boolean;
}

export function useEffectiveUser(): EffectiveUser {
  const { user } = useAuth();
  const { isImpersonating, targetUser } = useImpersonation();

  if (isImpersonating && targetUser) {
    return {
      id: targetUser.id,
      email: targetUser.email,
      full_name: targetUser.full_name,
      avatar_url: targetUser.avatar_url,
      isImpersonated: true,
    };
  }

  return {
    id: user?.id || null,
    email: user?.email || null,
    full_name: user?.user_metadata?.full_name || null,
    avatar_url: null,
    isImpersonated: false,
  };
}

export default useEffectiveUser;
