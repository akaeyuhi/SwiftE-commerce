import { User, UserDto } from '@/features/users/types/users.types.ts';

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface ResetPasswordDto {
  email: string;
}

export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

export interface VerifyTokenDto {
  token: string;
}
