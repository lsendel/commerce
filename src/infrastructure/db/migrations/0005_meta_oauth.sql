ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "meta_sub" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_meta_sub_unique" ON "users" ("meta_sub");
