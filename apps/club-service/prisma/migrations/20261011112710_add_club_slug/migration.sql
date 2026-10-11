/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `clubs` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `clubs` table without a default value. This is not possible if the table is not empty.

*/
ALTER TABLE "clubs" ADD COLUMN "slug" VARCHAR(255);
UPDATE "clubs" SET "slug" = lower(replace("name", ' ', '-'));
ALTER TABLE "clubs" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "clubs_slug_key" ON "clubs"("slug");
