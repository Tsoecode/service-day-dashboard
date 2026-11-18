export type ActivityStatus = 'open' | 'full' | 'closed' | 'completed';

/** A Service Day activity offered by a participating NGO (Model). */
export interface Activity {
  id: string;
  ngoName: string;
  title: string;
  serviceType: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
  /** Registration / edit / cancel deadline. */
  cutoffAt: string;
  maxParticipants: number;
  /** Computed by the (mock) back-end from active registrations. */
  registeredCount: number;
  qrToken: string | null;
  createdAt: string;
}

export type ActivityInput = Omit<Activity, 'id' | 'registeredCount' | 'qrToken' | 'createdAt'>;

export const SERVICE_TYPES = [
  'Food Security',
  'Environment',
  'Education',
  'Elderly Care',
  'Animal Welfare',
  'Community Development',
  'Health & Wellness'
];

export function slotsLeft(a: Activity): number {
  return Math.max(0, a.maxParticipants - a.registeredCount);
}

export function utilisation(a: Activity): number {
  return a.maxParticipants ? Math.round((a.registeredCount / a.maxParticipants) * 100) : 0;
}

export function getStatus(a: Activity, now: number = Date.now()): ActivityStatus {
  if (new Date(a.endAt).getTime() < now) return 'completed';
  if (new Date(a.cutoffAt).getTime() <= now) return 'closed';
  if (slotsLeft(a) === 0) return 'full';
  return 'open';
}

export function isCutoffPassed(a: Activity, now: number = Date.now()): boolean {
  return new Date(a.cutoffAt).getTime() <= now;
}

/** Human readable remaining time until the registration cut-off. */
export function timeUntil(iso: string, now: number = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return 'Closed';
  const mins = Math.floor(diff / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins % 60}m left`;
  return `${mins}m left`;
}

export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
