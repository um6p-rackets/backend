// apps/api-gateway/src/auth/dev-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class DevAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Dev auth is disabled in production');
    }
    const req = ctx.switchToHttp().getRequest();
    const id = Number(req.headers['x-user-id'] ?? 1);
    if (!Number.isInteger(id) || id < 1) throw new UnauthorizedException('Invalid x-user-id');
    req.user = { id };
    return true;
  }
}