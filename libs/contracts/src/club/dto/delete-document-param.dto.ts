import { IsNumberString } from "class-validator";
import { ClubSlugParamDto } from "./club-slug-param.dto.js";


export class DeleteDocumentParamDto  extends ClubSlugParamDto {
  @IsNumberString({}, {message: 'document_id must be a number string'})
  document_id: string;
}