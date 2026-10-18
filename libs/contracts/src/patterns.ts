// ================== AUTH SERVICE ==================

export const AUTH_PATTERNS = {
    REGISTER: 'auth.register',
    LOGIN: 'auth.login',
    REFRESH: 'auth.refresh',
    LOGOUT: 'auth.logout',
    GET_USER: 'auth.user.get',
    GET_USERS_BY_IDS: 'auth.users.get_many_by_ids',
    UPDATE_USER: 'auth.user.update',
}


// ================== CLUB SERVICE ==================

export const CLUB_PATTERNS = {
  GET_CLUBS: 'club.get-clubs',
  GET_CLUB: 'club.get-club',
  GET_CLUB_STATUS: 'club.get-club-status',
  GET_CLUB_WEEK_SESSIONS: 'club.get-club-week-sessions'
} as const;


// ================= NOTIFICATION SERVICE ==================

export const NOTIFICATION_PATTERNS = {
  GET_INBOX: 'notification.get-inbox',
  CREATE_NOTIFICATION: 'notification.create',
  MARK_AS_READ: 'notification.mark-as-read',
  MARK_ALL_AS_READ: 'notification.mark-all-as-read',
} as const;
