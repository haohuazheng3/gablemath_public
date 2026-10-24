// Scheduled dataset refresh entry point (run by .github/workflows/refresh-data.yml).
// Each refresher fetches its public source, validates it, and rewrites a JSON file under src/data
// only when the content actually changed. A failed refresher fails the job loudly (GitHub emails
// the owner) and leaves the previous data in place.
import { refreshers } from "./lib/refresh-registry";
import "./refreshers";

async function main() {
  let failed = 0;
  for (const r of refreshers) {
    try {
      const res = await r.run();
      console.log(`[${r.name}] ${res.changed ? "UPDATED" : "unchanged"} — ${res.detail}`);
    } catch (err) {
      failed++;
      console.error(`[${r.name}] FAILED`, err);
    }
  }
  if (!refreshers.length) console.log("No refreshers registered.");
  if (failed) process.exit(1);
}

void main();
