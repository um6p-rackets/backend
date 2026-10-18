// matches-query.dto.ts
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto.js';
import { Transform } from 'class-transformer';

export const MATCH_STATUS_FILTERS = ['all', 'pending', 'upcoming', 'completed', 'cancelled'] as const;
export type MatchStatusFilter = (typeof MATCH_STATUS_FILTERS)[number];

export class MatchesQueryDto extends PaginationQueryDto {
  @IsOptional() @IsIn(MATCH_STATUS_FILTERS)
  status: MatchStatusFilter = 'all';

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  mine: boolean = false;
}