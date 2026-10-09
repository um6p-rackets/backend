import { Controller, Get } from '@nestjs/common';
import { AuthServiceService } from './auth-service.service.js';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class AuthServiceController {
	constructor(private readonly authServiceService: AuthServiceService) {}

	@MessagePattern({cmd: 'get_user'})
	getUser (@Payload() data: { userId: string }) {

		console.log(`[AuthService] Received request for user ID: ${data.userId}`);
		
		return { 
			id: data.userId, 
			username: 'abnsila', 
			role: 'admin',
			status: 'active'
		};
	}
}
