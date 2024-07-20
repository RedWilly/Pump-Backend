CREATE TABLE IF NOT EXISTS "LiquidityEvent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tokenId" uuid NOT NULL,
	"ethAmount" varchar(256) NOT NULL,
	"tokenAmount" varchar(256) NOT NULL,
	"txHash" varchar(256) NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	CONSTRAINT "LiquidityEvent_txHash_unique" UNIQUE("txHash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" varchar(256) NOT NULL,
	"creatorAddress" varchar(256) NOT NULL,
	"name" varchar(256) NOT NULL,
	"symbol" varchar(256) NOT NULL,
	"logo" varchar(256) NOT NULL,
	"description" varchar(1000) NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	"website" varchar(256),
	"telegram" varchar(256),
	"discord" varchar(256),
	"twitter" varchar(256),
	"youtube" varchar(256),
	CONSTRAINT "Token_address_unique" UNIQUE("address")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tokenId" uuid NOT NULL,
	"type" varchar(256) NOT NULL,
	"senderAddress" varchar(256) NOT NULL,
	"recipientAddress" varchar(256) NOT NULL,
	"ethAmount" varchar(256) NOT NULL,
	"tokenAmount" varchar(256) NOT NULL,
	"txHash" varchar(256) NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"tokenPrice" varchar(256) NOT NULL,
	CONSTRAINT "Transaction_txHash_unique" UNIQUE("txHash")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "LiquidityEvent_tokenId_timestamp_idx" ON "LiquidityEvent" USING btree ("tokenId","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "LiquidityEvent_txHash_idx" ON "LiquidityEvent" USING btree ("txHash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Token_address_idx" ON "Token" USING btree ("address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Token_address_createdAt_idx" ON "Token" USING btree ("address","createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Token_createdAt_idx" ON "Token" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Transaction_tokenId_type_timestamp_idx" ON "Transaction" USING btree ("tokenId","type","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Transaction_txHash_idx" ON "Transaction" USING btree ("txHash");