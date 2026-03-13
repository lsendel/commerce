import { spawnSync } from "node:child_process";

function runCommand(
  label: string,
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  });

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.error) {
    throw result.error;
  }
}

const env = { ...process.env };
if (!env.SMOKE_BASE_URL?.trim() && !env.SMOKE_MATRIX_SKIP_HTTP?.trim()) {
  env.SMOKE_MATRIX_SKIP_HTTP = "true";
}

console.log(
  env.SMOKE_MATRIX_SKIP_HTTP === "true"
    ? "Smoke mode: contract-only matrix (SMOKE_BASE_URL not set)."
    : `Smoke mode: live matrix against ${env.SMOKE_BASE_URL}.`,
);

runCommand("Typecheck", "pnpm", ["typecheck"], env);
runCommand("Route Integrity", "pnpm", ["check:routes"], env);
runCommand("Smoke Matrix", "pnpm", ["smoke:e2e-matrix"], env);
