import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration, envFiles } from '@app/common';
import { ClubServiceController } from './club-service.controller.js';
import { ClubServiceService } from './club-service.service.js';
import { PrismaService } from './prisma/prisma.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { FakeUserDirectory } from './users/fake-user-directory.js';
import { USER_DIRECTORY } from './users/user-directory.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: envFiles('club-service'),
    }),
    PrismaModule,
  ],
  controllers: [ClubServiceController],
  providers: [{
    provide: ClubServiceService, // by default the provider token is the class name, i write it here just to explain
    useClass: ClubServiceService,
  },
    {
      provide: USER_DIRECTORY, // because we are using an interface, we need to provide a token for the provider, so we can inject it later
      // because the interface doesn't exist at runtime, we can't use it as a provider token, so we use a symbol instead, (the interface vanishes on javascript)
      useClass: FakeUserDirectory,
    }
  ],
})
export class ClubServiceModule {}
