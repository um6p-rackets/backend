import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';
import { SenderType, NotificationCategory , NotificationType} from './generated/prisma/enums.js';

@Injectable()
export class NotificationServiceService {
  constructor(private readonly prisma: PrismaService) {}

  async hello() {
    return 'Hello from Notification Service!';
  }

  // notification can only be created by system or user event
  async createNotification(data: {
    eventId: string;
    senderType: SenderType;
    senderId?: bigint;
    category: NotificationCategory;
    type: NotificationType; // for filtering notifications by type
    clubId?: bigint;
    receiverUserIds: bigint[];
    dedupeKey?: string | null;
  }) {
    try {
      return await this.prisma.notification.create({
        data: {
          eventId: data.eventId,   
          senderType: data.senderType, // system = 1 , user = 2 
          senderId: data.senderId, 
          category: data.category, // for filtering notifications by category
          type : data.type,
          clubId: data.clubId,
          dedupeKey: data.dedupeKey, 
          receivers: {
            create: data.receiverUserIds.map((userId) => ({
              receiverUserId: userId,
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
      where: { receiverUserId: userId },
      orderBy: { id: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { notification: true },
    });
  }

  // Mark one notification as read
  async markAsRead(notificationId: bigint, userId: bigint) {
    const receiver = await this.prisma.notificationReceiver.findFirst({
      where: {
        notificationId: notificationId,
        receiverUserId: userId,
      },
    });

    if (!receiver) {
      throw new NotFoundException('Notification not found for this user');
    }

    return this.prisma.notificationReceiver.update({
      where: { id: receiver.id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: bigint) {
    return this.prisma.notificationReceiver.updateMany({
      where: {
        receiverUserId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }
}
