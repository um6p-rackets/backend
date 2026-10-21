import {ArrayMinSize,IsArray,IsEnum,IsNotEmpty,IsOptional,IsString,Matches,ValidateIf,
} from 'class-validator';

import {NotificationCategory,NotificationType,SenderType,
} from '../notification.types.js';

export class NotificationEventDto {
  @IsString()
  @IsNotEmpty()
  event_id!: string;

  @IsEnum(SenderType)
  sender_type!: SenderType;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  // @Matches(/^[0-9]+$/)
  sender_id?: string | null; // for system notification 

  @IsEnum(NotificationCategory)
  category!: NotificationCategory;

  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  // @Matches(/^[0-9]+$/)
  club_id?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  // @Matches(/^[0-9]+$/, { each: true })
  receiver_user_ids!: string[];
}
