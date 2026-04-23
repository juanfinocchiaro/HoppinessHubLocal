/**
 * Coaching System Types
 * Sistema de evaluación y certificación de empleados
 */

// Nivel de certificación: 0=Sin entrenar, 1=En entrenamiento, 2=Certificado, 3=Experto
export type CertificationLevel = 0 | 1 | 2 | 3;

export const CERTIFICATION_LEVELS: {
  value: CertificationLevel;
  label: string;
  color: string;
  description: string;
}[] = [
  {
    value: 0,
    label: 'Sin entrenar',
    color: 'bg-gray-800',
    description: 'No puede trabajar en esta estación',
  },
  {
    value: 1,
    label: 'En entrenamiento',
    color: 'bg-yellow-500',
    description: 'Puede trabajar con supervisión',
  },
  { value: 2, label: 'Certificado', color: 'bg-green-500', description: 'Puede trabajar solo' },
  { value: 3, label: 'Experto', color: 'bg-blue-500', description: 'Puede entrenar a otros' },
];

export interface WorkStation {
  id: string;
  key: string; // 'cajero', 'cocinero', 'runner', 'lavacopas'
  name: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export interface StationCompetency {
  id: string;
  station_id: string;
  key: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface GeneralCompetency {
  id: string;
  key: string;
  name: string;
  description: string | null;
  weight: number; // Peso para cálculo de promedio ponderado
  sort_order: number;
  is_active: boolean;
}

export type ManagerCompetencyCategory = 'marca';

export const MANAGER_CATEGORY_CONFIG: Record<
  ManagerCompetencyCategory,
  { label: string; icon: string }
> = {
  marca: { label: 'Evaluación desde Marca', icon: '🏢' },
};

export interface ManagerCompetency {
  id: string;
  key: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  category: ManagerCompetencyCategory | null;
  icon: string | null;
  rubric_1: string | null;
  rubric_3: string | null;
  rubric_5: string | null;
}

export interface EmployeeCertification {
  id: string;
  user_id: string;
  branch_id: string;
  station_id: string;
  level: CertificationLevel;
  certified_at: string | null;
  certified_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Coaching {
  id: string;
  user_id: string; // Empleado evaluado
  branch_id: string;
  evaluated_by: string; // Encargado/Franquiciado
  coaching_date: string;
  coaching_month: number; // 1-12
  coaching_year: number;

  // Scores generales
  general_score: number | null; // Promedio ponderado 1-4
  station_score: number | null; // Promedio de estaciones 1-4
  overall_score: number | null; // Promedio final

  // Notas cualitativas
  strengths: string | null;
  areas_to_improve: string | null;
  action_plan: string | null;
  manager_notes: string | null;

  // Seguimiento del plan anterior
  previous_action_review: string | null;

  // Confirmación del empleado
  acknowledged_at: string | null;
  acknowledged_notes: string | null;

  created_at: string;
  updated_at: string;
}

export interface CoachingStationScore {
  id: string;
  coaching_id: string;
  station_id: string;
  score: number; // 1-4
  notes: string | null;
}

export interface CoachingCompetencyScore {
  id: string;
  coaching_id: string;
  competency_type: 'station' | 'general' | 'manager';
  competency_id: string;
  score: number; // 1-4
  notes: string | null;
}

// Helper types for forms
export interface CoachingFormData {
  userId: string;
  branchId: string;
  coachingDate: Date;

  // Estaciones trabajadas y sus scores
  stationScores: {
    stationId: string;
    score: number;
    competencyScores: {
      competencyId: string;
      score: number;
    }[];
  }[];

  // Competencias generales
  generalScores: {
    competencyId: string;
    score: number;
  }[];

  // Notas
  strengths: string;
  areasToImprove: string;
  actionPlan: string;
  managerNotes: string;

  // Cambios de certificación propuestos
  certificationChanges: {
    stationId: string;
    newLevel: CertificationLevel;
  }[];
}

// View types with joined data
export interface CoachingWithDetails extends Coaching {
  employee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  evaluator?: {
    id: string;
    full_name: string;
  };
  station_scores?: CoachingStationScore[];
  competency_scores?: CoachingCompetencyScore[];
}

export interface EmployeeCertificationWithStation extends EmployeeCertification {
  station?: WorkStation;
}
