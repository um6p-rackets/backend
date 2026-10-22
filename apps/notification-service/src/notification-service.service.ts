import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';
import { MarkAllAsReadDto, MarkAsReadDto, NotificationEventDto } from '@app/contracts';
import { Prisma } from './generated/prisma/client.js';

@Injectable()
export class NotificationServiceService {
  constructor(private readonly prisma: PrismaService) {}

  // notification can only be created by system or user event
  async createNotification(data: NotificationEventDto) {
    const sender = data.sender_id ?? null;
    const receivers = [...new Set(data.receiver_user_ids)].filter((id) => id !== sender);
    if (receivers.length === 0) return { created: false as const, reason: 'no-receivers' as const };

    try {
      const n = await this.prisma.notification.create({
        data: {
          event_id: data.event_id,
          sender_type: data.sender_type,
          sender_id: sender != null ? BigInt(sender) : null,
          category: data.category,
          type: data.type,
          club_id: data.club_id != null ? BigInt(data.club_id) : null,
          receivers: {
            createMany: {
              data: receivers.map((id) => ({ receiver_user_id: BigInt(id) })),
              skipDuplicates: true,
            },
          },
        },
        select: { id: true },
      });
      return { created: true as const, notificationId: n.id, receivers };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return { created: false as const, reason: 'duplicate' as const };
      }
      throw e;
    }
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
  async markAsRead(data : MarkAsReadDto) {
    const receiver = await this.prisma.notificationReceiver.findUnique({
      where: {
        notification_id_receiver_user_id: {
          notification_id: BigInt(data.notification_id),
          receiver_user_id: BigInt(data.user_id),
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

  async markAllAsRead(data: MarkAllAsReadDto) { 
    return this.prisma.notificationReceiver.updateMany({
      where: {
        receiver_user_id: BigInt(data.user_id),
        is_read: false,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });
  }

}
