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
  eventId: string;
  senderType: SenderType;
  senderId?: bigint | number | null;
  category: NotificationCategory;
  type: NotificationType;
  clubId?: bigint | number | null;
  dedupeKey?: string | null;
  sentAt: Date | string;
}

export interface NotificationReceiver {
  id: bigint | number;
  notificationId: bigint | number;
  receiverUserId: bigint | number;
  isRead: boolean;
  readAt: Date | string | null;
}
