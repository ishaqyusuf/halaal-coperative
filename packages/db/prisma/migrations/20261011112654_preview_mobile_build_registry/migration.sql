-- CreateTable
CREATE TABLE "MobileBuildRegistry" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "MobileBuildRegistry_pkey" PRIMARY KEY ("key")
);
