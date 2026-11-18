export type NotificationType =
  | 'registration' | 'update' | 'cancellation' | 'reminder' | 'broadcast' | 'urgent' | 'checkin';

export type BroadcastTarget = 'all' | 'registered' | 'unregistered';

export interface AppNotification {
  id: string;
  audience: 'employee' | 'ngo';
  recipientLabel: string;
  recipientCount: number;
  ngoName: string | null;
  activityId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  urgent: boolean;
  createdAt: string;
  read: boolean;
}

export interface BroadcastRequest {
  title: string;
  message: string;
  target: BroadcastTarget;
  activityId: string | null;
  type: 'broadcast' | 'reminder' | 'urgent';
}

export interface ReminderRule {
  id: string;
  label: string;
  hoursBefore: number;
  enabled: boolean;
}

export interface ReminderSettings {
  rules: ReminderRule[];
  notifyNgos: boolean;
}
