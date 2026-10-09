export type SenderType = 'member' | 'club';

export type Notification = {
  id: number; // bigserial PK
  sender_type: SenderType; // varchar(100)
  sender_id: number; // members.id or clubs.id (club service)
  notif_category: number; // int
  sent_at: string; // timestamptz
};

export type NotificationReceiver = {
  id: number; // bigserial PK
  notification_id: number; // bigint FK -> notifications.id
  receiver_user_id: number; // users.id (auth service)
  is_read: boolean; // boolean
  action: boolean | null; // null = pending, true = accepted, false = declined
};
