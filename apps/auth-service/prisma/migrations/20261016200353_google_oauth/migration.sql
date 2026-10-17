-- CreateTable
CREATE TABLE "identities" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "identities_user_id_idx" ON "identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "identities_provider_subject_key" ON "identities"("provider", "subject");

-- AddForeignKey
ALTER TABLE "identities" ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
