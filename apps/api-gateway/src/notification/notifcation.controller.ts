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

  @Get('hello')
  async hello() {
    const response = this.notificationClient.send(NOTIFICATION_PATTERNS.HELLO, {}).pipe(
      timeout(5000),
      catchError((e) =>
        throwError(() =>
          e instanceof TimeoutError
            ? new ServiceUnavailableException('Notification service is not responding')
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
    async getInbox(@Query('userId') userId: string, @Query() { page, limit }: GetInboxQueryDto) {
      const response = this.notificationClient.send(NOTIFICATION_PATTERNS.GET_INBOX, {
        userId: Number(userId),
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
//         { id: 1, type: 'JOIN_REQUESTED', message: 'User 42 requested to join your club', isRead: false },
//         { id: 2, type: 'JOIN_ACCEPTED', message: 'Your join request was accepted', isRead: true },
//         { id: 3, type: 'JOIN_REJECTED', message: 'Your join request was rejected', isRead: false },
//         { id: 4, type: 'CLUB_ANNOUNCEMENT', message: 'New club announcement', isRead: false },
//         { id: 5, type: 'MATCH_SCHEDULED', message: 'A match has been scheduled', isRead: true },
//       ],
//     },
//     {
//       userId: 2,
//       notifications: [
//         { id: 6, type: 'JOIN_REQUESTED', message: 'User 51 requested to join your club', isRead: false },
//         { id: 7, type: 'JOIN_ACCEPTED', message: 'Your join request was accepted', isRead: false },
//         { id: 8, type: 'JOIN_REJECTED', message: 'Your join request was rejected', isRead: true },
//         { id: 9, type: 'CLUB_ANNOUNCEMENT', message: 'Practice is cancelled today', isRead: false },
//         { id: 10, type: 'MATCH_SCHEDULED', message: 'Your match starts tomorrow', isRead: true },
//       ],
//     },
//     {
//       userId: 3,
//       notifications: [
//         { id: 11, type: 'JOIN_REQUESTED', message: 'User 62 requested to join your club', isRead: false },
//         { id: 12, type: 'JOIN_ACCEPTED', message: 'Your join request was accepted', isRead: true },
//         { id: 13, type: 'JOIN_REJECTED', message: 'Your join request was rejected', isRead: false },
//         { id: 14, type: 'CLUB_ANNOUNCEMENT', message: 'Welcome to the club', isRead: false },
//         { id: 15, type: 'MATCH_SCHEDULED', message: 'Match details updated', isRead: true },
//       ],
//     },
//     {
//       userId: 4,
//       notifications: [
//         { id: 16, type: 'JOIN_REQUESTED', message: 'User 73 requested to join your club', isRead: false },
//         { id: 17, type: 'JOIN_ACCEPTED', message: 'Your application was accepted', isRead: true },
//         { id: 18, type: 'JOIN_REJECTED', message: 'Your application was rejected', isRead: false },
//         { id: 19, type: 'CLUB_ANNOUNCEMENT', message: 'Club meeting this weekend', isRead: false },
//         { id: 20, type: 'MATCH_SCHEDULED', message: 'Match rescheduled', isRead: true },
//       ],
//     },
//     {
//       userId: 5,
//       notifications: [
//         { id: 21, type: 'JOIN_REQUESTED', message: 'User 84 requested to join your club', isRead: false },
//         { id: 22, type: 'JOIN_ACCEPTED', message: 'Your request was accepted', isRead: true },
//         { id: 23, type: 'JOIN_REJECTED', message: 'Your request was rejected', isRead: false },
//         { id: 24, type: 'CLUB_ANNOUNCEMENT', message: 'New club rules posted', isRead: false },
//         { id: 25, type: 'MATCH_SCHEDULED', message: 'Upcoming match reminder', isRead: true },
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
//       eventId: createDto.eventId,
//       senderType: createDto.senderType,
//       senderId: createDto.senderId,
//       category: createDto.category,
//       type: createDto.type,
//       clubId: createDto.clubId,
//       receiverUserIds: createDto.receiverUserIds,
//       dedupeKey: createDto.dedupeKey,
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


  @UseGuards(DevAuthGuard)
  @Post(':notificationId/read')
  async markAsRead(
    @Param('notificationId', ParseIntPipe) notificationId: number,
    @CurrentUser() user: { id: number },
  ) {
    const response = this.notificationClient.send<MarkAsReadDto>(NOTIFICATION_PATTERNS.MARK_AS_READ, {
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
    return firstValueFrom(response);
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
    return firstValueFrom(response);
  }
}
