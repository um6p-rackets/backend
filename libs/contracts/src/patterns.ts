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
  GET_CLUB: 'club.get-club'
} as const;


// ================= NOTIFICATION SERVICE ==================
