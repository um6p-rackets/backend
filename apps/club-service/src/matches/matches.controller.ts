import { Controller } from "@nestjs/common";
import { MatchesService } from "./matches.service.js";
import { MessagePattern } from "@nestjs/microservices";
import { CLUB_PATTERNS } from "@app/contracts/patterns.js";
import { MatchesQueryDto, MatchRequestDto } from "@app/contracts/club/dto/index.js";


@Controller()
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}
  @MessagePattern(CLUB_PATTERNS.POST_CLUB_MATCH_REQUEST)
  async requestMatch(data: { slug: string; user_id: number; body: MatchRequestDto }) {
    return await this.matchesService.requestMatch(data.slug, data.user_id, data.body);
  }

  @MessagePattern(CLUB_PATTERNS.GET_CLUB_MATCHES)
  async getMatches(data: { slug: string; user_id: number; query: MatchesQueryDto }) {
    return await this.matchesService.getMatches(data.slug, data.user_id, data.query);
  }

  @MessagePattern(CLUB_PATTERNS.GET_CLUB_MATCH)
  async getMatch(data: { slug: string; user_id: number; match_id: number }) {
    return await this.matchesService.getMatch(data.slug, data.user_id, data.match_id);
  }
}