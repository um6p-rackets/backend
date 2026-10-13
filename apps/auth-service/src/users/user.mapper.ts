import { User } from '@app/contracts';
import type { User as PrismaUser } from '../generated/prisma/client.js';

export function toUser(row: PrismaUser): User {
  return {
    id: row.id,
    login: row.login,
    // Map Prisma's camelCase (or snake_case) to the strict contract snake_case
    first_name: (row as any).firstName || row.first_name, 
    last_name: (row as any).lastName || row.last_name,
    gender: row.gender,
    department: row.department,
    phone_number: (row as any).phoneNumber || row.phone_number,
    email: row.email,
    avatar: row.avatar,
    // Safely convert the JavaScript Date to an ISO string
    joined_at: row.joined_at ? row.joined_at.toISOString() : new Date().toISOString(),
  };
}
