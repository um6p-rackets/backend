// history-query.dto.ts
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto.js';

export class HistoryQueryDto extends PaginationQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @IsPositive()
  club_id?: number;
}