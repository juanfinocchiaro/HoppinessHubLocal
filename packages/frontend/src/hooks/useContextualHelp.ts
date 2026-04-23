import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchHelpPreferences,
  updateHelpDismissedPages,
  updateShowFloatingHelp,
} from '@/services/configService';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { getHelpConfig, type HelpConfig } from '@/lib/helpConfig';

interface UseContextualHelpResult {
  config: HelpConfig | null;
  isDismissed: boolean;
  showFloatingHelp: boolean;
  loading: boolean;
  dismissHelp: () => Promise<void>;
  toggleFloatingHelp: () => Promise<void>;
}

export function useContextualHelp(pageId: string): UseContextualHelpResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get help config for this page
  const config = getHelpConfig(pageId);

  // Query user's help preferences
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile-help-prefs', user?.id],
    queryFn: () => {
      if (!user?.id) return null;
      return fetchHelpPreferences(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isDismissed = profile?.help_dismissed_pages?.includes(pageId) || false;
  const showFloatingHelp = profile?.show_floating_help ?? true;

  // Mutation to dismiss help for this page
  const dismissMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const currentDismissed = profile?.help_dismissed_pages || [];
      if (currentDismissed.includes(pageId)) return;

      return updateHelpDismissedPages(user.id, [...currentDismissed, pageId]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-help-prefs'] });
    },
    onError: (e: Error) => toast.error(`Error: ${e.message}`),
  });

  // Mutation to toggle floating help
  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      return updateShowFloatingHelp(user.id, !showFloatingHelp);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-help-prefs'] });
    },
    onError: (e: Error) => toast.error(`Error: ${e.message}`),
  });

  return {
    config,
    isDismissed,
    showFloatingHelp,
    loading: isLoading,
    dismissHelp: async () => {
      await dismissMutation.mutateAsync();
    },
    toggleFloatingHelp: async () => {
      await toggleMutation.mutateAsync();
    },
  };
}
