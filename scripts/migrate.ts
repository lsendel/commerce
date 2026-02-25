import "dotenv/config";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { createDb } from "../src/infrastructure/db/client";

async function main() {
  const db = createDb(process.env.DATABASE_URL!);
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./src/infrastructure/db/migrations" });
  console.log("Migrations complete.");
}

main().catch(console.error);
