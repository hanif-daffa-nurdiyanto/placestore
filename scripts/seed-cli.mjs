import { spawnSync } from "node:child_process";

const allowedModes = new Set(["dry-run", "apply", "repair", "cleanup"]);
const mode = process.argv[2] ?? "dry-run";
const isProduction = process.argv.includes("--prod");
if (!allowedModes.has(mode)) {
  console.error(`Invalid seed mode: ${mode}`);
  process.exit(1);
}

if (
  isProduction &&
  process.env.CONFIRM_PRODUCTION_SEED !== "placestore-demo-v1"
) {
  console.error(
    "Production seed requires CONFIRM_PRODUCTION_SEED=placestore-demo-v1.",
  );
  process.exit(1);
}

const secret = process.env.SEED_SECRET;
if (!secret) {
  console.error("Set SEED_SECRET in the local shell before running the seeder.");
  process.exit(1);
}

const result = spawnSync(
  "npx",
  [
    "convex",
    "run",
    "seed:run",
    JSON.stringify({ secret, mode }),
    ...(isProduction ? ["--prod"] : []),
  ],
  { stdio: "inherit", shell: false },
);

process.exit(result.status ?? 1);
