CREATE TABLE "import_batches" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "created_by_user_id" UUID NOT NULL,
  "import_type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "total_rows" INTEGER NOT NULL DEFAULT 0,
  "valid_rows" INTEGER NOT NULL DEFAULT 0,
  "existing_match_count" INTEGER NOT NULL DEFAULT 0,
  "duplicate_row_count" INTEGER NOT NULL DEFAULT 0,
  "source_csv" TEXT NOT NULL,
  "applied_at" TIMESTAMPTZ(6),
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "import_batches"
  ADD CONSTRAINT "import_batches_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "import_batches"
  ADD CONSTRAINT "import_batches_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "import_batches_tenant_created_at_idx"
  ON "import_batches"("tenant_id", "created_at");

CREATE INDEX "import_batches_tenant_type_status_idx"
  ON "import_batches"("tenant_id", "import_type", "status");

CREATE TABLE "import_batch_rows" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "import_batch_id" UUID NOT NULL,
  "row_index" INTEGER NOT NULL,
  "primary_value" TEXT,
  "existing_match" BOOLEAN NOT NULL DEFAULT false,
  "duplicate_in_file" BOOLEAN NOT NULL DEFAULT false,
  "payload" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "import_batch_rows_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "import_batch_rows"
  ADD CONSTRAINT "import_batch_rows_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "import_batch_rows"
  ADD CONSTRAINT "import_batch_rows_import_batch_id_fkey"
  FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "import_batch_rows_tenant_batch_row_idx"
  ON "import_batch_rows"("tenant_id", "import_batch_id", "row_index");
