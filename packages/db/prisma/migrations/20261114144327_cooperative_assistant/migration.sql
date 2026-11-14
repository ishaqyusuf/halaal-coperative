-- CreateEnum
CREATE TYPE "AssistantChannel" AS ENUM ('web', 'native', 'whatsapp', 'telegram');

-- CreateEnum
CREATE TYPE "AssistantMessageRole" AS ENUM ('user', 'assistant');

-- CreateEnum
CREATE TYPE "AssistantTurnStatus" AS ENUM ('running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "AssistantProposalStatus" AS ENUM ('collecting', 'review', 'confirmed', 'cancelled', 'expired', 'refused');

-- CreateEnum
CREATE TYPE "AssistantChannelLinkStatus" AS ENUM ('pending', 'active', 'revoked');

-- CreateEnum
CREATE TYPE "AssistantChannelChallengeStatus" AS ENUM ('issued', 'claimed', 'confirmed', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "AssistantChannelInboxState" AS ENUM ('received', 'processing', 'done', 'failed', 'ignored');

-- CreateEnum
CREATE TYPE "AssistantChannelOutboxState" AS ENUM ('pending', 'sending', 'sent', 'failed', 'unknown');

-- CreateTable
CREATE TABLE "assistant_conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "channel" "AssistantChannel" NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New chat',
    "last_message_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "assistant_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" "AssistantMessageRole" NOT NULL,
    "parts" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_turns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "request_id" TEXT NOT NULL,
    "status" "AssistantTurnStatus" NOT NULL DEFAULT 'running',
    "capability_id" TEXT,
    "user_message_id" UUID,
    "reply_message_id" UUID,
    "provider" TEXT,
    "model" TEXT,
    "error_code" TEXT,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "assistant_turns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_proposals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "capability_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "status" "AssistantProposalStatus" NOT NULL DEFAULT 'collecting',
    "fields" JSONB NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "confirmation_key" TEXT,
    "confirmed_revision" INTEGER,
    "result" JSONB,
    "result_reference" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "assistant_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_channel_challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "provider" "AssistantChannel" NOT NULL,
    "nonce_digest" TEXT NOT NULL,
    "status" "AssistantChannelChallengeStatus" NOT NULL DEFAULT 'issued',
    "provider_account_digest" TEXT,
    "provider_account_masked" TEXT,
    "provider_chat_id" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "claimed_at" TIMESTAMPTZ(6),
    "confirmed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_channel_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_channel_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "provider" "AssistantChannel" NOT NULL,
    "provider_account_digest" TEXT NOT NULL,
    "provider_account_masked" TEXT NOT NULL,
    "provider_chat_id" TEXT NOT NULL,
    "conversation_id" UUID,
    "status" "AssistantChannelLinkStatus" NOT NULL DEFAULT 'active',
    "confirmed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "assistant_channel_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_channel_inbox" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "environment" TEXT NOT NULL,
    "provider" "AssistantChannel" NOT NULL,
    "endpoint_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "provider_chat_id" TEXT NOT NULL,
    "link_id" UUID,
    "payload" JSONB NOT NULL,
    "state" "AssistantChannelInboxState" NOT NULL DEFAULT 'received',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error_code" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "assistant_channel_inbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_channel_outbox" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" "AssistantChannel" NOT NULL,
    "provider_chat_id" TEXT NOT NULL,
    "link_id" UUID,
    "inbox_id" UUID,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,
    "state" "AssistantChannelOutboxState" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "provider_message_id" TEXT,
    "error_code" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(6),

    CONSTRAINT "assistant_channel_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assistant_conversations_owner_recent_idx" ON "assistant_conversations"("tenant_id", "user_id", "membership_id", "channel", "last_message_at");

-- CreateIndex
CREATE INDEX "assistant_messages_conversation_created_idx" ON "assistant_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "assistant_turns_conversation_status_idx" ON "assistant_turns"("conversation_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_turns_conversation_request_key" ON "assistant_turns"("conversation_id", "request_id");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_proposals_confirmation_key_key" ON "assistant_proposals"("confirmation_key");

-- CreateIndex
CREATE INDEX "assistant_proposals_actor_status_idx" ON "assistant_proposals"("tenant_id", "actor_user_id", "status");

-- CreateIndex
CREATE INDEX "assistant_proposals_conversation_created_idx" ON "assistant_proposals"("conversation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_channel_challenges_nonce_digest_key" ON "assistant_channel_challenges"("nonce_digest");

-- CreateIndex
CREATE INDEX "assistant_channel_challenges_owner_idx" ON "assistant_channel_challenges"("tenant_id", "user_id", "provider", "status");

-- CreateIndex
CREATE INDEX "assistant_channel_links_account_status_idx" ON "assistant_channel_links"("provider", "provider_account_digest", "status");

-- CreateIndex
CREATE INDEX "assistant_channel_links_owner_idx" ON "assistant_channel_links"("tenant_id", "user_id", "provider", "status");

-- CreateIndex
CREATE INDEX "assistant_channel_inbox_chat_state_idx" ON "assistant_channel_inbox"("provider", "provider_chat_id", "state", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_channel_inbox_event_key" ON "assistant_channel_inbox"("environment", "provider", "endpoint_id", "event_id");

-- CreateIndex
CREATE INDEX "assistant_channel_outbox_state_idx" ON "assistant_channel_outbox"("state", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_channel_outbox_inbox_sequence_key" ON "assistant_channel_outbox"("inbox_id", "sequence");

-- AddForeignKey
ALTER TABLE "assistant_conversations" ADD CONSTRAINT "assistant_conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_conversations" ADD CONSTRAINT "assistant_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_messages" ADD CONSTRAINT "assistant_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "assistant_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_turns" ADD CONSTRAINT "assistant_turns_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "assistant_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_proposals" ADD CONSTRAINT "assistant_proposals_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "assistant_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_channel_challenges" ADD CONSTRAINT "assistant_channel_challenges_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_channel_links" ADD CONSTRAINT "assistant_channel_links_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_channel_inbox" ADD CONSTRAINT "assistant_channel_inbox_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "assistant_channel_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_channel_outbox" ADD CONSTRAINT "assistant_channel_outbox_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "assistant_channel_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_channel_outbox" ADD CONSTRAINT "assistant_channel_outbox_inbox_id_fkey" FOREIGN KEY ("inbox_id") REFERENCES "assistant_channel_inbox"("id") ON DELETE SET NULL ON UPDATE CASCADE;
