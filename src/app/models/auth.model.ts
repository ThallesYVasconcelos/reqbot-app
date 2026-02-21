export interface AuthResponse {
  accessToken: string;  // Backend retorna accessToken, não token
  tokenType?: string;
  expiresIn?: number;
  role: 'ADMIN' | 'USER';
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
  role: 'ADMIN' | 'USER';
  createdAt: string;
  updatedAt: string;
}
