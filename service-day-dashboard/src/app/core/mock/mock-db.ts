/** Raw shapes stored by the mock back-end (what a real database would hold). */
export interface DbUser {
  id: string; name: string; email: string; password: string;
  role: 'admin' | 'employee'; status: 'approved' | 'unapproved'; department: string; jobTitle: string;
}
export interface DbActivity {
  id: string; ngoName: string; title: string; serviceType: string; description: string; imageUrl?: string | null;
  location: string; startAt: string; endAt: string; cutoffAt: string; maxParticipants: number;
  qrToken: string | null; createdAt: string;
}
export interface DbRegistration {
  id: string; userId: string; activityId: string; registeredAt: string;
  status: 'registered' | 'cancelled'; cancelledAt: string | null; checkedInAt: string | null;
}
export interface DbNotification {
  id: string; audience: 'employee' | 'ngo'; recipientIds: string[] | 'all'; recipientLabel: string;
  ngoName: string | null; activityId: string | null; type: string; title: string; message: string;
  urgent: boolean; createdAt: string; readBy: string[];
}
export interface Db {
  users: DbUser[];
  activities: DbActivity[];
  registrations: DbRegistration[];
  notifications: DbNotification[];
  settings: { rules: { id: string; label: string; hoursBefore: number; enabled: boolean }[]; notifyNgos: boolean };
  /** Keys of reminders / urgent alerts already dispatched (prevents duplicates). */
  sentKeys: string[];
  seq: number;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
