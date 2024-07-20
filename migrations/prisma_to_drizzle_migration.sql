-- Start a transaction
BEGIN;

-- First, drop all foreign key constraints
ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_tokenId_fkey";
ALTER TABLE "LiquidityEvent" DROP CONSTRAINT IF EXISTS "LiquidityEvent_tokenId_fkey";

-- Now drop primary key constraints
ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_pkey";
ALTER TABLE "Token" DROP CONSTRAINT IF EXISTS "Token_pkey";
ALTER TABLE "LiquidityEvent" DROP CONSTRAINT IF EXISTS "LiquidityEvent_pkey";

-- Drop indexes (if they exist)
DROP INDEX IF EXISTS "Transaction_tokenId_type_timestamp_idx";
DROP INDEX IF EXISTS "Transaction_txHash_idx";
DROP INDEX IF EXISTS "Token_address_idx";
DROP INDEX IF EXISTS "Token_address_createdAt_idx";
DROP INDEX IF EXISTS "Token_createdAt_idx";
DROP INDEX IF EXISTS "LiquidityEvent_tokenId_timestamp_idx";
DROP INDEX IF EXISTS "LiquidityEvent_txHash_idx";

-- Add new UUID columns with Drizzle's expected default
ALTER TABLE "Transaction" ADD COLUMN new_id UUID DEFAULT gen_random_uuid();
ALTER TABLE "Token" ADD COLUMN new_id UUID DEFAULT gen_random_uuid();
ALTER TABLE "LiquidityEvent" ADD COLUMN new_id UUID DEFAULT gen_random_uuid();

-- Copy data from old columns to new columns
UPDATE "Transaction" SET new_id = id::uuid;
UPDATE "Token" SET new_id = id::uuid;
UPDATE "LiquidityEvent" SET new_id = id::uuid;

-- Update foreign key references for Transaction table
ALTER TABLE "Transaction" ADD COLUMN new_tokenId UUID;

UPDATE "Transaction" t
SET new_tokenId = tk.new_id
FROM "Token" tk
WHERE t."tokenId" = tk.id::text;

-- Update foreign key references for LiquidityEvent table
ALTER TABLE "LiquidityEvent" ADD COLUMN new_tokenId UUID;

UPDATE "LiquidityEvent" le
SET new_tokenId = tk.new_id
FROM "Token" tk
WHERE le."tokenId" = tk.id::text;

-- Drop old columns and rename new columns
ALTER TABLE "Transaction" DROP COLUMN id, DROP COLUMN "tokenId";
ALTER TABLE "Transaction" RENAME COLUMN new_id TO id;
ALTER TABLE "Transaction" RENAME COLUMN new_tokenId TO "tokenId";

ALTER TABLE "Token" DROP COLUMN id;
ALTER TABLE "Token" RENAME COLUMN new_id TO id;

ALTER TABLE "LiquidityEvent" DROP COLUMN id, DROP COLUMN "tokenId";
ALTER TABLE "LiquidityEvent" RENAME COLUMN new_id TO id;
ALTER TABLE "LiquidityEvent" RENAME COLUMN new_tokenId TO "tokenId";

-- Set the new id columns as primary keys
ALTER TABLE "Transaction" ADD PRIMARY KEY (id);
ALTER TABLE "Token" ADD PRIMARY KEY (id);
ALTER TABLE "LiquidityEvent" ADD PRIMARY KEY (id);

-- Add back the foreign key constraints
ALTER TABLE "Transaction" 
  ADD CONSTRAINT "Transaction_tokenId_fkey" 
  FOREIGN KEY ("tokenId") REFERENCES "Token"(id);

ALTER TABLE "LiquidityEvent" 
  ADD CONSTRAINT "LiquidityEvent_tokenId_fkey" 
  FOREIGN KEY ("tokenId") REFERENCES "Token"(id);

-- Ensure all columns are NOT NULL where appropriate
ALTER TABLE "Transaction" 
  ALTER COLUMN "tokenId" SET NOT NULL,
  ALTER COLUMN type SET NOT NULL,
  ALTER COLUMN "senderAddress" SET NOT NULL,
  ALTER COLUMN "recipientAddress" SET NOT NULL,
  ALTER COLUMN "ethAmount" SET NOT NULL,
  ALTER COLUMN "tokenAmount" SET NOT NULL,
  ALTER COLUMN "txHash" SET NOT NULL,
  ALTER COLUMN timestamp SET NOT NULL,
  ALTER COLUMN "tokenPrice" SET NOT NULL;

ALTER TABLE "Token"
  ALTER COLUMN address SET NOT NULL,
  ALTER COLUMN "creatorAddress" SET NOT NULL,
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN symbol SET NOT NULL,
  ALTER COLUMN logo SET NOT NULL,
  ALTER COLUMN description SET NOT NULL,
  ALTER COLUMN "createdAt" SET NOT NULL,
  ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "LiquidityEvent"
  ALTER COLUMN "tokenId" SET NOT NULL,
  ALTER COLUMN "ethAmount" SET NOT NULL,
  ALTER COLUMN "tokenAmount" SET NOT NULL,
  ALTER COLUMN "txHash" SET NOT NULL,
  ALTER COLUMN timestamp SET NOT NULL;

-- Recreate indexes
CREATE INDEX "Transaction_tokenId_type_timestamp_idx" ON "Transaction" ("tokenId", type, timestamp);
CREATE UNIQUE INDEX "Transaction_txHash_idx" ON "Transaction" ("txHash");

CREATE UNIQUE INDEX "Token_address_idx" ON "Token" (address);
CREATE INDEX "Token_address_createdAt_idx" ON "Token" (address, "createdAt");
CREATE INDEX "Token_createdAt_idx" ON "Token" ("createdAt");

CREATE INDEX "LiquidityEvent_tokenId_timestamp_idx" ON "LiquidityEvent" ("tokenId", timestamp);
CREATE UNIQUE INDEX "LiquidityEvent_txHash_idx" ON "LiquidityEvent" ("txHash");

-- Commit the transaction
COMMIT;