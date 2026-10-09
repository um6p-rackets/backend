// match-result.dto.ts
import { IsInt, Min } from 'class-validator';

export class MatchResultDto {
  @IsInt() @Min(0)
  team1_score: number;

  @IsInt() @Min(0)
  team2_score: number;
}