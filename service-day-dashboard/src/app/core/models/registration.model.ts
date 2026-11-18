export type RegistrationStatus = 'registered' | 'cancelled';

/** An employee's registration for an activity, enriched by the back-end for display. */
export interface Registration {
  id: string;
  userId: string;
  userName: string;
  department: string;
  activityId: string;
  activityTitle: string;
  ngoName: string;
  registeredAt: string;
  status: RegistrationStatus;
  cancelledAt: string | null;
  checkedInAt: string | null;
}
