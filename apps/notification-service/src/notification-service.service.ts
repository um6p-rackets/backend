import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';
import {
  SenderType,
  NotificationCategory,
  NotificationType,
} from './generated/prisma/enums.js';

@Injectable()
export class NotificationServiceService {
  constructor(private readonly prisma: PrismaService) {}

  async hello() {
    return 'Hello from Notification Service!';
  }

  // notification can only be created by system or user event
  async createNotification(data: {
    event_id: string;
    sender_type: SenderType;
    sender_id?: bigint;
    category: NotificationCategory;
    type: NotificationType; // for filtering notifications by type
    club_id?: bigint;
    receiver_user_ids: bigint[];
    dedupe_key?: string | null;
  }) {
    try {
      return await this.prisma.notification.create({
        data: {
          event_id: data.event_id,
          sender_type: data.sender_type, // system = 1 , user = 2
          sender_id: data.sender_id,
          category: data.category, // for filtering notifications by category
          type: data.type,
          club_id: data.club_id,
          dedupe_key: data.dedupe_key,
          receivers: {
            create: data.receiver_user_ids.map((userId) => ({
              receiver_user_id: userId,
            })),
          },
        },
        include: { receivers: true },
      });
    } catch (error) {
      throw error;
    }
  }

  // Retrieve a user's notifications
  async getInbox(userId: bigint, page = 1, limit = 20) {
    return this.prisma.notificationReceiver.findMany({
      where: { receiver_user_id: userId },
      orderBy: { id: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { notification: true },
    });
  }

  // Mark one notification as read
  async markAsRead(notification_id: bigint, userId: bigint) {
    const receiver = await this.prisma.notificationReceiver.findFirst({
      where: {
        notification_id: notification_id,
        receiver_user_id: userId,
      },
    });

    if (!receiver) {
      throw new NotFoundException('Notification not found for this user');
    }

    return this.prisma.notificationReceiver.update({
      where: { id: receiver.id },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });
  }

  async markAllAsRead(userId: bigint) {
    return this.prisma.notificationReceiver.updateMany({
      where: {
        receiver_user_id: userId,
        is_read: false,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });
  }
}
