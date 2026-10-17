import { IsNumberString } from "class-validator";
import { ClubSlugParamDto } from "./club-slug-param.dto.js";


export class DeleteAnnouncementParamDto  extends ClubSlugParamDto {
  @IsNumberString({}, {message: 'announcement_id must be a number string'})
  announcement_id: string;
}