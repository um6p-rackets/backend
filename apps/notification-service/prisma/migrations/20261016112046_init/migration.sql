-- CreateTable
CREATE TABLE "notifications" (
    "id" BIGSERIAL NOT NULL,
    "sender_type" INTEGER NOT NULL,
    "sender_id" BIGINT,
    "category" INTEGER NOT NULL,
    "club_id" BIGINT,
    "entity_id" BIGINT,
    "dedupe_key" TEXT,
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_receivers" (
    "id" BIGSERIAL NOT NULL,
    "notification_id" BIGINT NOT NULL,
    "receiver_user_id" BIGINT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ,

    CONSTRAINT "notification_receivers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");

-- CreateIndex
CREATE INDEX "notification_receivers_receiver_user_id_id_idx" ON "notification_receivers"("receiver_user_id", "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "notification_receivers_notification_id_receiver_user_id_key" ON "notification_receivers"("notification_id", "receiver_user_id");

-- AddForeignKey
ALTER TABLE "notification_receivers" ADD CONSTRAINT "notification_receivers_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
