// apps/club-service/src/users/fake-user-directory.ts
import { Injectable } from '@nestjs/common';
import type { UserSummary } from '@app/contracts/club/club.types.js';
import { UserDirectory } from './user-directory.js';

@Injectable()
export class FakeUserDirectory implements UserDirectory {
  async getUsers(ids: number[]): Promise<UserSummary[]> {
    return ids.map((id) => ({
      id,
      login: `user${id}`,
      first_name: 'User',
      last_name: String(id),
      avatar: null,
      department: id % 2 ? '1337' : 'Computer Science',
    }));
  }
}