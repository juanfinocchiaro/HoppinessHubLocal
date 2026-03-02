export interface ClockEntry {
  id: string;
  entry_type: 'clock_in' | 'clock_out';
  created_at: string;
  user_id: string;
  user_name: string;
  photo_url?: string | null;
  gps_status?: string | null;
  is_manual?: boolean;
  manual_by?: string | null;
  manual_reason?: string | null;
  original_created_at?: string | null;
  isFromNextDay?: boolean;
  schedule_id?: string | null;
  resolved_type?: 'scheduled' | 'unscheduled' | 'system_inferred' | null;
  anomaly_type?: string | null;
}

export interface SessionPair {
  clockIn: ClockEntry | null;
  clockOut: ClockEntry | null;
  durationMin: number | null;
}

export interface ScheduleInfo {
  id?: string;
  start_time: string | null;
  end_time: string | null;
  start_time_2?: string | null;
  end_time_2?: string | null;
  is_day_off: boolean;
  /** Internal: marks which segment of a split schedule this virtual schedule represents */
  _virtualSegment?: 1 | 2;
}

export interface DayRequest {
  userId: string;
  requestType: string;
  status: string;
}

export type RosterRowStatus =
  | 'absent'
  | 'late'
  | 'working'
  | 'unclosed'
  | 'pending'
  | 'completed'
  | 'day_off'
  | 'leave'
  | 'no_schedule';

export interface RosterRow {
  rowKey: string;
  userId: string;
  userName: string;
  isSubRow: boolean;
  status: RosterRowStatus;
  shiftLabel: string;
  entryTime: string | null;
  exitTime: string | null;
  totalMinutes: number;
  isLate: boolean;
  lateMinutes: number;
  anomalies: string[];
  sessions: SessionPair[];
  request: DayRequest | null;
  schedule: ScheduleInfo | null;
  /** Human-readable anomaly detail for inline display */
  anomalyDetail?: string | null;
  /** Whether any entry in this row was manually created */
  hasManualEntry?: boolean;
}
