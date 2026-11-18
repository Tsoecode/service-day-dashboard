export type Role = 'admin' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
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
