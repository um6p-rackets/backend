import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RpcException } from '@nestjs/microservices';
import { toUser } from './user.mapper.js';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    const v = email.trim().toLowerCase();
    const row = await this.prisma.user.findFirst({ where: { email: v }});
    
    // Return null if not found, otherwise return the safely mapped User
    return row ? toUser(row) : null;
  }

  async findById(id: number) {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? toUser(row) : null;
  }

  async findMany(ids: number[]) {
    const rows = await this.prisma.user.findMany({ where: { id: { in: ids } } });
    return rows.map(row => toUser(row)); // Map arrays cleanly
  }

  async create(data: {
    login: string;
    first_name: string;
    last_name: string;
    gender: boolean | null;
    department: string | null;
    phone_number: string | null;
    email: string;
    avatar: string | null;
    password_hash: string;
  }) {
    try {
      // 1. Await the database creation
      const user = await this.prisma.user.create({ 
        data: { 
          ...data, 
          login: data.login.toLowerCase(), 
          email: data.email.toLowerCase() 
        } 
      });
      
      // 2. Return the safe, mapped user (strips out password_hash)
      return toUser(user); 
      
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new RpcException({ status: 409, message: 'Login or email already in use' });
      }
      throw error;
    }
  }

  async toUser(user: any) {
    if (!user) return null;
    const { password_hash, ...rest } = user;
    return rest;
  }

  async verifyPassword(userId: number, plainTextPassword: string): Promise<boolean> {
    // 1. Fetch the raw database row directly from Prisma to get the hash
    const userRecord = await this.prisma.user.findUnique({ 
      where: { id: userId } 
    });

    if (!userRecord || !userRecord.password_hash) {
      return false;
    }

    // 2. Securely compare the provided password against the database hash
    try {
      return await argon2.verify(userRecord.password_hash, plainTextPassword);
    } catch (error) {
      // Catching errors prevents crashes if the hash format in the DB is corrupted
      return false; 
    }
  }

}