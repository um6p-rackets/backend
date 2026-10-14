export type User = {
  id: number; // bigserial PK
  login: string; // varchar(255) UNIQUE
  first_name: string; // varchar(255)
  last_name: string; // varchar(255)
  gender: boolean | null; // boolean
  department: string | null; // text
  phone_number: string | null; // varchar(50)
  email: string; // varchar(255) UNIQUE
  avatar: string | null; // text
  joined_at: string; // timestamptz
};

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthResult extends AuthTokens {
  user: User;
}

export interface JwtPayload {
  sub: string; // (*Subject*): Unique identifier for the user.
  login: string;
  iat?: number; // (*Issued At*): Unix timestamp of when the token was created.
  exp?: number; // (*Expiration Time*): Unix timestamp when the token expires.
}

export interface RefreshPayload {
  refresh_token: string;
  iat?: number;
  exp?: number;
}

export interface LogoutPayload {
  userId: string;
  refresh_token: string;
}

export interface GetUserPayload {
  user_id: string;
}

export interface GetUsersByIdsPayload {
  user_ids: string[];
}
