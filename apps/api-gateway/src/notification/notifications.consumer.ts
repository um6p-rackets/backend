import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  NOTIFICATION_REALTIME_EVENTS,
  type NotificationEventDto,
} from '@app/contracts';
import { NotificationsGateway } from './notifications.gateway.js';

@Controller()
export class NotificationEventsConsumer {
  private readonly logger = new Logger(NotificationEventsConsumer.name);

  constructor(
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @EventPattern(NOTIFICATION_REALTIME_EVENTS.NEW_NOTIFICATION)
  handleNewNotification(@Payload() data: NotificationEventDto): void {
    if (!Array.isArray(data.receiver_user_ids)) {
      this.logger.warn('Invalid notification event: missing recipients');
      return;
    }

    for (const userId of data.receiver_user_ids) {
      this.notificationsGateway.sendToUser(userId, data);
    }

    this.logger.log(
      `Forwarded notification ${data.event_id} to ${data.receiver_user_ids.length} recipients`,
    );
  }
}