const baseHeaders = () => {
  const headers = new Headers();
  if (process.env.N8N_API_KEY) {
    headers.set("X-N8N-API-KEY", process.env.N8N_API_KEY);
  }
  if (process.env.N8N_BASIC_AUTH_USER && process.env.N8N_BASIC_AUTH_PASSWORD) {
    const token = Buffer.from(`${process.env.N8N_BASIC_AUTH_USER}:${process.env.N8N_BASIC_AUTH_PASSWORD}`).toString("base64");
    headers.set("Authorization", `Basic ${token}`);
  }
  return headers;
};

export async function callN8n(path: string, init?: RequestInit) {
  const base = process.env.N8N_BASE_URL;
  if (!base) {
    throw new Error("N8N_BASE_URL is not configured");
  }
  const url = new URL(path, base);
  const headers = baseHeaders();
  if (init?.headers) {
    for (const [k, v] of Object.entries(init.headers as Record<string, string>)) {
      headers.set(k, v);
    }
  }
  const res = await fetch(url.toString(), { ...init, headers, cache: "no-store" });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json) {
    throw new Error(typeof json?.error === "string" ? json.error : res.statusText);
  }
  return json;
}







































