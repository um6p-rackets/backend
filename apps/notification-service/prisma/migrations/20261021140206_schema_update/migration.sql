/*
  Warnings:

  - You are about to drop the column `dedupe_key` on the `notifications` table. All the data in the column will be lost.
  - Added the required column `type` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `sender_type` on the `notifications` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `category` on the `notifications` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('SYSTEM', 'USER');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('CLUB', 'USER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('JOIN_REQUESTED', 'JOIN_ACCEPTED', 'JOIN_REJECTED', 'CLUB_ANNOUNCEMENT');

-- DropIndex
DROP INDEX "notifications_dedupe_key_key";

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "dedupe_key",
ADD COLUMN     "type" "NotificationType" NOT NULL,
DROP COLUMN "sender_type",
ADD COLUMN     "sender_type" "SenderType" NOT NULL,
DROP COLUMN "category",
ADD COLUMN     "category" "NotificationCategory" NOT NULL;

-- CreateIndex
CREATE INDEX "notification_receivers_receiver_user_id_is_read_idx" ON "notification_receivers"("receiver_user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_category_id_idx" ON "notifications"("category", "id" DESC);

-- CreateIndex
CREATE INDEX "notifications_club_id_id_idx" ON "notifications"("club_id", "id" DESC);
