// Copies of third-party assets match assets/kenney/SOURCE.md byte for byte (ADR 0008).
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dir = path.resolve(import.meta.dirname, "..", "assets", "kenney");
const SOURCE = "SOURCE.md";

function listed(): Map<string, string> {
  const rows = new Map<string, string>();
  const text = readFileSync(path.join(dir, SOURCE), "utf8");
  for (const match of text.matchAll(/^\|\s*([^|]+?)\s*\|\s*([0-9a-f]{64})\s*\|\s*$/gm)) {
    const [, file, hash] = match;
    if (file && hash) rows.set(file, hash);
  }
  return rows;
}

function onDisk(): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)))
    .map((rel) => rel.split(path.sep).join("/"))
    .filter((rel) => rel !== SOURCE)
    .sort();
}

const sha256 = (file: string) =>
  createHash("sha256")
    .update(readFileSync(path.join(dir, file)))
    .digest("hex");

describe("assets/kenney (ADR 0008)", () => {
  const rows = listed();

  it("lists files in SOURCE.md", () => {
    expect(rows.size).toBeGreaterThan(0);
  });

  it("has exactly the files listed in SOURCE.md", () => {
    expect(onDisk()).toEqual([...rows.keys()].sort());
  });

  it("matches every SHA-256 in SOURCE.md (missing files fail the test above)", () => {
    const present = new Set(onDisk());
    const mismatched = [...rows]
      .filter(([file]) => present.has(file))
      .filter(([file, hash]) => sha256(file) !== hash)
      .map(([file]) => file);
    expect(mismatched).toEqual([]);
  });
});
