import { IsNumberString } from "class-validator";
import { ClubSlugParamDto } from "./club-slug-param.dto.js";



export class DeleteAchievementParamDto  extends ClubSlugParamDto {
  @IsNumberString({}, {message: 'achievement_id must be a number string'})
  achievement_id: string;
}