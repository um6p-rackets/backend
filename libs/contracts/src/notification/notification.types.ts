export enum SenderType {
  USER = 'USER',
}

export enum NotificationCategory {
  CLUB = 'CLUB',
  USER = 'USER',
}

export enum NotificationType {
  JOIN_REQUESTED = 'JOIN_REQUESTED',
  JOIN_ACCEPTED = 'JOIN_ACCEPTED',
  JOIN_REJECTED = 'JOIN_REJECTED',
  CLUB_ANNOUNCEMENT = 'CLUB_ANNOUNCEMENT',
}

export interface Notification {
  id: bigint | number;
  event_id: string;
  sender_type: SenderType;
  sender_id?: bigint | number | null;
  category: NotificationCategory;
  type: NotificationType;
  club_id?: bigint | number | null;
  dedupe_key?: string | null;
  sent_at: Date | string;
}

export interface NotificationReceiver {
  id: bigint | number;
  notification_id: bigint | number;
  receiver_user_id: bigint | number;
  is_read: boolean;
  read_at: Date | string | null;
}
