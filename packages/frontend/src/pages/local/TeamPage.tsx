import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { TeamTable, TeamCardList, useTeamData } from '@/components/local/team';
import { InviteStaffDialog } from '@/components/hr/InviteStaffDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDebounce } from '@/hooks/useDebounce';
import { useDynamicPermissions } from '@/hooks/useDynamicPermissions';
import { PageHelp } from '@/components/ui/PageHelp';
import { PageHeader } from '@/components/ui/page-header';
import type { Tables } from '@/types/database';

interface OutletContext {
  branch: Tables<'branches'>;
}

export default function TeamPage() {
  const { branch } = useOutletContext<OutletContext>();
  const { team, loading, refetch } = useTeamData(branch?.id);
  const { local } = useDynamicPermissions(branch?.id);
  const isMobile = useIsMobile();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const filteredTeam = debouncedSearch
    ? team.filter(
        (m) =>
          m.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          m.email?.toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    : team;

  // Separate franchisees from employees for counter display
  const employees = filteredTeam.filter((m) => m.local_role !== 'franquiciado');
  const franchisees = filteredTeam.filter((m) => m.local_role === 'franquiciado');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <HoppinessLoader />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHelp pageId="local-team" />
      <PageHeader
        title="Mi Equipo"
        subtitle={`${employees.length} empleado${employees.length !== 1 ? 's' : ''}${franchisees.length > 0 ? ` · ${franchisees.length} propietario${franchisees.length !== 1 ? 's' : ''}` : ''}`}
        actions={
          local.canInviteEmployees ? (
            <Button
              onClick={() => setShowInviteDialog(true)}
              className="w-full sm:w-auto min-h-[44px]"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invitar empleado
            </Button>
          ) : undefined
        }
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 min-h-[44px]"
        />
      </div>

      {/* Team list */}
      {isMobile ? (
        <TeamCardList team={filteredTeam} branchId={branch?.id} onMemberUpdated={refetch} />
      ) : (
        <TeamTable team={filteredTeam} branchId={branch?.id} onMemberUpdated={refetch} />
      )}

      <InviteStaffDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        branchId={branch?.id}
        branchName={branch?.name}
        onSuccess={refetch}
      />
    </div>
  );
}
