import { Controller , Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationServiceService } from './notification-service.service.js';
import { EventPattern } from '@nestjs/microservices';
import { MarkAllAsReadDto, NOTIFICATION_PATTERNS, MarkAsReadDto, GetInboxQueryDto, GATEWAY_SERVICE, NOTIFICATION_REALTIME_EVENTS} from '@app/contracts';
import { NotificationEventDto } from '@app/contracts';
import { NOTIFICATION_EVENTS } from '@app/contracts';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';

@Controller()
export class NotificationServiceController {    private readonly logger = new Logger(NotificationServiceController.name);
  constructor(
    private readonly notificationService: NotificationServiceService,
    @Inject(GATEWAY_SERVICE) private readonly gatewayClient: ClientProxy,
  ) {}

    // @MessagePattern(NOTIFICATION_PATTERNS.HELLO)
    // async hello() {
    //     return this.notificationService.hello();
    // }

  // test mock data for inbox
    @MessagePattern(NOTIFICATION_PATTERNS.GET_INBOX)
    async getInbox(@Payload() data: GetInboxQueryDto) {
    return this.notificationService.getInbox(
        BigInt(data.user_id),
        data.page,
        data.limit,
    );
    }


    @MessagePattern(NOTIFICATION_PATTERNS.MARK_AS_READ)
    async markAsRead(
        @Payload()
        data: MarkAsReadDto
    ) {
        return this.notificationService.markAsRead(data);
    }

    @MessagePattern(NOTIFICATION_PATTERNS.MARK_ALL_AS_READ)
    async markAllAsRead(
        @Payload()
        data : MarkAllAsReadDto
    ) {
        return this.notificationService.markAllAsRead(data);
    }


  // ======= Event Handlers =======

    @EventPattern(NOTIFICATION_EVENTS.JOIN_REQUESTED)
    async handleJoinRequested(data: NotificationEventDto) {
    return this.handleNotificationEvent(data);
    }

    @EventPattern(NOTIFICATION_EVENTS.JOIN_ACCEPTED)
    async handleJoinAccepted(data: NotificationEventDto) {
    return this.handleNotificationEvent(data);
    }

    @EventPattern(NOTIFICATION_EVENTS.JOIN_REJECTED)
    async handleJoinRejected(data: NotificationEventDto) {
    return this.handleNotificationEvent(data);
    }

    
    private async handleNotificationEvent(data: NotificationEventDto) {
        this.logger.log(`Received notification event: ${data.event_id}`);
        this.logger.log(`Notification data: ${JSON.stringify(data)}`);
        const notification =
            await this.notificationService.createNotification(data);

        this.logger.log(`Saved notification event: ${data.event_id}`);

        this.gatewayClient.emit(
            NOTIFICATION_REALTIME_EVENTS.NEW_NOTIFICATION,
            data,
        );

        return notification;
    }


    // ====== WebSocket Event Handlers ======



    

}
