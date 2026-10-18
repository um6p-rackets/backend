// Club service types, shared by the backend and the frontend.
// Timestamps are ISO strings. Ids from other services are plain numbers.

import type { User } from '@app/contracts/auth/auth.types.js';

// ==========================================
// 1. Enums
// ==========================================

export enum MemberRole {
  MEMBER = 0,
  LEADER = 1,
  COACH = 2,
}

export enum WeekDay {
  MONDAY = 0,
  TUESDAY = 1,
  WEDNESDAY = 2,
  THURSDAY = 3,
  FRIDAY = 4,
  SATURDAY = 5,
  SUNDAY = 6,
}

export enum MatchMode {
  SINGLES = 1,
  DOUBLES = 2,
}

export enum MatchStatus {
  PENDING = 0, // waiting for the referee
  CONFIRMED = 1, // accepted, not played yet
  FINISHED = 2, // result entered
}

// ==========================================
// 2. Database entities (club service)
// ==========================================

// ---------- Clubs ----------

export type Club = {
  id: number;
  name: string;
  slug: string; // unique, used in URLs
  description: string | null;
  avatar: string | null;
  created_at: string;
};

export type Member = {
  id: number;
  club_id: number;
  user_id: number; // auth service
  role: MemberRole;
  joined_at: string;
  left_at: string | null; // null = active member
};

export type Announcement = {
  id: number;
  club_id: number;
  announcer_id: number; // member id
  description: string;
  created_at: string;
};

export type Achievement = {
  id: number;
  club_id: number;
  user_id: number; // auth service
  name: string;
  description: string | null;
  taken_at: string;
};

export type ClubDocument = {
  id: number;
  club_id: number;
  title: string;
  description: string | null;
  path: string; // link to the document
};

// ---------- Sessions ----------

// The weekly plan. Only used to generate sessions.
export type SessionTemplate = {
  id: number;
  club_id: number;
  weekday: WeekDay;
  start_time: string; // time of day, "17:30:00"
  duration_minutes: number; // 1..1440, can cross midnight
  title: string | null;
  location: string | null;
  capacity: number;
  created_at: string;
  updated_at: string;
};

// One real session. Keeps its own values, so history never changes.
export type Session = {
  id: number;
  club_id: number;
  template_id: number | null; // null = detached from its weekly plan
  start_at: string;
  end_at: string;
  title: string | null;
  location: string | null;
  capacity: number;
  cancelled_at: string | null; // null = active
  created_at: string;
  updated_at: string;
};

// A booking: one member in one session.
export type SessionAttend = {
  id: number;
  session_id: number;
  member_id: number;
  created_at: string;
};

// ---------- Matches ----------

export type Team = {
  id: number;
  club_id: number;
  player1_id: number; // member id
  player2_id: number | null; // member id, null = singles
  created_at: string;
};

export type Match = {
  id: number;
  club_id: number;
  team1_id: number;
  team2_id: number;
  winner_id: number | null; // set only when FINISHED
  ref_id: number | null; // member id
  team1_score: number;
  team2_score: number;
  team1_points: number; // ladder points gained or lost
  team2_points: number;
  mode: MatchMode;
  status: MatchStatus;
  scheduled_at: string;
};

// ==========================================
// 3. Shared building blocks
// ==========================================

// Every paginated list returns this shape.
export type Paginated<T> = {
  data: T[];
  page: number;
  limit: number;
  total: number;
};

// Small user card used inside other responses (data from the auth service).
export type UserSummary = Pick<
  User,
  'id' | 'login' | 'first_name' | 'last_name' | 'avatar' | 'department'
>;

// A club member seen as a person.
export type Player = UserSummary & { member_id: number };

// ==========================================
// 4. Club views
// ==========================================

export type ClubWithMembersCount = Club & { members_count: number };

// GET /:slug/status: who the current user is in this club.
export type ClubMemberStatus = {
  is_member: boolean;
  member_id: number | null;
  role: MemberRole | null;
};

export type MemberWithUser = Member & { user: UserSummary };

export type AnnouncementWithAuthor = Announcement & { announcer: Player };

// ==========================================
// 5. Session views
// ==========================================

// First match wins: cancelled, past (ended), ongoing (started), full, open.
export type SessionState = 'cancelled' | 'past' | 'ongoing' | 'full' | 'open';

export type SessionView = Session & {
  attends_count: number;
  spots_left: number; // never below 0
  is_joined: boolean; // is the current user booked
  state: SessionState;
};

// GET /clubs/:slug/sessions?week=YYYY-MM-DD
export type WeekView = {
  week_start: string; // Monday, "2026-10-12"
  is_current_week: boolean;
  prev_week_start: string; // past weeks are read-only
  next_week_start: string | null; // null when already on next week (max one week ahead)
  sessions: SessionView[];
};

// ==========================================
// 6. Match views
// ==========================================

export type TeamWithPlayers = Team & {
  player1: Player;
  player2: Player | null;
};

export type MatchDetail = Match & {
  club: Pick<Club, 'id' | 'name' | 'slug'>;
  team1: TeamWithPlayers;
  team2: TeamWithPlayers;
  referee: Player | null;
};

// ==========================================
// 7. Profile and leaderboard
// The `user` part comes from the auth service, the rest from the club service.
// ==========================================

export type JoinedClub = {
  club: Club;
  member_id: number;
  role: MemberRole;
  joined_at: string;
};

// One finished match, seen from the profile owner.
export type UserHistoryMatch = {
  match_id: number;
  club_id: number;
  club_name: string;
  club_slug: string;
  mode: MatchMode;
  partner: Player | null; // doubles only
  opponents: Player[]; // 1 in singles, 2 in doubles
  result: 'W' | 'L';
  my_score: number;
  opponent_score: number;
  points_change: number;
  date: string;
};

export type UserClubRank = {
  club_id: number;
  club_name: string;
  club_slug: string;
  rank: number;
  points: number;
};

// GET /:slug/leaderboard
export type LeaderboardEntry = {
  rank: number;
  player: Player;
  points: number;
  wins: number;
  losses: number;
};

export type UserProfileStat = {
  total_matches: number;
  wins: number;
  losses: number;
  win_rate: number; // 0..1
  ladder_points: number;
  current_win_streak: number;
  best_rank: UserClubRank | null;
};

export type UserProfileData = {
  user: User;
  stats: UserProfileStat;
  joined_clubs: JoinedClub[];
  achievements: Achievement[];
  history: UserHistoryMatch[];
  club_ranks: UserClubRank[];
};

// ==========================================
// 8. Request bodies and queries
// ==========================================

// POST /clubs/:slug/sessions
// Adds a weekly slot, with sessions for this week (if not ended) and next week.
export type CreateSessionBody = {
  weekday: WeekDay;
  start_time: string; // "HH:mm"
  end_time: string; // "HH:mm", earlier than start_time = ends the next day
  title?: string | null;
  location?: string | null;
  capacity: number;
  week_start?: string; // optional, "YYYY-MM-DD", the Monday of the week to create the session for. If not provided, defaults to the current week.
  repeat_weekly?: boolean; // false (default) = this week only, true = also next weeks
};

// PATCH /clubs/:slug/sessions/:sessionId
export type UpdateSessionBody = {
  start_time?: string; // "HH:mm", send together with end_time
  end_time?: string; // "HH:mm", earlier than start_time = ends the next day
  title?: string | null;
  location?: string | null;
  capacity?: number; // not below the bookings of any affected session
  apply_to_future?: boolean; // false (default) = this session only, true = also later sessions and the weekly plan
};

// DELETE /clubs/:slug/sessions/:sessionId?apply_to_future=true|false
export type DeleteSessionQuery = {
  apply_to_future?: boolean; // false (default) = cancel this session only, true = also stop the weekly slot
};

// POST /clubs/:slug/matches/request
export type MatchRequestBody = {
  mode: MatchMode;
  partner_id?: number; // member id, required for doubles
  opponent_ids: number[]; // member ids, 1 for singles, 2 for doubles
  requested_ref_id: number; // member id
  scheduled_at: string; // must be in the future
};