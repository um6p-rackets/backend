/*
  Warnings:

  - You are about to drop the column `entity_id` on the `notifications` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[event_id]` on the table `notifications` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `event_id` to the `notifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "entity_id",
ADD COLUMN     "event_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "notifications_event_id_key" ON "notifications"("event_id");
