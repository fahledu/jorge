// `pnpm levels:build`: writes levels/generated/001.json to 100.json, manual where
// levels/manual/NNN.tmj exists and generated from levels/chunks/ otherwise (ADR 0012,
// ADR 0013). Unchanged files are not rewritten.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { GENERATED_DIR, planLevels } from "./levels.ts";

export interface BuildOptions {
  /** Repository root: holds levels/ and assets/. */
  root: string;
}

export interface BuildResult {
  written: string[];
  removed: string[];
  errors: string[];
}

export function buildLevels({ root }: BuildOptions): BuildResult {
  const outDir = path.join(root, GENERATED_DIR);
  const result: BuildResult = { written: [], removed: [], errors: [] };
  const { outputs, errors } = planLevels(root);
  if (errors.length > 0) {
    result.errors.push(...errors);
    return result;
  }

  mkdirSync(outDir, { recursive: true });
  for (const name of readdirSync(outDir)) {
    if (name.endsWith(".json") && !outputs.has(name)) {
      rmSync(path.join(outDir, name));
      result.removed.push(name);
    }
  }
  for (const [name, json] of outputs) {
    const target = path.join(outDir, name);
    let current: string | null = null;
    try {
      current = readFileSync(target, "utf8");
    } catch {
      // New level.
    }
    if (current !== json) {
      writeFileSync(target, json);
      result.written.push(name);
    }
  }
  return result;
}

if (import.meta.main) {
  const root = path.resolve(import.meta.dirname, "..");
  const result = buildLevels({ root });
  if (result.errors.length > 0) {
    for (const line of result.errors) process.stderr.write(`${line}\n`);
    process.exit(1);
  }
  const changed = [...result.written.map((n) => `+ ${n}`), ...result.removed.map((n) => `- ${n}`)];
  process.stdout.write(
    changed.length > 0 ? `levels:build: ${changed.join(", ")}\n` : "levels:build: up to date\n",
  );
}
