-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('queued', 'sent', 'failed');

-- CreateTable
CREATE TABLE "notification_outbox" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "notification_type" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body_text" TEXT NOT NULL,
    "action_label" TEXT NOT NULL,
    "action_url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "message_id" TEXT,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "metadata" JSONB,
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_outbox_tenant_status_created_at_idx" ON "notification_outbox"("tenant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "notification_outbox_recipient_created_at_idx" ON "notification_outbox"("recipient", "created_at");

-- CreateIndex
CREATE INDEX "notification_outbox_type_created_at_idx" ON "notification_outbox"("notification_type", "created_at");

-- AddForeignKey
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
