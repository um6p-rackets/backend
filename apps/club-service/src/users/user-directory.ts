// apps/club-service/src/users/user-directory.ts
import type { UserSummary } from '@app/contracts/club/club.types.js';

export interface UserDirectory {
  getUsers(ids: number[]): Promise<UserSummary[]>;
}

// an interface doesn't exist at runtime, so Nest needs a token to find the provider
export const USER_DIRECTORY = Symbol('USER_DIRECTORY');