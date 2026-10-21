import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';
import { NotificationEventDto } from '@app/contracts';

@Injectable()
export class NotificationServiceService {
  constructor(private readonly prisma: PrismaService) {}

  async hello() {
    return 'Hello from Notification Service!';
  }

  // notification can only be created by system or user event
  async createNotification(data: NotificationEventDto) {
  return this.prisma.notification.upsert({
    where: { event_id: data.event_id },
    update: {},
    create: {
      event_id: data.event_id,
      sender_type: data.sender_type,
      sender_id:
        data.sender_id != null ? BigInt(data.sender_id) : null,
      category: data.category,
      type: data.type,
      club_id: data.club_id != null ? BigInt(data.club_id) : null,
      receivers: {
        create: data.receiver_user_ids.map((userId) => ({
          receiver_user_id: BigInt(userId),
        })),
      },
    },
    include: { receivers: true },
  });
  }

  // get inbox for a user with pagination
  async getInbox(user_id: bigint, page: number, limit: number) {
    const where = {
      receiver_user_id: user_id,
    };

    const [items, total] = await Promise.all([
      this.prisma.notificationReceiver.findMany({
        where,
        orderBy: { notification: { sent_at: 'desc' } },
        skip: (page - 1) * limit,
        take: limit,
        include: { notification: true },
      }),
      this.prisma.notificationReceiver.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        id: item.id.toString(),
        notification_id: item.notification_id.toString(),
        receiver_user_id: item.receiver_user_id.toString(),
        notification: {
          ...item.notification,
          id: item.notification.id.toString(),
          sender_id: item.notification.sender_id?.toString() ?? null,
          club_id: item.notification.club_id?.toString() ?? null,
        },
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  
  // Mark one notification as read
  async markAsRead(user_id: bigint, notification_id: bigint) {
    const receiver = await this.prisma.notificationReceiver.findUnique({
      where: {
        notification_id_receiver_user_id: {
          notification_id: notification_id,
          receiver_user_id: user_id,
        },
      },
    });

    if (!receiver) {
      throw new NotFoundException('Notification not found');
    }

    if (receiver.is_read) {
      return receiver;
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
