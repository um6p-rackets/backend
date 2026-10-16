// ================== AUTH SERVICE ==================

export const AUTH_PATTERNS = {
    HEALTH: 'auth.health',
    REGISTER: 'auth.register',
    LOGIN: 'auth.login',
    REFRESH: 'auth.refresh',
    OAUTH_LOGIN: 'auth.oauth.login',
    OAUTH_CALLBACK: 'auth.oauth.callback',
    LOGOUT: 'auth.logout',
    GET_USER: 'auth.user.get',
    GET_USER_BY_LOGIN: 'auth.user.get_by_login',
    GET_USERS_BY_IDS: 'auth.users.get_many_by_ids',
    UPDATE_USER: 'auth.user.update',
}


// ================== CLUB SERVICE ==================

export const CLUB_PATTERNS = {
  GET_CLUBS: 'club.get-clubs',
  GET_CLUB: 'club.get-club',
  GET_CLUB_STATUS: 'club.get-club-status',
  GET_CLUB_WEEK_SESSIONS: 'club.get-club-week-sessions',
  POST_CLUB_SESSION_ATTEND: 'club.post-club-session-attend',
  DELETE_CLUB_SESSION_ATTEND: 'club.delete-club-session-attend',
  POST_CLUB_SESSION_CREATE: 'club.post-club-session-create',
  PATCH_CLUB_SESSION_UPDATE: 'club.patch-club-session-update',
  DELETE_CLUB_SESSION_DELETE: 'club.delete-club-session-delete',
} as const;


// ================= NOTIFICATION SERVICE ==================
