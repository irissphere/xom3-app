import type { MemoryEpoch } from "./types";

const MAX_EPOCHS = 5000;

export class MemoryStore<T> {
  private name: string | null;
  private epochs: MemoryEpoch<T>[] = [];

  constructor(name?: string) {
    this.name = typeof name === "string" && name.length > 0 ? name : null;
    this.hydrateFromDiskBestEffort();
  }

  record(data: T) {
    this.epochs.push({ at: Date.now(), data });
    if (this.epochs.length > MAX_EPOCHS) {
      this.epochs.shift();
    }
    this.flushToDiskBestEffort();
  }

  getAll() {
    this.hydrateFromDiskBestEffort();
    return this.epochs;
  }

  private hydrateFromDiskBestEffort() {
    if (!this.name) return;
    // Avoid bundling fs for the browser.
    if (typeof window !== "undefined") return;
    try {
      const fs = require("fs") as typeof import("fs");
      const path = require("path") as typeof import("path");
      const dir = path.join(process.cwd(), ".xom3", "constellation-memory");
      const file = path.join(dir, `${this.name}.json`);
      if (!fs.existsSync(file)) return;
      const raw = fs.readFileSync(file, "utf8");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      // Only hydrate if disk has more data than memory (prevents overwriting hot memory with stale disk).
      if (parsed.length > this.epochs.length) {
        this.epochs = parsed.slice(-MAX_EPOCHS);
      }
    } catch {
      // ignore
    }
  }

  private flushToDiskBestEffort() {
    if (!this.name) return;
    if (typeof window !== "undefined") return;
    const g = globalThis as any;
    g.__xom3_memory_flush__ ??= {};
    const key = this.name;
    if (g.__xom3_memory_flush__[key]) return;
    g.__xom3_memory_flush__[key] = setTimeout(() => {
      try {
        const fs = require("fs") as typeof import("fs");
        const path = require("path") as typeof import("path");
        const dir = path.join(process.cwd(), ".xom3", "constellation-memory");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `${this.name}.json`);
        fs.writeFileSync(file, JSON.stringify(this.epochs.slice(-MAX_EPOCHS)));
      } catch {
        // ignore
      } finally {
        g.__xom3_memory_flush__[key] = null;
      }
    }, 250);
  }
}
