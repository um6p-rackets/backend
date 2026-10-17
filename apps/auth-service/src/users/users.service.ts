import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RpcException } from '@nestjs/microservices';
import { toUser } from './user.mapper.js';
import { OAuthLoginDto, User } from '@app/contracts';
import type { User as PrismaUser } from '../generated/prisma/client.js';
import * as argon2 from 'argon2';
import { TokensService } from '../tokens/tokens.service.js';
import { randomBytes, randomInt } from 'crypto';

const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$R29vZEx1Y2tXaXRoVGhhdEFyZ29uMklkSGFzaA';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async findRawByEmail(email: string): Promise<PrismaUser | null> {
    const v = email.trim().toLowerCase();
    return await this.prisma.user.findFirst({ where: { email: v } });
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.findRawByEmail(email);
    return row ? toUser(row) : null;
  }

  async findByLogin(login: string): Promise<User | null> {
    const v = login.trim().toLowerCase();
    const row = await this.prisma.user.findFirst({ where: { login: v } });
    return row ? toUser(row) : null;
  }

  async findById(id: number): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? toUser(row) : null;
  }

  async findMany(ids: number[]): Promise<User[]> {
    const rows = await this.prisma.user.findMany({ where: { id: { in: ids } } });
    return rows.map(row => toUser(row)); // Map arrays cleanly
  }

  async findManyByIds(ids: string[]): Promise<User[]> {
    const numericIds = ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    const rows = await this.prisma.user.findMany({ where: { id: { in: numericIds } } });
    return rows.map(row => toUser(row));
  }

  async createUser(data: {
    login: string;
    first_name: string;
    last_name: string;
    gender: boolean | null;
    department: string | null;
    phone_number: string | null;
    email: string;
    avatar: string | null;
    password_hash: string;
  }): Promise<User> {
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

  async getUserByIdentity(data: {provider: string, subject: string}): Promise<User | null> {
    // 1. Known identity: sign in
    const row = await this.prisma.identity.findUnique({
      where: { provider_subject: { provider: data.provider, subject: data.subject } },
      include: { user: true },
    });
    return row?.user ? toUser(row.user) : null;
  }

  async createIdentityUser(login: string, dto: OAuthLoginDto): Promise<User> {
    const row = await this.prisma.$transaction(async (prisma) => {
      // 1. Create the user
      const user = await prisma.user.create({
        data: {
          login,
          first_name: dto.first_name,
          last_name: dto.last_name,
          gender: null,
          department: null,
          phone_number: null,
          email: dto.email.toLowerCase(),
          avatar: dto.picture ?? null,
          password_hash: DUMMY_HASH,
        },
      });

      // 2. Create the identity link
      this.linkIdentityToUser(user.id, dto);      
      return user;  
    })
    return toUser(row);
  }

  async linkIdentityToUser(user_id: number, dto: OAuthLoginDto): Promise<void> {
    await this.prisma.identity.create({
      data: {
        provider: dto.provider,
        subject: dto.subject,
        user_id: user_id,
      },
    });
  }

  async validateCredentials(email: string, password: string): Promise<User | null> {
    const row = await this.findRawByEmail(email);
    
    // Select the hash to test: the real one if the user exists, or the dummy one if they don't
    const hashToVerify = (row && row.password_hash) ? row.password_hash : DUMMY_HASH;
    
    // ALWAYS run verify to prevent side-channel timing attacks
    const isPasswordValid = await argon2.verify(hashToVerify, password).catch(() => false);
    
    if (!row || !isPasswordValid) {
      return null;
    }

    // Strip the hash safely before returning to the Auth Service
    return toUser(row);
  }
}