import { createSign } from "node:crypto";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function serviceAccount(): ServiceAccount {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64;
  if (!b64) throw new Error("GOOGLE_SERVICE_ACCOUNT_B64 is not configured");
  return JSON.parse(Buffer.from(b64, "base64").toString("utf8")) as ServiceAccount;
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

/** OAuth access token for the service account (JWT bearer grant). */
export async function googleAccessToken(scopes: string[]): Promise<string> {
  const sa = serviceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: scopes.join(" "), aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const sig = b64url(signer.sign(sa.private_key));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claim}.${sig}` }),
  });
  const data = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!data.access_token) throw new Error(`Google token error: ${data.error} ${data.error_description ?? ""}`);
  return data.access_token;
}

export const GSC_PROPERTY = "sc-domain:gablemath.com";
