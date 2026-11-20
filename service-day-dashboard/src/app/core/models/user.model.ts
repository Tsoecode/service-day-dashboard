export type Role = 'admin' | 'employee';
export type UserStatus = 'unapproved' | 'approved';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status?: UserStatus;
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
