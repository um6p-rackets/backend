// auth/register.dto.ts
import { IsEmail, IsString, MinLength, MaxLength, IsBoolean } from 'class-validator';

export class RegisterDto {
  @IsString() @MaxLength(255) login: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) @MaxLength(128) password: string;
  @IsString() @MaxLength(255) firstName: string;
  @IsString() @MaxLength(255) lastName: string;
  @IsBoolean() gender: boolean;
  @IsString() department: string;
  @IsString() @MaxLength(50) phoneNumber: string;
}