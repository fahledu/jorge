// `pnpm levels:check` (CI): generates every level again in memory and fails if the files in
// levels/generated/ differ, are missing or are extra, or if a level fails the validator
// (ADR 0013). A level file edited by hand is caught here.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { GENERATED_DIR, planLevels } from "./levels.ts";

export function checkLevels(root: string): string[] {
  const { outputs, errors } = planLevels(root);
  if (errors.length > 0) return errors;
  const dir = path.join(root, GENERATED_DIR);
  const problems: string[] = [];
  let present: string[] = [];
  try {
    present = readdirSync(dir).filter((name) => name.endsWith(".json"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; // fs errors carry a code
  }
  for (const name of [...present].sort()) {
    if (!outputs.has(name)) problems.push(`${GENERATED_DIR}/${name}: extra file`);
  }
  for (const [name, expected] of outputs) {
    if (!present.includes(name)) {
      problems.push(`${GENERATED_DIR}/${name}: missing`);
    } else if (readFileSync(path.join(dir, name), "utf8") !== expected) {
      problems.push(`${GENERATED_DIR}/${name}: differs from the generator output`);
    }
  }
  return problems;
}

if (import.meta.main) {
  const problems = checkLevels(path.resolve(import.meta.dirname, ".."));
  if (problems.length > 0) {
    for (const line of problems) process.stderr.write(`${line}\n`);
    process.stderr.write("levels:check: run pnpm levels:build and commit levels/generated/\n");
    process.exit(1);
  }
  process.stdout.write("levels:check: ok (100 levels)\n");
}
