import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthServiceController } from './auth-service.controller.js';
import { AuthServiceService } from './auth-service.service.js';
import { configuration, envFiles } from '@app/common';

// Import your sub-modules
import { UsersModule } from './users/users.module.js';
import { TokensModule } from './tokens/tokens.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration], 
      envFilePath: envFiles('auth-service'),
      isGlobal: true
    }),
    // You must import the modules you created so the Auth Service can use them!
    UsersModule,
    TokensModule,
    PrismaModule
  ],
  controllers: [AuthServiceController],
  providers: [AuthServiceService],
})
export class AuthServiceModule {}
