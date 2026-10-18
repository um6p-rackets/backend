import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NOTIFICATION_PATTERNS } from '@app/contracts';
import { NotificationServiceService } from './notification-service.service.js';

@Controller()
export class NotificationServiceController {
  constructor(
    private readonly notificationService: NotificationServiceService,
  ) {}

  @MessagePattern(NOTIFICATION_PATTERNS.GET_INBOX)
  async getInbox(
    @Payload()
    data: {
      userId: bigint | number;
      page: number;
      limit: number;
    },
  ) {
    return this.notificationService.getInbox(
      BigInt(data.userId),
      data.page ?? 1,
      data.limit ?? 20,
    );
  }

  @MessagePattern(NOTIFICATION_PATTERNS.CREATE_NOTIFICATION)
  async createNotification(
    @Payload()
    data: {
      eventId: string;
      senderType: number;
      senderId?: bigint | number | null;
      category: number;
      clubId?: bigint | number | null;
      receiverUserIds: (bigint | number)[];
      dedupeKey?: string | null;
    },
  ) {
    return this.notificationService.createNotification({
      eventId: data.eventId,
      senderType: data.senderType,
      senderId: data.senderId ? BigInt(data.senderId) : undefined,
      category: data.category,
      clubId: data.clubId ? BigInt(data.clubId) : undefined,
      receiverUserIds: data.receiverUserIds.map((id) => BigInt(id)),
      dedupeKey: data.dedupeKey,
    });
  }

  @MessagePattern(NOTIFICATION_PATTERNS.MARK_AS_READ)
  async markAsRead(
    @Payload()
    data: {
      notificationId: bigint | number;
      userId: bigint | number;
    },
  ) {
    return this.notificationService.markAsRead(BigInt(data.notificationId), BigInt(data.userId));
  }

  @MessagePattern(NOTIFICATION_PATTERNS.MARK_ALL_AS_READ)
  async markAllAsRead(
    @Payload()
    data: {
      userId: bigint | number;
    },
  ) {
    return this.notificationService.markAllAsRead(BigInt(data.userId));
  }
}
