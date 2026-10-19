import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NOTIFICATION_PATTERNS, NotificationCategory, NotificationType, SenderType } from '@app/contracts';
import { NotificationServiceService } from './notification-service.service.js';

@Controller()
export class NotificationServiceController {
  constructor(
    private readonly notificationService: NotificationServiceService,
  ) {}

  @MessagePattern(NOTIFICATION_PATTERNS.HELLO)
  async hello() {
    return this.notificationService.hello();
  }

  // test mock data for inbox 
  @MessagePattern(NOTIFICATION_PATTERNS.GET_INBOX)
getInbox(
  @Payload()
  data: {
    userId: bigint | number;
    page: number;
    limit: number;
  },
) {
  const users = [
    {
      userId: 1,
      notifications: [
        { id: 1, type: 'JOIN_REQUESTED', message: 'John requested to join your club.', isRead: false },
        { id: 2, type: 'JOIN_ACCEPTED', message: 'Your club join request was accepted.', isRead: false },
        { id: 3, type: 'JOIN_REJECTED', message: 'Your club join request was rejected.', isRead: true },
        { id: 4, type: 'CLUB_ANNOUNCEMENT', message: 'New club announcement.', isRead: false },
        { id: 5, type: 'PASSWORD_CHANGED', message: 'Your password was changed.', isRead: true },
      ],
    },
    {
      userId: 2,
      notifications: [
        { id: 6, type: 'JOIN_REQUESTED', message: 'Alice requested to join your club.', isRead: false },
        { id: 7, type: 'JOIN_ACCEPTED', message: 'Your request was accepted.', isRead: true },
        { id: 8, type: 'JOIN_REJECTED', message: 'Your request was rejected.', isRead: false },
        { id: 9, type: 'CLUB_ANNOUNCEMENT', message: 'Training is scheduled for tomorrow.', isRead: false },
        { id: 10, type: 'PASSWORD_CHANGED', message: 'Your password was changed.', isRead: true },
      ],
    },
    {
      userId: 3,
      notifications: [
        { id: 11, type: 'JOIN_REQUESTED', message: 'Mark requested to join your club.', isRead: true },
        { id: 12, type: 'JOIN_ACCEPTED', message: 'Your request was accepted.', isRead: false },
        { id: 13, type: 'JOIN_REJECTED', message: 'Your request was rejected.', isRead: false },
        { id: 14, type: 'CLUB_ANNOUNCEMENT', message: 'A new club event was announced.', isRead: true },
        { id: 15, type: 'PASSWORD_CHANGED', message: 'Your password was changed.', isRead: false },
      ],
    },
    {
      userId: 4,
      notifications: [
        { id: 16, type: 'JOIN_REQUESTED', message: 'Sarah requested to join your club.', isRead: false },
        { id: 17, type: 'JOIN_ACCEPTED', message: 'Your request was accepted.', isRead: true },
        { id: 18, type: 'JOIN_REJECTED', message: 'Your request was rejected.', isRead: true },
        { id: 19, type: 'CLUB_ANNOUNCEMENT', message: 'Club meeting this Friday.', isRead: false },
        { id: 20, type: 'PASSWORD_CHANGED', message: 'Your password was changed.', isRead: false },
      ],
    },
    {
      userId: 5,
      notifications: [
        { id: 21, type: 'JOIN_REQUESTED', message: 'Alex requested to join your club.', isRead: true },
        { id: 22, type: 'JOIN_ACCEPTED', message: 'Your request was accepted.', isRead: false },
        { id: 23, type: 'JOIN_REJECTED', message: 'Your request was rejected.', isRead: false },
        { id: 24, type: 'CLUB_ANNOUNCEMENT', message: 'Club tournament registrations are open.', isRead: true },
        { id: 25, type: 'PASSWORD_CHANGED', message: 'Your password was changed.', isRead: false },
      ],
    },
  ];

  const user = users.find((u) => u.userId === Number(data.userId));

  if (!user) {
    return {
      items: [],
      total: 0,
      page: data.page ?? 1,
      limit: data.limit ?? 20,
    };
  }

  const page = Math.max(1, data.page ?? 1);
  const limit = Math.max(1, data.limit ?? 20);
  const start = (page - 1) * limit;

  return {
    items: user.notifications.slice(start, start + limit),
    total: user.notifications.length,
    page,
    limit,
    totalPages: Math.ceil(user.notifications.length / limit),
  };
}

//   @MessagePattern(NOTIFICATION_PATTERNS.GET_INBOX)
//   async getInbox(
//     @Payload()
//     data: {
//       userId: bigint | number;
//       page: number;
//       limit: number;
//     },
//   ) {
//     return this.notificationService.getInbox(
//       BigInt(data.userId),
//       data.page ?? 1,
//       data.limit ?? 20,
//     );
//   }

  @MessagePattern(NOTIFICATION_PATTERNS.CREATE_NOTIFICATION)
  async createNotification(
    @Payload()
    data: {
      eventId: string;
      senderType: SenderType;
      senderId?: bigint | number | null;
      category: NotificationCategory;
      type: NotificationType;
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
      type: data.type,
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
