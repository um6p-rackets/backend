// match-respond.dto.ts
import { IsBoolean } from 'class-validator';

export class MatchRespondDto {
  @IsBoolean()
  accept: boolean;
}