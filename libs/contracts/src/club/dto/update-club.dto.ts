// update-club.dto.ts
import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class UpdateClubDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(255) @MinLength(4)
  name?: string;

  @IsOptional() @IsString() @MaxLength(2000) @MinLength(10)
  description?: string;

  // @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(2048)
  // avatar?: string;
}