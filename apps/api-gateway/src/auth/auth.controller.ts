import { AUTH_PATTERNS, AUTH_SERVICE, AuthResult, AuthTokens, LoginDto, RegisterDto, User } from '@app/contracts';
import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { rpc } from '../common/helpers/rpc.helper.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Throttle } from '@nestjs/throttler';
import { clearAuthCookies, setAuthCookies } from './cookies.js';
import type { Request, Response } from 'express';
import { type AuthenticatedUser, REFRESH_COOKIE } from '@app/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';


@Controller('auth')
export class AuthController {
	constructor(
		@Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
	) {}

	@Public()
	@Throttle({ default: { limit: 5, ttl: 15 * 60_000 } }) // 5 requests per 15 minutes
	@Get('health')
	health(){
		return rpc(this.authClient, AUTH_PATTERNS.HEALTH, {});
	}

	@Public()
	@Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
	@Post('register')
	async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
		// We pass the return type <AuthResult> so the rpc helper remains strongly typed for other calls as well
		const { user, ...tokens } = await rpc<AuthResult>(this.authClient, AUTH_PATTERNS.REGISTER, dto);
		setAuthCookies(res, tokens);
		return { user };
	}

	@Public()
	@Throttle({ default: { limit: 500, ttl: 15 * 60_000 } })
	@HttpCode(200)
	@Post('login')
	async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
		const { user, ...tokens } = await rpc<AuthResult>(this.authClient, AUTH_PATTERNS.LOGIN, dto);
		setAuthCookies(res, tokens);
		return { user };
	}

	@Public()
	@HttpCode(200)
	@Post('refresh')
	async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
		const refreshToken = req.cookies?.[REFRESH_COOKIE];
		if (!refreshToken) throw new UnauthorizedException();
		const tokens = await rpc<AuthTokens>(this.authClient, AUTH_PATTERNS.REFRESH, { refreshToken });
		setAuthCookies(res, tokens);
	}

	@HttpCode(204)
	@Post('logout')
	async logout(@CurrentUser() user: AuthenticatedUser, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
		await rpc(this.authClient, AUTH_PATTERNS.LOGOUT, {
		userId: String(user.id), refreshToken: req.cookies?.[REFRESH_COOKIE] ?? '',
		});
		clearAuthCookies(res);
	}

	@Get('me')
	me(@CurrentUser() user: AuthenticatedUser) {
		    return rpc<User>(this.authClient, AUTH_PATTERNS.GET_USER, { userId: String(user.id) });
	}
}
