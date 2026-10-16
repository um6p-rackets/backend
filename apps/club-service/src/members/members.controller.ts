import { CLUB_PATTERNS } from "@app/contracts";
import { MessagePattern } from "@nestjs/microservices";
import { MembersService } from "./members.service.js";
import { Controller } from "@nestjs/common";

@Controller()
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @MessagePattern(CLUB_PATTERNS.GET_CLUB_MEMBERS)
  async getClubMembers(data: { club_slug: string; user_id: number, limit?: number, page?: number, login?: string, role?: number }) {
    console.log("MembersController.getClubMembers", data);
    return this.membersService.getClubMembers(data.club_slug, data.user_id, data.limit, data.page, data.login, data.role);
  }
}