import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';
import { ClubSlugParamDto } from './club-slug-param.dto.js';
import { IsIdParam } from '@app/common';

export class JoinRequestParamDto extends ClubSlugParamDto {
  @IsIdParam("join request")
  request_id: number;
}