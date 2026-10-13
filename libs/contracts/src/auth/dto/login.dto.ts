// auth/login.dto.ts
import { IsString } from 'class-validator';

export class LoginDto {
  @IsString() email: string;
  @IsString() password: string;
}