// create-session.dto.ts
import { IsEnum, Matches } from 'class-validator';
import { WeekDay } from '../club.types.js';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/; // "17:00" or "17:00:00"

export class CreateSessionDto {
  @IsEnum(WeekDay)
  day_of_week: WeekDay;

  @Matches(TIME_REGEX, { message: 'start_time must be HH:mm or HH:mm:ss' })
  start_time: string;

  @Matches(TIME_REGEX, { message: 'end_time must be HH:mm or HH:mm:ss' })
  end_time: string;
}