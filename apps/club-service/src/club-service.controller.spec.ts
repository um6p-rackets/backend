import { Test, TestingModule } from '@nestjs/testing';
import { ClubServiceController } from './club-service.controller.js';
import { ClubServiceService } from './club-service.service.js';

describe('ClubServiceController', () => {
  let clubServiceController: ClubServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ClubServiceController],
      providers: [ClubServiceService],
    }).compile();

    clubServiceController = app.get<ClubServiceController>(
      ClubServiceController,
    );
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(clubServiceController.getHello()).toBe('Hello World!');
    });
  });
});
