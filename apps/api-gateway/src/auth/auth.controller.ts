import { 
    AUTH_PATTERNS, 
    AUTH_SERVICE, 
    AuthResult, 
    AuthTokens, 
    LoginDto, 
    RegisterDto, 
    User,
    HealthResult,
    LogoutResult
} from '@app/contracts';
import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { rpc } from '../common/helpers/rpc.helper.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Throttle } from '@nestjs/throttler';
import { clearAuthCookies, setAuthCookies } from './cookies.js';
import type { Request, Response } from 'express';
import { type AuthenticatedUser, REFRESH_COOKIE, REQUEST_LIMIT, REQUEST_TTL } from '@app/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('auth')
export class AuthController {
    constructor(
        @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
    ) {}

    @Public()
    @Throttle({ default: { limit: REQUEST_LIMIT, ttl: REQUEST_TTL } }) // REQUEST_LIMIT requests per REQUEST_TTL seconds
    @Get('health')
    async health(): Promise<HealthResult> {
        return rpc<HealthResult>(this.authClient, AUTH_PATTERNS.HEALTH, {});
    }

    @Public()
    @Throttle({ default: { limit: REQUEST_LIMIT, ttl: REQUEST_TTL } })
    @Post('register')
    async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response): Promise<{ user: User }> {
        const { user, ...tokens } = await rpc<AuthResult>(this.authClient, AUTH_PATTERNS.REGISTER, dto);
        setAuthCookies(res, tokens);
        
        return { user };
    }

    @Public()
    @Throttle({ default: { limit: REQUEST_LIMIT, ttl: REQUEST_TTL } })
    @HttpCode(200)
    @Post('login')
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<{ user: User }> {
        const { user, ...tokens } = await rpc<AuthResult>(this.authClient, AUTH_PATTERNS.LOGIN, dto);
        setAuthCookies(res, tokens);
        
        return { user };
    }

    @Public()
    @Throttle({ default: { limit: REQUEST_LIMIT, ttl: REQUEST_TTL } })
    @HttpCode(200)
    @Post('refresh')
    async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
        const refreshToken = req.cookies?.[REFRESH_COOKIE];
        if (!refreshToken) throw new UnauthorizedException();
        
        const tokens = await rpc<AuthTokens>(this.authClient, AUTH_PATTERNS.REFRESH, { refreshToken });
        setAuthCookies(res, tokens);
    }

    @HttpCode(200)
    @Throttle({ default: { limit: REQUEST_LIMIT, ttl: REQUEST_TTL } })
    @Post('logout')
    async logout(
        @Req() req: Request, 
        @Res({ passthrough: true }) res: Response
    ): Promise<LogoutResult> {
        const msg = await rpc<LogoutResult>(this.authClient, AUTH_PATTERNS.LOGOUT, { refreshToken: req.cookies?.[REFRESH_COOKIE] ?? '' });
        clearAuthCookies(res);
        return msg;
    }

    @Throttle({ default: { limit: REQUEST_LIMIT, ttl: REQUEST_TTL } })
    @Get('me')
    async me(@CurrentUser() user: AuthenticatedUser): Promise<User> {
        return rpc<User>(this.authClient, AUTH_PATTERNS.GET_USER, { userId: String(user.id) });
    }
}