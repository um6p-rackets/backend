import { Injectable } from '@nestjs/common';

import { AdminListUsersQueryDto } from '@app/contracts/admin/dto/index.js';
import { PrismaService } from '../prisma/prisma.service.js';

// The ONLY user fields an admin can read. password_hash, tokens, reset fields,
// phone_number and deleted_at are never selected.
const ADMIN_USER_SELECT = {
  id: true,
  login: true,
  first_name: true,
  last_name: true,
  email: true,
  department: true,
  avatar: true,
  role: true,
  joined_at: true,
} as const;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /admin/users
  async listUsers(query: AdminListUsersQueryDto) {
    const { search, role, sort, order, page, limit } = query;
    const mode = 'insensitive' as const;

    const terms = search ? search.split(/\s+/).filter(Boolean) : [];

    const where = {
      deleted_at: null,
      ...(role ? { role }: {}),
      AND: terms.map((term) => ({
        OR: [
          { first_name: { contains: term, mode } },
          { last_name: { contains: term, mode } },
          { login: { contains: term, mode } },
        ],
      })),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: ADMIN_USER_SELECT,
        // id as a tie-breaker keeps the pages stable when many rows share a value
        orderBy: [{ [sort]: order }, { id: order }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, page, limit, total };
  }
}