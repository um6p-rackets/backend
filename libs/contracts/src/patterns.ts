// ================== AUTH SERVICE ==================

export const AUTH_PATTERNS = {
    HEALTH: 'auth.health',
    REGISTER: 'auth.register',
    LOGIN: 'auth.login',
    REFRESH: 'auth.refresh',
    OAUTH_LOGIN: 'auth.oauth.login',
    OAUTH_CALLBACK: 'auth.oauth.callback',
    LOGOUT: 'auth.logout',
    COMPLETE_PROFILE: 'auth.complete-profile',
    GET_USER: 'auth.user.get',
    IS_LOGIN_AVAILABLE: 'auth.user.is_login_available',
    GET_USER_BY_ID: 'auth.user.get_by_id',
    GET_USER_BY_LOGIN: 'auth.user.get_by_login',
    GET_USERS_BY_IDS: 'auth.users.get_many_by_ids',
    UPDATE_USER: 'auth.user.update',
}


// ================== CLUB SERVICE ==================

export const CLUB_PATTERNS = {
  GET_CLUBS: 'club.get-clubs',
  GET_CLUB: 'club.get-club',
  GET_CLUB_STATUS: 'club.get-club-status',
  PATCH_CLUB_UPDATE: 'club.patch-club-update',
  // ================== SESSIONS SERVICE ==================
  GET_CLUB_WEEK_SESSIONS: 'club.get-club-week-sessions',
  POST_CLUB_SESSION_ATTEND: 'club.post-club-session-attend',
  DELETE_CLUB_SESSION_ATTEND: 'club.delete-club-session-attend',
  POST_CLUB_SESSION_CREATE: 'club.post-club-session-create',
  PATCH_CLUB_SESSION_UPDATE: 'club.patch-club-session-update',
  DELETE_CLUB_SESSION_DELETE: 'club.delete-club-session-delete',
  // ================== MEMBERS SERVICE ==================
  GET_CLUB_MEMBERS: 'club.get-club-members',
  POST_CLUB_MEMBER_ADD: 'club.post-club-member-add',
  DELETE_CLUB_MEMBER_REMOVE: 'club.delete-club-member-remove',
  PATCH_CLUB_MEMBER_ROLE_UPDATE: 'club.patch-club-member-role-update',
  
} as const;


// ================= NOTIFICATION SERVICE ==================
