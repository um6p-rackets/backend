// matches-query.dto.ts
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto.js';

export const MATCH_STATUS_FILTERS = ['all', 'pending', 'upcoming', 'completed'] as const;
export type MatchStatusFilter = (typeof MATCH_STATUS_FILTERS)[number];

export class MatchesQueryDto extends PaginationQueryDto {
  @IsOptional() @IsIn(MATCH_STATUS_FILTERS)
  status: MatchStatusFilter = 'all';
}