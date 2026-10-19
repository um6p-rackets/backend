import { IsNumberString } from "class-validator";
import { ClubSlugParamDto } from "./club-slug-param.dto.js";



export class GetMatchParamDto  extends ClubSlugParamDto {
  @IsNumberString({}, {message: 'match id must be a number string'})
  match_id: string;
}