// List the Search Console properties the service account can see (sanity check for GSC access).
import { googleAccessToken } from "../src/lib/google";

async function main() {
  const t = await googleAccessToken(["https://www.googleapis.com/auth/webmasters"]);
  const r = await fetch("https://searchconsole.googleapis.com/webmasters/v3/sites", { headers: { authorization: `Bearer ${t}` } });
  const d = (await r.json()) as { siteEntry?: { siteUrl: string; permissionLevel: string }[] };
  console.log(JSON.stringify((d.siteEntry ?? []).filter((s) => s.siteUrl.includes("gablemath"))));
}
void main();
