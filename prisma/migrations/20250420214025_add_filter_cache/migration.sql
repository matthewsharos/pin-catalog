-- CreateTable
CREATE TABLE "FilterCache" (
    "id" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilterCache_pkey" PRIMARY KEY ("id")
);
