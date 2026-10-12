/*
  Warnings:

  - Added the required column `capacity` to the `week_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `week_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "week_sessions" ADD COLUMN     "capacity" INTEGER NOT NULL,
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "location" VARCHAR(100),
ADD COLUMN     "title" VARCHAR(100),
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL;

-- CreateIndex
CREATE INDEX "session_attends_session_id_attend_date_idx" ON "session_attends"("session_id", "attend_date");

-- CreateIndex
CREATE INDEX "session_attends_member_id_attend_date_idx" ON "session_attends"("member_id", "attend_date");

-- CreateIndex
CREATE INDEX "week_sessions_club_id_day_of_week_idx" ON "week_sessions"("club_id", "day_of_week");


ALTER TABLE "week_sessions"
  ADD CONSTRAINT "week_sessions_capacity_check" CHECK ("capacity" > 0);