export type Role = 'admin' | 'employee';
export type UserStatus = 'unapproved' | 'approved' | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status?: UserStatus;
  decisionMessage?: string;
  decisionAt?: string;
  department: string;
  jobTitle: string;
}

export interface Session {
  user: User;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  department: string;
  jobTitle: string;
}
