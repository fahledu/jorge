// PostToolUse hook (Edit|Write): formats the edited file with the stack's formatter.
//
// Usage: node format-on-edit.mjs [--config <file>]
// Rules come from "formatters" in .claude/hooks/config.json: path regex -> command;
// the absolute file path is appended to the command. The first matching regex wins.
// No config, no match or a file outside the project: does nothing (formatting is a
// convenience, not a guarantee). Formatter failure (usually a syntax error) exits 2,
// which sends the first lines of the error back to the agent.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function option(args, name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

const input = JSON.parse((await readStdin()) || '{}');
const root = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
const configPath = option(process.argv.slice(2), 'config') ?? path.join(root, '.claude/hooks/config.json');

let formatters;
try {
  formatters = JSON.parse(fs.readFileSync(configPath, 'utf8')).formatters ?? {};
} catch {
  process.exit(0);
}

const target = input.tool_input?.file_path;
if (!target) process.exit(0);

const absolute = path.resolve(root, target);
const rel = path.relative(root, absolute).replaceAll('\\', '/');
if (rel === '..' || rel.startsWith('../') || path.isAbsolute(rel) || !fs.existsSync(absolute)) process.exit(0);

const command = Object.entries(formatters).find(([pattern]) => new RegExp(pattern).test(rel))?.[1];
if (!command) process.exit(0);

const result = spawnSync(`${command} "${absolute}"`, { cwd: root, shell: true, encoding: 'utf8', timeout: 60_000 });
if (result.status === 0) process.exit(0);

const output = `${result.stderr ?? ''}${result.stdout ?? ''}`
  .replace(/\x1b\[[0-9;]*m/g, '') // strip terminal colors
  .trim()
  .split('\n')
  .slice(0, 20)
  .join('\n');
process.stderr.write(`O formatador falhou em "${rel}" (${command}):\n${output || result.error?.message || 'sem saída'}\n`);
process.exit(2);
