import { Controller } from "@nestjs/common";
import { AdminService } from "./admin.service.js";
import { AdminListUsersQueryDto } from "@app/contracts/admin/dto/admin-list-users-query.dto.js";
import { Payload, MessagePattern } from "@nestjs/microservices";
import { AUTH_PATTERNS } from "@app/contracts";

@Controller()
export class AdminController { 
  constructor(private readonly adminService: AdminService) {}

  @MessagePattern(AUTH_PATTERNS.ADMIN_LIST_USERS)
  async listUsers(@Payload() query: AdminListUsersQueryDto) {
    console.log(`[AuthService] Received admin list users request`);
    return await this.adminService.listUsers(query);
  }

}