import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { AuthServiceService } from './auth-service.service.js';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { rpcError } from '@app/contracts';

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

// Test 1: Custom RPC Error
  @MessagePattern({ cmd: 'test_custom_error' })
  testCustomError() {
    throw rpcError(400, 'This is a custom bad request from Auth', 'CustomValidationError');
  }

  // Test 2: Standard NestJS Exception
  @MessagePattern({ cmd: 'test_http_error' })
  testHttpError() {
    throw new UnauthorizedException('You do not have permission to do this');
  }

  // Test 3: Fatal Crash / Unhandled Exception
  @MessagePattern({ cmd: 'test_fatal_error' })
  testFatalError() {
    // Simulating a database crash or undefined variable
    const obj: any = null;
    return obj.thisMethodDoesNotExist(); 
  }
}
