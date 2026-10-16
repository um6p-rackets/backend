import { IsNumberString } from 'class-validator';
import { ClubSlugParamDto } from './index.js';

export class UpdateMemberRoleParamDto extends ClubSlugParamDto {
  @IsNumberString({}, {message: 'member_id must be a number string'})
  member_id: string;
}
