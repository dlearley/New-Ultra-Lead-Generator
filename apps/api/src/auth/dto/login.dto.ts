// apps/api/src/auth/dto/login.dto.ts
import { IsEmail, IsString, IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  @IsOptional()
  mfaToken?: string; // TOTP code if MFA enabled
}
