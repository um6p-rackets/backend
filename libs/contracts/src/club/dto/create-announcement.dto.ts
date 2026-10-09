// create-announcement.dto.ts
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString() @IsNotEmpty() @MaxLength(2000)
  description: string;
}