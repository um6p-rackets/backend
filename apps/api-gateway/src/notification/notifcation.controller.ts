import {Body,Controller,Get,Inject,Param,ParseIntPipe,Post,Query,ServiceUnavailableException,UseGuards,} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, throwError, timeout, TimeoutError } from 'rxjs';
import {
  NOTIFICATION_PATTERNS,
  NOTIFICATION_SERVICE,
  GetInboxQueryDto,
  CreateNotificationDto,
  MarkAsReadDto,
} from '@app/contracts';
import { DevAuthGuard } from '../auth/dev-auth.guard.js';
import { CurrentUser } from '../club/current-user.decorator.js';

@Controller('notifications')
export class NotificationController {
  constructor(
    @Inject(NOTIFICATION_SERVICE) private readonly notificationClient: ClientProxy,
  ) {}

  @UseGuards(DevAuthGuard)
  @Get('inbox')
  async getInbox(
    @CurrentUser() user: { id: number },
    @Query() { page, limit }: GetInboxQueryDto,
  ) {
    const response = this.notificationClient.send(NOTIFICATION_PATTERNS.GET_INBOX, {
      userId: user.id,
      page,
      limit,
    }).pipe(
      timeout(5000),
      catchError((e) =>
        throwError(() =>
          e instanceof TimeoutError
            ? new ServiceUnavailableException('Notification service is not responding')
            : e,
        ),
      ),
    );
    return await firstValueFrom(response);
  }

  @Post()
  async createNotification(@Body() createDto: CreateNotificationDto) {
    const response = this.notificationClient.send(NOTIFICATION_PATTERNS.CREATE_NOTIFICATION, {
      eventId: createDto.eventId,
      senderType: createDto.senderType,
      senderId: createDto.senderId,
      category: createDto.category,
      type: createDto.type,
      clubId: createDto.clubId,
      receiverUserIds: createDto.receiverUserIds,
      dedupeKey: createDto.dedupeKey,
    }).pipe(
      timeout(5000),
      catchError((e) =>
        throwError(() =>
          e instanceof TimeoutError
            ? new ServiceUnavailableException('Notification service is not responding')
            : e,
        ),
      ),
    );
    return await firstValueFrom(response);
  }

  @UseGuards(DevAuthGuard)
  @Post(':notificationId/read')
  async markAsRead(
    @Param('notificationId', ParseIntPipe) notificationId: number,
    @CurrentUser() user: { id: number },
  ) {
    const response = this.notificationClient.send(NOTIFICATION_PATTERNS.MARK_AS_READ, {
      notificationId,
      userId: user.id,
    }).pipe(
      timeout(5000),
      catchError((e) =>
        throwError(() =>
          e instanceof TimeoutError
            ? new ServiceUnavailableException('Notification service is not responding')
            : e,
        ),
      ),
    );
    return await firstValueFrom(response);
  }

  @UseGuards(DevAuthGuard)
  @Post('read-all')
  async markAllAsRead(@CurrentUser() user: { id: number }) {
    const response = this.notificationClient.send(NOTIFICATION_PATTERNS.MARK_ALL_AS_READ, {
      userId: user.id,
    }).pipe(
      timeout(5000),
      catchError((e) =>
        throwError(() =>
          e instanceof TimeoutError
            ? new ServiceUnavailableException('Notification service is not responding')
            : e,
        ),
      ),
    );
    return await firstValueFrom(response);
  }
}
