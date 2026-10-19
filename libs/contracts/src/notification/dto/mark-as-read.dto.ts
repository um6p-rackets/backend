import { IsNotEmpty, IsNumber } from 'class-validator';

export class MarkAsReadDto {
  @IsNumber()
  @IsNotEmpty()
  notification_id: number;
}
