export interface AuthResponse {
  accessToken?: string;
  token?: string;
  tokenType?: string;
  expiresIn?: number;
  role?: 'USER';
  email?: string;
  name?: string;
}

export interface LoginRequest {
  idToken: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  pictureUrl: string | null;
  role: 'USER';
  createdAt: string;
  updatedAt: string;
}
