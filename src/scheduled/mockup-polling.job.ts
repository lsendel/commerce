import { createDb } from "../infrastructure/db/client";
import type { Env } from "../env";
import { generationJobs } from "../infrastructure/db/schema";
import { eq } from "drizzle-orm";

export async function runMockupPolling(env: Env) {
  const db = createDb(env.DATABASE_URL);

  // Find all generation jobs stuck in "processing" for mockup polling
  const processingJobs = await db
    .select()
    .from(generationJobs)
    .where(eq(generationJobs.status, "processing"));

  if (processingJobs.length === 0) return { polled: 0 };

  let updated = 0;
  for (const job of processingJobs) {
    // Poll Printful mockup API for status
    // If complete, update job with output URLs
    // If failed, mark as failed
    // Actual Printful polling depends on task ID storage
    console.log(`[mockup-polling] Checking job ${job.id}, status: ${job.status}`);
    updated++;
  }

  return { polled: updated };
}
