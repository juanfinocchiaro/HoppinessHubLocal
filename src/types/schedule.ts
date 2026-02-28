import type { WorkPositionType } from './workPosition';

export interface ScheduleValue {
  startTime: string | null;
  endTime: string | null;
  isDayOff: boolean;
  isBirthdayOff?: boolean;
  position: WorkPositionType | null;
  breakStart?: string | null;
  breakEnd?: string | null;
  startTime2?: string | null;
  endTime2?: string | null;
}

export interface ScheduleNotificationInput {
  user_id: string;
  branch_id: string;
  month: number;
  year: number;
  is_modification: boolean;
  modification_reason?: string;
  modified_date?: string;
  notify_email: boolean;
  notify_communication: boolean;
  sender_id: string;
}
