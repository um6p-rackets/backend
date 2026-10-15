/*
  Warnings:

  - Changed the type of `start_time` on the `session_templates` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "session_templates" DROP COLUMN "start_time",
ADD COLUMN     "start_time" VARCHAR(5) NOT NULL;
