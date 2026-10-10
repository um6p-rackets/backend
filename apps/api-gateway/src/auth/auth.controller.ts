import { AUTH_SERVICE } from '@app/contracts';
import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('auth')
export class AuthController {
	constructor(
		@Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
	) {}

	@Get('test')
	async testAuthService() {
		// Sends { cmd: 'get_user' } to the Auth Service and waits for a reply
		const response = this.authClient.send({ cmd: 'get_user' }, { userId: 42 });
		
		// firstValueFrom converts the RabbitMQ Observable into a standard Promise
		return await firstValueFrom(response); 
  	}

	@Get('test-custom')
	async testCustom() {
		return await firstValueFrom(this.authClient.send({ cmd: 'test_custom_error' }, {}));
	}

	@Get('test-http')
	async testHttp() {
		return await firstValueFrom(this.authClient.send({ cmd: 'test_http_error' }, {}));
	}

	@Get('test-fatal')
	async testFatal() {
		return await firstValueFrom(this.authClient.send({ cmd: 'test_fatal_error' }, {}));
	}
}
