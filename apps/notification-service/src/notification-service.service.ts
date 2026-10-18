import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

@Injectable()
export class NotificationServiceService {
  constructor(private readonly prisma: PrismaService) {}

  // Create a notification and its recipients
  async createNotification(data: {
    eventId: string;
    senderType: number;
    senderId?: bigint;
    category: number;
    clubId?: bigint;
    receiverUserIds: bigint[];
  }) {
    return this.prisma.notification.create({ // we return a promise that resolves the created notification 
      data: {
        eventId: data.eventId,
        senderType: data.senderType, // system = 1 , user = 2, club = 3
        senderId: data.senderId,
        category: data.category,  // meaning: join_request , join_accepted, join_rejected, club_announcement
        clubId: data.clubId,
        receivers: {
          create: data.receiverUserIds.map((userId) => ({
            receiverUserId: userId,
          })), // we need to handle exception if a userId does not exist 
        },
      },
      include: {
        receivers: true,
      },
    });
  }

  // Retrieve a user's notifications
  async getInbox(userId: bigint, page = 1, limit = 20) {
    return this.prisma.notificationReceiver.findMany({
      where: { receiverUserId: userId },
      orderBy: { id: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        notification: true,
      },
    });
  }

  // Mark one notification as read
//   async markAsRead(notificationId: bigint, userId: bigint) {
//     return this.prisma.notificationReceiver.updateMany({
//       where: {
//         notificationId,
//         receiverUserId: userId,
//         isRead: false,
//       },
//       data: {
//         isRead: true,
//         readAt: new Date(),
//       },
//     });
//   }

//   // Mark all of a user's notifications as read
//   async markAllAsRead(userId: bigint) {
//     return this.prisma.notificationReceiver.updateMany({
//       where: {
//         receiverUserId: userId,
//         isRead: false,
//       },
//       data: {
//         isRead: true,
//         readAt: new Date(),
//       },
//     });
//   }
}