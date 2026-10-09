// ==========================================
// - timestamps are ISO strings
// - `date` columns are "YYYY-MM-DD", `time` columns are "HH:mm:ss"
// - IDs from another service are plain numbers
// ==========================================

import type { User } from '@app/contracts/auth/auth.types.js';

// ---------- CLUB service ----------

export type Club = {
  id: number; // bigserial PK
  name: string; // varchar(255) UNIQUE
  description: string | null; // text
  avatar: string | null; // text
  created_at: string; // timestamptz
};

export enum MemberRole {
  MEMBER = 0,
  LEADER = 1,
  COACH = 2,
}

export type Member = {
  id: number; // bigserial PK
  club_id: number; // bigint FK -> clubs.id
  user_id: number; // users.id (auth service)
  role: MemberRole; // int
  joined_at: string; // timestamptz
  left_at: string | null; // timestamptz, null = active member
};

export type Achievement = {
  id: number; // bigserial PK
  club_id: number; // bigint FK -> clubs.id
  user_id: number; // users.id (auth service)
  name: string; // varchar(255)
  description: string | null; // text
  taken_at: string; // timestamptz
};

export type Announcement = {
  id: number; // bigserial PK
  club_id: number; // bigint FK -> clubs.id
  announcer_id: number; // bigint FK -> members.id
  description: string; // text
  created_at: string; // timestamptz
};

export enum WeekDay {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

export type WeekSession = {
  id: number; // bigserial PK
  club_id: number; // bigint FK -> clubs.id
  day_of_week: WeekDay; // smallint 0-6
  start_time: string; // time, e.g. "17:00:00"
  end_time: string; // time, e.g. "19:00:00"
};

export type SessionAttend = {
  id: number; // bigserial PK
  session_id: number; // bigint FK -> week_sessions.id
  member_id: number; // bigint FK -> members.id
  attend_date: string; // date, e.g. "2026-10-05"
  created_at: string; // timestamptz
};

export type Team = {
  id: number; // bigserial PK
  club_id: number; // bigint FK -> clubs.id
  player1_id: number; // bigint FK -> members.id
  player2_id: number | null; // bigint FK -> members.id (null = singles)
  created_at: string; // timestamptz
};

export enum MatchMode {
  SINGLES = 1,
  DOUBLES = 2,
}

export enum MatchStatus {
  PENDING = 0, // requested, waiting for the referee
  CONFIRMED = 1, // accepted, not played yet (upcoming)
  FINISHED = 2, // result entered
}

export type Match = {
  id: number; // bigserial PK
  club_id: number; // bigint FK -> clubs.id
  team1_id: number; // bigint FK -> teams.id
  team2_id: number; // bigint FK -> teams.id
  winner_id: number | null; // bigint FK -> teams.id (only set when status = FINISHED)
  ref_id: number | null; // bigint FK -> members.id (null = no referee yet)
  team1_score: number; // int
  team2_score: number; // int
  team1_points: number; // int (ladder points change)
  team2_points: number; // int
  mode: MatchMode; // int
  status: MatchStatus; // smallint
  scheduled_at: string; // timestamptz
};

export type ClubDocument = {
  id: number; // bigserial PK
  club_id: number; // bigint FK -> clubs.id
  title: string; // varchar(255)
  description: string | null; // text
  path: string; // text (link to the document)
};

// ==========================================
// 2. View models (joined data returned by the API)
// Built by the backend because there are no cross-service joins.
// ==========================================

// Every paginated list returns this shape
export type Paginated<T> = {
  data: T[];
  page: number;
  limit: number;
  total: number;
};

export type ClubWithMembersCount = Club & { members_count: number };

// GET /:clubId/status, what the current user is in this club
export type ClubMemberStatus = {
  is_member: boolean;
  member_id: number | null; // null if not a member
  role: MemberRole | null; // null if not a member
  attended_session_ids: number[]; // today's sessions already checked in
};

// Small user card used inside other responses
export type UserSummary = Pick<
  User,
  'id' | 'login' | 'first_name' | 'last_name' | 'avatar' | 'department'
>;

// A club member with the user's info
export type MemberWithUser = Member & { user: UserSummary };

// A player in a team: a member + the user's info
export type Player = UserSummary & { member_id: number };

export type TeamWithPlayers = Team & {
  player1: Player;
  player2: Player | null;
};

export type MatchDetail = Match & {
  club: Pick<Club, 'id' | 'name'>;
  team1: TeamWithPlayers;
  team2: TeamWithPlayers;
  referee: Player | null;
};

export type AnnouncementWithAuthor = Announcement & { announcer: Player };

export type WeekSessionWithAttends = WeekSession & { attends_count: number };

// A club the user joined (replaces "favorite sport")
export type JoinedClub = {
  club: Club;
  member_id: number;
  role: MemberRole;
  joined_at: string;
};

// ==========================================
// 3. User profile page
// `user` comes from the auth service, everything else from the club service.
// ==========================================

// One finished match from the profile owner's point of view
export type UserHistoryMatch = {
  match_id: number;
  club_id: number;
  club_name: string; // clubs.name (the sport)
  mode: MatchMode;
  partner: Player | null; // doubles only
  opponents: Player[]; // 1 in singles, 2 in doubles
  result: 'W' | 'L'; // winner_id === user's team id
  my_score: number;
  opponent_score: number;
  points_change: number; // team points of the user's team
  date: string; // matches.scheduled_at
};

export type UserClubRank = {
  club_id: number;
  club_name: string;
  rank: number;
  points: number; // sum of points_change in this club
};

// One row of a club leaderboard (GET /:clubId/leaderboard)
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
  win_rate: number; // 0..1, format as % in the UI
  ladder_points: number; // sum of points_change across clubs
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
