import fs from "fs";
import path from "path";

function isPostgresEnabled(): boolean {
  // Vercel Postgres typically provides POSTGRES_URL; @vercel/postgres reads it.
  return Boolean(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.VERCEL_POSTGRES_URL);
}

let kvInitPromise: Promise<void> | null = null;
let sqlModule: { sql: any } | null = null;
let postgresAvailable: boolean | null = null;

async function getSql() {
  if (postgresAvailable === false) {
    return null as any;
  }
  if (!sqlModule) {
    try {
      sqlModule = await import("@vercel/postgres");
      postgresAvailable = true;
    } catch (error) {
      postgresAvailable = false;
      // Return null to indicate postgres is not available, will fall back to file system
      return null as any;
    }
  }
  return sqlModule.sql;
}

async function ensureKvTable(): Promise<void> {
  if (!isPostgresEnabled()) return;
  if (!kvInitPromise) {
    kvInitPromise = (async () => {
      const sql = await getSql();
      if (!sql) {
        // Postgres not available, will use file fallback
        return;
      }
      await sql`
        create table if not exists xom3_kv (
          k text primary key,
          v jsonb not null,
          updated_at timestamptz not null default now()
        );
      `;
    })();
  }
  return kvInitPromise;
}

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function filePath(fileName: string): string {
  ensureDataDir();
  return path.join(DATA_DIR, fileName);
}

export async function loadJson<T>(opts: {
  /** Stable key for Postgres */
  key: string;
  /** File fallback name */
  fileName: string;
  /** Default value if nothing exists */
  fallback: T;
}): Promise<T> {
  const { key, fileName, fallback } = opts;

  if (isPostgresEnabled()) {
    await ensureKvTable();
    const sql = await getSql();
    if (sql) {
      try {
        const res = await sql<{ v: T }>`select v from xom3_kv where k = ${key}`;
        if (res.rows.length > 0) return res.rows[0]!.v;
      } catch {
        // Postgres failed, fall through to file system
      }
    }
  }

  // File fallback (local dev / demos)
  try {
    const fp = filePath(fileName);
    if (fs.existsSync(fp)) {
      const raw = fs.readFileSync(fp, "utf8");
      return JSON.parse(raw) as T;
    }
  } catch {
    // best-effort
  }
  return fallback;
}

export async function saveJson(opts: {
  key: string;
  fileName: string;
  value: unknown;
}): Promise<void> {
  const { key, fileName, value } = opts;

  if (isPostgresEnabled()) {
    await ensureKvTable();
    const sql = await getSql();
    if (sql) {
      try {
        await sql`
          insert into xom3_kv (k, v)
          values (${key}, ${value as any})
          on conflict (k) do update set v = excluded.v, updated_at = now();
        `;
        return;
      } catch {
        // Postgres failed, fall through to file system
      }
    }
  }

  // File fallback
  try {
    const fp = filePath(fileName);
    fs.writeFileSync(fp, JSON.stringify(value, null, 2));
  } catch {
    // best-effort
  }
}
