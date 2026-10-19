import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  catchError,
  firstValueFrom,
  throwError,
  timeout,
  TimeoutError,
} from 'rxjs';
import {
  NOTIFICATION_PATTERNS,
  NOTIFICATION_SERVICE,
  GetInboxQueryDto,
  MarkAsReadDto,
} from '@app/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('notifications')
export class NotificationsController {
  constructor(
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationClient: ClientProxy,
  ) {}

  @Get('hello')
  async hello() {
    const response = this.notificationClient
      .send(NOTIFICATION_PATTERNS.HELLO, {})
      .pipe(
        timeout(5000),
        catchError((e) =>
          throwError(() =>
            e instanceof TimeoutError
              ? new ServiceUnavailableException(
                  'Notification service is not responding',
                )
              : e,
          ),
        ),
      );
    return firstValueFrom(response);
  }

  // GET /notifications/inbox?page=2&limit=20
  //   @UseGuards(DevAuthGuard)
  //   @Get('inbox')
  //   async getInbox(
  //     @CurrentUser() user: { id: number },
  //     @Query() { page, limit }: GetInboxQueryDto,
  //   ) {
  //     const response = this.notificationClient.send(NOTIFICATION_PATTERNS.GET_INBOX, {
  //       userId: user.id,
  //       page,
  //       limit,
  //     }).pipe(
  //       timeout(5000),
  //       catchError((e) =>
  //         throwError(() =>
  //           e instanceof TimeoutError
  //             ? new ServiceUnavailableException('Notification service is not responding')
  //             : e,
  //         ),
  //       ),
  //     );
  //     return firstValueFrom(response);
  //   }

  @Get('inbox')
  async getInbox(
    @Query('userId') userId: string,
    @Query() { page, limit }: GetInboxQueryDto,
  ) {
    const response = this.notificationClient
      .send(NOTIFICATION_PATTERNS.GET_INBOX, {
        userId: Number(userId),
        page,
        limit,
      })
      .pipe(
        timeout(5000),
        catchError((e) =>
          throwError(() =>
            e instanceof TimeoutError
              ? new ServiceUnavailableException(
                  'Notification service is not responding',
                )
              : e,
          ),
        ),
      );
    return firstValueFrom(response);
  }
  //   @Get('inbox')
  // getInbox(
  //   @Query('userId') userId: string,
  //   @Query() { page, limit }: GetInboxQueryDto,
  // ) {
  //   const users = [
  //     {
  //       userId: 1,
  //       notifications: [
  //         { id: 1, type: 'JOIN_REQUESTED', message: 'User 42 requested to join your club', is_read: false },
  //         { id: 2, type: 'JOIN_ACCEPTED', message: 'Your join request was accepted', is_read: true },
  //         { id: 3, type: 'JOIN_REJECTED', message: 'Your join request was rejected', is_read: false },
  //         { id: 4, type: 'CLUB_ANNOUNCEMENT', message: 'New club announcement', is_read: false },
  //         { id: 5, type: 'MATCH_SCHEDULED', message: 'A match has been scheduled', is_read: true },
  //       ],
  //     },
  //     {
  //       userId: 2,
  //       notifications: [
  //         { id: 6, type: 'JOIN_REQUESTED', message: 'User 51 requested to join your club', is_read: false },
  //         { id: 7, type: 'JOIN_ACCEPTED', message: 'Your join request was accepted', is_read: false },
  //         { id: 8, type: 'JOIN_REJECTED', message: 'Your join request was rejected', is_read: true },
  //         { id: 9, type: 'CLUB_ANNOUNCEMENT', message: 'Practice is cancelled today', is_read: false },
  //         { id: 10, type: 'MATCH_SCHEDULED', message: 'Your match starts tomorrow', is_read: true },
  //       ],
  //     },
  //     {
  //       userId: 3,
  //       notifications: [
  //         { id: 11, type: 'JOIN_REQUESTED', message: 'User 62 requested to join your club', is_read: false },
  //         { id: 12, type: 'JOIN_ACCEPTED', message: 'Your join request was accepted', is_read: true },
  //         { id: 13, type: 'JOIN_REJECTED', message: 'Your join request was rejected', is_read: false },
  //         { id: 14, type: 'CLUB_ANNOUNCEMENT', message: 'Welcome to the club', is_read: false },
  //         { id: 15, type: 'MATCH_SCHEDULED', message: 'Match details updated', is_read: true },
  //       ],
  //     },
  //     {
  //       userId: 4,
  //       notifications: [
  //         { id: 16, type: 'JOIN_REQUESTED', message: 'User 73 requested to join your club', is_read: false },
  //         { id: 17, type: 'JOIN_ACCEPTED', message: 'Your application was accepted', is_read: true },
  //         { id: 18, type: 'JOIN_REJECTED', message: 'Your application was rejected', is_read: false },
  //         { id: 19, type: 'CLUB_ANNOUNCEMENT', message: 'Club meeting this weekend', is_read: false },
  //         { id: 20, type: 'MATCH_SCHEDULED', message: 'Match rescheduled', is_read: true },
  //       ],
  //     },
  //     {
  //       userId: 5,
  //       notifications: [
  //         { id: 21, type: 'JOIN_REQUESTED', message: 'User 84 requested to join your club', is_read: false },
  //         { id: 22, type: 'JOIN_ACCEPTED', message: 'Your request was accepted', is_read: true },
  //         { id: 23, type: 'JOIN_REJECTED', message: 'Your request was rejected', is_read: false },
  //         { id: 24, type: 'CLUB_ANNOUNCEMENT', message: 'New club rules posted', is_read: false },
  //         { id: 25, type: 'MATCH_SCHEDULED', message: 'Upcoming match reminder', is_read: true },
  //       ],
  //     },
  //   ];

  //   const user = users.find((u) => u.userId === Number(userId));

  //   if (!user) {
  //     return { message: 'User not found' };
  //   }

  //   const currentPage = page ?? 1;
  //   const pageSize = limit ?? 20;
  //   const start = (currentPage - 1) * pageSize;

  //   return {
  //     userId: user.userId,
  //     total: user.notifications.length,
  //     page: currentPage,
  //     limit: pageSize,
  //     notifications: user.notifications.slice(start, start + pageSize),
  //   };
  // }

  //   @Post()
  //   async createNotification(@Body() createDto: CreateNotificationDto) {
  //     const response = this.notificationClient.send<CreateNotificationDto>(NOTIFICATION_PATTERNS.CREATE_NOTIFICATION, {
  //       event_id: createDto.event_id,
  //       sender_type: createDto.sender_type,
  //       sender_id: createDto.sender_id,
  //       category: createDto.category,
  //       type: createDto.type,
  //       club_id: createDto.club_id,
  //       receiver_user_ids: createDto.receiver_user_ids,
  //       dedupe_key: createDto.dedupe_key,
  //     }).pipe(
  //       timeout(5000),
  //       catchError((e) =>
  //         throwError(() =>
  //           e instanceof TimeoutError
  //             ? new ServiceUnavailableException('Notification service is not responding')
  //             : e,
  //         ),
  //       ),
  //     );
  //     return await firstValueFrom(response);
  //   }

  @Post(':notification_id/read')
  async markAsRead(
    @Param('notification_id', ParseIntPipe) notification_id: number,
    @CurrentUser() user: { id: number },
  ) {
    const response = this.notificationClient
      .send<MarkAsReadDto>(NOTIFICATION_PATTERNS.MARK_AS_READ, {
        notification_id,
        userId: user.id,
      })
      .pipe(
        timeout(5000),
        catchError((e) =>
          throwError(() =>
            e instanceof TimeoutError
              ? new ServiceUnavailableException(
                  'Notification service is not responding',
                )
              : e,
          ),
        ),
      );
    return firstValueFrom(response);
  }

  @Post('read-all')
  async markAllAsRead(@CurrentUser() user: { id: number }) {
    const response = this.notificationClient
      .send(NOTIFICATION_PATTERNS.MARK_ALL_AS_READ, {
        userId: user.id,
      })
      .pipe(
        timeout(5000),
        catchError((e) =>
          throwError(() =>
            e instanceof TimeoutError
              ? new ServiceUnavailableException(
                  'Notification service is not responding',
                )
              : e,
          ),
        ),
      );
    return firstValueFrom(response);
  }
}
