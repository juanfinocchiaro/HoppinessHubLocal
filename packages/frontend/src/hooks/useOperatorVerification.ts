/**
 * useOperatorVerification - Verificación y cambio de operador (Fase 5)
 */
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  insertOperatorSessionLog,
  callValidateSupervisorPin,
  fetchUserRolesForVerification,
  fetchProfileFullName,
  signInWithPassword,
} from '@/services/posService';

export interface OperatorInfo {
  userId: string;
  fullName: string;
  role?: string;
}

export function useOperatorVerification(branchId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const logConfirmIdentity = useMutation({
    mutationFn: async (triggeredBy: string) => {
      if (!branchId || !user) return;
      try {
        await insertOperatorSessionLog({
          branch_id: branchId,
          current_user_id: user.id,
          previous_user_id: null,
          action_type: 'confirm_identity',
          triggered_by: triggeredBy,
        });
      } catch (e) {
        console.debug('operator_session_logs no disponible');
      }
    },
  });

  const logOperatorChange = useMutation({
    mutationFn: async ({
      previousUserId,
      newUserId,
      triggeredBy,
    }: {
      previousUserId: string;
      newUserId: string;
      triggeredBy: string;
    }) => {
      if (!branchId) return;
      try {
        await insertOperatorSessionLog({
          branch_id: branchId,
          previous_user_id: previousUserId,
          current_user_id: newUserId,
          action_type: 'operator_change',
          triggered_by: triggeredBy,
        });
      } catch (e) {
        console.debug('operator_session_logs no disponible');
      }
    },
  });

  const validateSupervisorPin = useCallback(
    async (pin: string): Promise<OperatorInfo | null> => {
      if (!branchId) return null;

      try {
        const { data, error } = await callValidateSupervisorPin(branchId, pin);

        if (error) {
          if (import.meta.env.DEV) console.error('Error validating PIN:', error);
          return null;
        }

        if (data && data.length > 0) {
          const supervisor = data[0];
          return {
            userId: supervisor.user_id,
            fullName: supervisor.full_name,
            role: supervisor.role,
          };
        }
      } catch (e) {
        console.debug('validate_supervisor_pin no disponible, usando verificación alternativa');
        if (!user) return null;
        const roles = await fetchUserRolesForVerification(user.id);
        const matchedRole = roles?.[0]?.brand_role || roles?.[0]?.local_role;
        if (
          roles &&
          roles.length > 0 &&
          ['encargado', 'franquiciado', 'superadmin', 'coordinador'].includes(matchedRole || '')
        ) {
          const profile = await fetchProfileFullName(user.id);
          return {
            userId: user.id,
            fullName: profile?.full_name || user.email || 'Usuario',
            role: matchedRole as string,
          };
        }
      }

      return null;
    },
    [branchId, user],
  );

  const changeOperator = useCallback(
    async (email: string, password: string, triggeredBy: string): Promise<OperatorInfo | null> => {
      const previousUserId = user?.id;

      const { data, error } = await signInWithPassword(email, password);

      if (error) {
        toast.error('Credenciales incorrectas');
        return null;
      }

      if (data.user && previousUserId) {
        const newProfile = await fetchProfileFullName(data.user.id);

        try {
          await logOperatorChange.mutateAsync({
            previousUserId,
            newUserId: data.user.id,
            triggeredBy,
          });
        } catch (logErr) {
          console.error('Error logging operator change (non-blocking):', logErr);
        }

        queryClient.invalidateQueries();
        toast.success(`Sesión cambiada a ${newProfile?.full_name || email}`);

        return {
          userId: data.user.id,
          fullName: newProfile?.full_name || email,
        };
      }

      return null;
    },
    [user, logOperatorChange, queryClient],
  );

  const currentOperator: OperatorInfo | null = user
    ? {
        userId: user.id,
        fullName: user.email || 'Usuario',
      }
    : null;

  return {
    currentOperator,
    validateSupervisorPin,
    changeOperator,
    logConfirmIdentity: (triggeredBy: string) => logConfirmIdentity.mutate(triggeredBy),
    isLoading: logConfirmIdentity.isPending || logOperatorChange.isPending,
  };
}
