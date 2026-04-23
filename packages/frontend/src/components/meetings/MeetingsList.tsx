/**
 * MeetingsList - Lista de reuniones con filtros (v2.0)
 */
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, Calendar } from 'lucide-react';
import { MeetingCard } from './MeetingCard';
import { MEETING_AREAS, type Meeting } from '@/types/meeting';
import { EmptyState } from '@/components/ui/states';

interface MeetingsListProps {
  meetings: (Meeting & { participants?: any[] })[];
  isLoading: boolean;
  onSelectMeeting: (meeting: Meeting) => void;
  onCreateMeeting?: () => void;
  showReadStatus?: boolean;
  showBranch?: boolean;
  canCreate?: boolean;
  currentUserId?: string;
}

export function MeetingsList({
  meetings,
  isLoading,
  onSelectMeeting,
  onCreateMeeting,
  showReadStatus = false,
  showBranch = false,
  canCreate = false,
  currentUserId,
}: MeetingsListProps) {
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = meetings.filter((m) => {
    const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase());
    const matchesArea = areaFilter === 'all' || m.area === areaFilter;
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesArea && matchesStatus;
  });

  // Check if meeting is unread for current user
  const isUnread = (meeting: Meeting & { participants?: any[] }) => {
    if (!currentUserId || meeting.status !== 'cerrada') return false;
    const participation = meeting.participants?.find((p: any) => p.user_id === currentUserId);
    return participation && !participation.read_at;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar reunión..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="convocada">Convocada</SelectItem>
            <SelectItem value="en_curso">En Curso</SelectItem>
            <SelectItem value="cerrada">Cerrada</SelectItem>
          </SelectContent>
        </Select>

        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {MEETING_AREAS.map((area) => (
              <SelectItem key={area.value} value={area.value}>
                {area.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canCreate && onCreateMeeting && (
          <Button onClick={onCreateMeeting}>
            <Plus className="w-4 h-4 mr-1" />
            Convocar
          </Button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Sin reuniones"
          description={
            search || areaFilter !== 'all' || statusFilter !== 'all'
              ? 'No hay reuniones que coincidan con los filtros'
              : 'Aún no hay reuniones registradas'
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              onClick={() => onSelectMeeting(meeting)}
              showReadStatus={showReadStatus}
              showBranch={showBranch}
              isUnread={isUnread(meeting)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
