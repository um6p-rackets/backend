export const EVENTS = {
  USER_DELETED: 'user.deleted',
  CLUB_ANNOUNCEMENT_CREATED: 'club.announcement_created',
  CLUB_JOIN_REQUESTED: 'club.join_requested',
  NOTIFICATION_PUSH: 'notification.push',
} as const;

export interface UserDeletedEvent {
  userId: string;
}
