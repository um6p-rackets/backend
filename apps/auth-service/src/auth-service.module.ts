import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthServiceController } from './auth-service.controller.js';
import { AuthServiceService } from './auth-service.service.js';
import { configuration, envFiles, jwtConfig } from '@app/common';

// Sub-modules
import { UsersModule } from './users/users.module.js';
import { TokensModule } from './tokens/tokens.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration, jwtConfig], 
      envFilePath: envFiles('auth-service'),
      isGlobal: true
    }),
    UsersModule,
    TokensModule,
    PrismaModule
  ],
  controllers: [AuthServiceController],
  providers: [AuthServiceService],
})
export class AuthServiceModule {}
