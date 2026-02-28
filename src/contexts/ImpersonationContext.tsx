/**
 * ImpersonationContext - Sistema "Ver como..." para Superadmin
 *
 * Permite a superadmins visualizar la aplicación desde la perspectiva de otro usuario
 * SIN afectar operaciones reales de base de datos (RLS sigue usando auth.uid() real).
 */
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import {
  checkIsSuperadmin,
  fetchUserProfile,
  fetchImpersonationData,
} from '@/services/permissionsService';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';
import type { BrandRole, LocalRole, UserBranchRole } from '@/hooks/usePermissions';

type Branch = Tables<'branches'>;

// Datos del usuario impersonado
export interface ImpersonatedUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  brandRole: BrandRole;
  branchRoles: UserBranchRole[];
  accessibleBranches: Branch[];
}

interface ImpersonationContextType {
  // Estado
  isImpersonating: boolean;
  targetUser: ImpersonatedUser | null;
  loading: boolean;

  // Acciones
  startImpersonating: (userId: string) => Promise<void>;
  stopImpersonating: () => void;

  // Helper
  canImpersonate: boolean;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

const STORAGE_KEY = 'hoppiness_impersonation';

function readStoredImpersonation(): ImpersonatedUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ImpersonatedUser;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Restore synchronously to avoid layout shifts (banner/offset toggling after first render)
  const [targetUser, setTargetUser] = useState<ImpersonatedUser | null>(() =>
    readStoredImpersonation(),
  );
  const [isImpersonating, setIsImpersonating] = useState<boolean>(
    () => !!readStoredImpersonation(),
  );
  const [loading, setLoading] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  useEffect(() => {
    const doCheck = async () => {
      if (!user?.id) {
        setIsSuperadmin(false);
        return;
      }
      const result = await checkIsSuperadmin(user.id);
      setIsSuperadmin(result);
    };

    doCheck();
  }, [user?.id]);

  // Validate restored impersonation once we know if the current user is superadmin
  useEffect(() => {
    if (!isSuperadmin) {
      // If user isn't superadmin, never keep impersonation state
      if (sessionStorage.getItem(STORAGE_KEY)) {
        sessionStorage.removeItem(STORAGE_KEY);
      }
      setIsImpersonating(false);
      setTargetUser(null);
      return;
    }

    // If superadmin and we have stored target, keep it (already set synchronously)
    const stored = readStoredImpersonation();
    if (stored) {
      setTargetUser(stored);
      setIsImpersonating(true);
    }
  }, [isSuperadmin]);

  const startImpersonating = useCallback(
    async (userId: string) => {
      if (!isSuperadmin) return;

      setLoading(true);
      try {
        const profile = await fetchUserProfile(userId);
        if (!profile) throw new Error('Usuario no encontrado');

        const { brandRole, branchRoles: rawBranchRoles, branches } =
          await fetchImpersonationData(userId);

        const branchRoles: UserBranchRole[] = rawBranchRoles.map((r) => ({
          branch_id: r.branch_id,
          local_role: r.local_role as LocalRole,
        }));

        const impersonatedUser: ImpersonatedUser = {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          brandRole: (brandRole as BrandRole) || null,
          branchRoles,
          accessibleBranches: branches as Branch[],
        };

        setTargetUser(impersonatedUser);
        setIsImpersonating(true);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(impersonatedUser));
      } catch (error) {
        // Error logged in dev mode only, re-throw for caller handling
        if (import.meta.env.DEV) console.error('Error starting impersonation:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [isSuperadmin],
  );

  const stopImpersonating = useCallback(() => {
    setIsImpersonating(false);
    setTargetUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ImpersonationContext.Provider
      value={{
        isImpersonating,
        targetUser,
        loading,
        startImpersonating,
        stopImpersonating,
        canImpersonate: isSuperadmin,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error('useImpersonation must be used within ImpersonationProvider');
  }
  return context;
}
