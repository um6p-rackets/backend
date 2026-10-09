// match-request.dto.ts
import {
  ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsDateString,
  IsEnum, IsInt, IsOptional, IsPositive,
} from 'class-validator';
import { MatchMode, MatchRequestBody } from '../club.types.js';

export class MatchRequestDto implements MatchRequestBody {
  @IsEnum(MatchMode)
  mode: MatchMode;

  @IsOptional() @IsInt() @IsPositive()
  partner_id?: number;

  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(2) @ArrayUnique()
  @IsInt({ each: true }) @IsPositive({ each: true })
  opponent_ids: number[];

  @IsInt() @IsPositive()
  requested_ref_id: number;

  @IsDateString()
  scheduled_at: string;
}