// create-achievement.dto.ts
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateAchievementDto {
  @IsInt() @IsPositive()
  user_id: number;

  @IsString() @IsNotEmpty() @MaxLength(255)
  name: string;

  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;
}