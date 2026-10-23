import { User } from "../auth/auth.types.js";

export type UserProfile = {
    user: User;
    memberProfile: UserProfileData | null;
}