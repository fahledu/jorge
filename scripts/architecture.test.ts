// Layer boundaries of ADR 0004. Lives outside src/domain so it does not flag itself.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const src = path.join(root, "src");

interface SourceFile {
  /** Path relative to src/, with forward slashes. */
  rel: string;
  /** Code without comments, so prose mentioning a forbidden name does not count. */
  code: string;
  imports: string[];
}

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

function importsOf(code: string): string[] {
  const found: string[] = [];
  const pattern =
    /(?:import|export)\s[^"'`]*?from\s*["']([^"']+)["']|import\s*\(?\s*["']([^"']+)["']/g;
  for (const match of code.matchAll(pattern)) {
    const spec = match[1] ?? match[2];
    if (spec) found.push(spec);
  }
  return found;
}

function readSources(dir: string): SourceFile[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && /\.ts$/.test(entry.name))
    .map((entry) => {
      const full = path.join(entry.parentPath, entry.name);
      const code = stripComments(readFileSync(full, "utf8"));
      return {
        rel: path.relative(src, full).split(path.sep).join("/"),
        code,
        imports: importsOf(code),
      };
    });
}

/** Layer an import lands in, resolved from the importing file; null for packages. */
function targetLayer(file: SourceFile, spec: string): string | null {
  if (!spec.startsWith(".")) return null;
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file.rel), spec));
  return resolved.split("/")[0] ?? null;
}

function resolvedPath(file: SourceFile, spec: string): string {
  return path.posix.normalize(path.posix.join(path.posix.dirname(file.rel), spec));
}

const files = readSources(src);
const inLayer = (layer: string) => files.filter((f) => f.rel.startsWith(`${layer}/`));

describe("layer boundaries (ADR 0004)", () => {
  it("finds the source files", () => {
    expect(inLayer("domain").length).toBeGreaterThan(0);
  });

  it("keeps src/domain pure", () => {
    const problems: string[] = [];
    for (const file of inLayer("domain")) {
      for (const spec of file.imports) {
        const layer = targetLayer(file, spec);
        if (spec === "phaser" || spec.startsWith("phaser/")) problems.push(`${file.rel}: ${spec}`);
        if (layer && layer !== "domain") problems.push(`${file.rel}: ${spec}`);
      }
      for (const name of ["document", "window", "localStorage", "Math.random", "Date.now"]) {
        const escaped = name.replace(".", "\\.");
        if (new RegExp(`(?<![\\w.])${escaped}(?!\\w)`).test(file.code)) {
          problems.push(`${file.rel}: ${name}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it("keeps src/game from importing src/ui", () => {
    const problems = inLayer("game").flatMap((file) =>
      file.imports
        .filter((spec) => targetLayer(file, spec) === "ui")
        .map((s) => `${file.rel}: ${s}`),
    );
    expect(problems).toEqual([]);
  });

  it("lets src/ui import from src/game only the event bus", () => {
    const problems = inLayer("ui").flatMap((file) =>
      file.imports
        .filter((spec) => targetLayer(file, spec) === "game")
        .filter((spec) => resolvedPath(file, spec).replace(/\.ts$/, "") !== "game/events")
        .map((s) => `${file.rel}: ${s}`),
    );
    expect(problems).toEqual([]);
  });

  it("touches localStorage only in src/storage", () => {
    const problems = files
      .filter((file) => !file.rel.startsWith("storage/"))
      .filter((file) => /(?<![\w.])localStorage(?!\w)/.test(file.code))
      .map((file) => file.rel);
    expect(problems).toEqual([]);
  });
});
