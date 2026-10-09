// create-document.dto.ts
import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateDocumentDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  title: string;

  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @IsUrl({ require_protocol: true }) @MaxLength(2048)
  path: string;
}