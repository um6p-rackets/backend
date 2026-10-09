import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthServiceController } from './auth-service.controller.js';
import { AuthServiceService } from './auth-service.service.js';
import { configuration, envFiles } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration], 
      envFilePath: envFiles('auth-service'),
      isGlobal: true
    })],
  controllers: [AuthServiceController],
  providers: [AuthServiceService],
})
export class AuthServiceModule {}
