import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutUserDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}