/**
 * Tipos para el módulo de Reuniones v2.0
 * Flujo de 2 fases: Convocatoria → Ejecución
 */

// Estados de reunión
export type MeetingStatus = 'convocada' | 'en_curso' | 'cerrada' | 'cancelada';

// Origen de la reunión
export type MeetingSource = 'mi_local' | 'mi_marca';

// Áreas disponibles para reuniones
export const MEETING_AREAS = [
  { value: 'general', label: 'General' },
  { value: 'cocina', label: 'Cocina' },
  { value: 'salon', label: 'Salón' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'caja', label: 'Caja' },
  { value: 'operaciones', label: 'Operaciones' },
] as const;

export type MeetingArea = (typeof MEETING_AREAS)[number]['value'];

// Meeting base
export interface Meeting {
  id: string;
  title: string;
  scheduled_at: string; // Fecha/hora programada
  date: string; // Legacy - mantener por compatibilidad
  area: MeetingArea;
  branch_id: string | null; // null = reunión de red (Mi Marca)
  created_by: string;
  status: MeetingStatus;
  notes: string | null; // null hasta que se ejecute
  started_at: string | null; // Cuando inició ejecución
  closed_at: string | null; // Cuando se cerró
  source: MeetingSource;
  created_at: string;
  updated_at?: string;
}

// Participant
export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  user_id: string;
  attended: boolean; // Legacy
  was_present: boolean | null; // null = no tomada, true/false después
  read_at: string | null;
  notified_at: string | null;
  reminder_count: number;
  created_at: string;
}

// Agreement
export interface MeetingAgreement {
  id: string;
  meeting_id: string;
  description: string;
  sort_order: number;
  created_at: string;
}

// Agreement Assignee
export interface MeetingAgreementAssignee {
  id: string;
  agreement_id: string;
  user_id: string;
}

// Extended types with relations
export interface MeetingWithDetails extends Meeting {
  branches?: {
    id: string;
    name: string;
    slug?: string;
  };
  participants: (MeetingParticipant & {
    profile?: {
      id: string;
      full_name: string;
      avatar_url?: string;
    };
  })[];
  agreements: (MeetingAgreement & {
    assignees: (MeetingAgreementAssignee & {
      profile?: {
        id: string;
        full_name: string;
        avatar_url?: string;
      };
    })[];
  })[];
  creator?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

// Form data for convocatoria (Fase 1)
export interface MeetingConveneData {
  title: string;
  date: Date;
  time: string;
  area: MeetingArea;
  participantIds: string[];
  branchId?: string | null; // null para reuniones de red
}

// Form data for ejecución (Fase 2)
export interface MeetingExecutionData {
  attendance: Record<string, boolean>; // userId -> was_present
  notes: string;
  agreements: {
    description: string;
    assigneeIds: string[];
  }[];
}

// Legacy wizard data (mantener por compatibilidad durante transición)
export interface MeetingWizardData {
  title: string;
  date: Date;
  time: string;
  area: MeetingArea;
  participantIds: string[];
  attendance: Record<string, boolean>;
  notes: string;
  agreements: {
    description: string;
    assigneeIds: string[];
  }[];
}

// Stats for dashboard
export interface MeetingStats {
  totalMeetings: number;
  unreadCount: number;
  lastMeetingDate?: string;
}

// Stats for brand dashboard
export interface BrandMeetingStats {
  totalMeetings: number;
  readPercentage: number;
  alertCount: number;
  pendingByBranch: Record<string, { name: string; pending: number }>;
  // Nuevas métricas v2
  convocadas: number;
  enCurso: number;
  cerradas: number;
}

// Team member for participant selection
export interface TeamMember {
  id: string;
  full_name: string;
  avatar_url?: string;
  local_role?: string;
  branch_id?: string;
  branch_name?: string;
}

// Status display config
export const MEETING_STATUS_CONFIG = {
  convocada: {
    label: 'Convocada',
    variant: 'pending' as const,
    description: 'Reunión programada, pendiente de iniciar',
  },
  en_curso: {
    label: 'En Curso',
    variant: 'active' as const,
    description: 'Reunión en ejecución',
  },
  cerrada: {
    label: 'Cerrada',
    variant: 'validated' as const,
    description: 'Reunión finalizada y documentada',
  },
  cancelada: {
    label: 'Cancelada',
    variant: 'blocked' as const,
    description: 'Reunión cancelada',
  },
} as const;
