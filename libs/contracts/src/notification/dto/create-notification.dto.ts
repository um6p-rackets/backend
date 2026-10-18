import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { NotificationCategory, NotificationType, SenderType } from '../notification.types.js';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsEnum(SenderType)
  senderType: SenderType;

  @IsOptional()
  @IsNumber()
  senderId?: number;

  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsOptional()
  @IsNumber()
  clubId?: number;

  @IsArray()
  @IsNumber({}, { each: true })
  receiverUserIds: number[];

  @IsOptional()
  @IsString()
  dedupeKey?: string;
}
