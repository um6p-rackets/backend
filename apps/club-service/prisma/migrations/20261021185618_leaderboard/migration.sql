-- CreateTable
CREATE TABLE "leaderboard" (
    "id" SERIAL NOT NULL,
    "club_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "total_matches" INTEGER NOT NULL DEFAULT 0,
    "win_streak" INTEGER NOT NULL DEFAULT 0,
    "best_win_streak" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leaderboard_club_id_points_wins_total_matches_idx" ON "leaderboard"("club_id", "points" DESC, "wins" DESC, "total_matches" DESC);

-- CreateIndex
CREATE INDEX "leaderboard_user_id_idx" ON "leaderboard"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_club_id_user_id_key" ON "leaderboard"("club_id", "user_id");

-- AddForeignKey
ALTER TABLE "leaderboard" ADD CONSTRAINT "leaderboard_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Checks all the individual "counter" columns
ALTER TABLE "leaderboard" ADD CONSTRAINT "check_points_positive" CHECK (points >= 0);
ALTER TABLE "leaderboard" ADD CONSTRAINT "check_wins_positive" CHECK (wins >= 0);
ALTER TABLE "leaderboard" ADD CONSTRAINT "check_losses_positive" CHECK (losses >= 0);
ALTER TABLE "leaderboard" ADD CONSTRAINT "check_total_matches_positive" CHECK (total_matches >= 0);
ALTER TABLE "leaderboard" ADD CONSTRAINT "check_win_streak_positive" CHECK (win_streak >= 0);
ALTER TABLE "leaderboard" ADD CONSTRAINT "check_best_win_streak_positive" CHECK (best_win_streak >= 0);