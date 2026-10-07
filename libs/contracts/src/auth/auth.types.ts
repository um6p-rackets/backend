export interface UserView {
  userId: string;
  login: string;
  firstName: string;
  lastName: string;
  gender: boolean;
  department: string;
  phoneNumber: string;
  email: string;
  avatar: string;
  joinedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
	user: UserView;
}

export interface JwtPayload {
	sub: string;	// (*Subject*): Unique identifier for the user.
	login: string;	
	iat?: number;	// (*Issued At*): Unix timestamp of when the token was created.
	exp?: number;	// (*Expiration Time*): Unix timestamp when the token expires.
}

export interface RefreshPayload {
	refreshToken: string,
	iat?: number;
	exp?: number;
}

export interface LogoutPayload {
	userId: string;
	refreshToken: string
}

export interface GetUserPayload {
	userId: string;
}

export interface GetUsersByIdsPayload {
	userIds: string[];
}

