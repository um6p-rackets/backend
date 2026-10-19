import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  NotificationCategory,
  NotificationType,
  SenderType,
} from '../notification.types.js';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  event_id: string;

  @IsEnum(SenderType)
  sender_type: SenderType;

  @IsOptional()
  @IsNumber()
  sender_id?: number;

  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsOptional()
  @IsNumber()
  club_id?: number;

  @IsArray()
  @IsNumber({}, { each: true })
  receiver_user_ids: number[];

  @IsOptional()
  @IsString()
  dedupe_key?: string;
}
