CREATE TABLE IF NOT EXISTS "Chain" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256) NOT NULL,
	CONSTRAINT "Chain_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "Token" DROP CONSTRAINT "Token_address_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "Token_address_createdAt_idx";--> statement-breakpoint
ALTER TABLE "LiquidityEvent" ADD COLUMN "chain" varchar(256) NOT NULL;--> statement-breakpoint
ALTER TABLE "Token" ADD COLUMN "chain" varchar(256) NOT NULL;--> statement-breakpoint
ALTER TABLE "Transaction" ADD COLUMN "chain" varchar(256) NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "LiquidityEvent" ADD CONSTRAINT "LiquidityEvent_chain_Chain_name_fk" FOREIGN KEY ("chain") REFERENCES "public"."Chain"("name") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Token" ADD CONSTRAINT "Token_chain_Chain_name_fk" FOREIGN KEY ("chain") REFERENCES "public"."Chain"("name") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_chain_Chain_name_fk" FOREIGN KEY ("chain") REFERENCES "public"."Chain"("name") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "LiquidityEvent_chain_idx" ON "LiquidityEvent" USING btree ("chain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Token_chain_address_idx" ON "Token" USING btree ("chain","address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Transaction_chain_idx" ON "Transaction" USING btree ("chain");