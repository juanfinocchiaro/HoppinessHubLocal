/**
 * Backward-compatible hook module.
 * Notification logic now lives in src/services/schedulesService.ts
 */
export {
  sendScheduleNotification,
  sendBulkScheduleNotifications,
} from '@/services/schedulesService';
export type { ScheduleNotificationInput as NotificationInput } from '@/types/schedule';
