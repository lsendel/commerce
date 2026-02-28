ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_sub" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "apple_sub" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_google_sub_unique" ON "users" ("google_sub");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_apple_sub_unique" ON "users" ("apple_sub");
