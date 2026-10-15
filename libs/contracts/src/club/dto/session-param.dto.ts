import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';
import { ClubSlugParamDto } from './club-slug-param.dto.js';

export class SessionParamDto extends ClubSlugParamDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  session_id: Number;
}