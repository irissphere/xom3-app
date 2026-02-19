import { test, expect } from "@playwright/test";

const n8nBase = (process.env.N8N_BASE_URL ?? "http://localhost:5678").replace(/\/$/, "");
const basicAuthUser = process.env.N8N_BASIC_AUTH_USER ?? "";
const basicAuthPass = process.env.N8N_BASIC_AUTH_PASSWORD ?? "";

function basicAuthHeader(user: string, pass: string): string | undefined {
  if (!user || !pass) return undefined;
  const token = Buffer.from(`${user}:${pass}`).toString("base64");
  return `Basic ${token}`;
}

test.describe("n8n local smoke", () => {
  test("health endpoint responds", async ({ request }) => {
    const res = await request.get(`${n8nBase}/healthz`);
    expect(res.ok()).toBeTruthy();
  });

  test("webhook endpoint responds (requires a workflow at /webhook/test)", async ({ request }) => {
    const url = `${n8nBase}/webhook/test`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const auth = basicAuthHeader(basicAuthUser, basicAuthPass);
    if (auth) headers["Authorization"] = auth;

    const res = await request.post(url, {
      headers,
      data: { ping: "pong" },
    });

    // Most webhook workflows respond 200. Allow 201 for custom flows.
    expect([200, 201]).toContain(res.status());
  });
});
