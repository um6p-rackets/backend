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
import { clearAuthCookies, setAuthCookies, setCookie, clearCookie } from './cookies.js';
import type { Request, Response } from 'express';
import { type AuthenticatedUser, OAUTH_COOKIE, OAUTH_TTL_SECONDS, REFRESH_COOKIE, REQUEST_LIMIT, REQUEST_TTL } from '@app/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { GoogleOAuthService } from './google-oauth.service.js';
import googleOauthConfig from '../common/config/google-oauth.config.js';
import { type ConfigType } from '@nestjs/config';

@Controller('auth')
export class AuthController {
    constructor(
        @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
        private readonly googleOAuthService: GoogleOAuthService,
        @Inject(googleOauthConfig.KEY) private cfg: ConfigType<typeof googleOauthConfig>,
    ) {}

    @Public()
    @Get('health')
    async health(): Promise<HealthResult> {
        return rpc<HealthResult>(this.authClient, AUTH_PATTERNS.HEALTH, {});
    }

    @Public()
    @Throttle({ default: { limit: REQUEST_LIMIT, ttl: REQUEST_TTL } }) // REQUEST_LIMIT requests per REQUEST_TTL seconds
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
        
        try {
            const tokens = await rpc<AuthTokens>(this.authClient, AUTH_PATTERNS.REFRESH, { refreshToken });
            setAuthCookies(res, tokens);
        } catch (err) {
            // If the backend throws a 401 (e.g., token reuse detected or expired),
            // FORCE the browser to delete the tokens so they can't access /me anymore.
            // The hacker still holds an Access Token that is mathematically valid for x time ): , but they can't refresh it anymore, and the Access Token will expire soon (:
            clearAuthCookies(res);
            throw err;
        }
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


    // @Public()
    // @Throttle({ default: { limit: REQUEST_LIMIT, ttl: REQUEST_TTL } })
    // @Get('google/login')
    // async googleLogin(@Res() res: Response): Promise<void> {
    //     const { url, token } = await this.googleOAuthService.getAuthorizationUrl();
    //     setCookie(res, OAUTH_COOKIE, token, OAUTH_TTL_SECONDS, '/');
    //     res.redirect(url);
    // }

    // @Public()
    // @Throttle({ default: { limit: REQUEST_LIMIT, ttl: REQUEST_TTL } })
    // @Get('google/callback')
    // async googleCallback(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    //     try {
    //         const profile = await this.googleOAuthService.verifyCallback(req.query, req.cookies?.[OAUTH_COOKIE]);
    //         const { user, ...tokens } = await rpc<AuthResult>(this.authClient, AUTH_PATTERNS.OAUTH_LOGIN, profile);
    //         clearCookie(res, OAUTH_COOKIE, '/');
    //         setAuthCookies(res, tokens);
    //         res.redirect(this.cfg.frontendRedirectUrl);
    //     } catch (err) {
    //         clearCookie(res, OAUTH_COOKIE, '/');
    //         res.redirect(`${this.cfg.frontendRedirectUrl}/login?error=oauth_failed`);
    //     }
    // }
}