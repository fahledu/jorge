// PreToolUse hook (Bash) for review agents: allows only read-only commands.
//
// Usage in agent frontmatter: node readonly-bash.mjs [--config <file>]
// Allowlist, not blocklist: anything not recognized is blocked. The command is
// split on &&, ||, ;, | and newlines; every segment must be allowed. Splitting
// ignores quotes, so a quoted "|" may cause a false block; that is intentional
// (fail closed). Project scripts (test, lint...) come from "readonlyCommands" in
// .claude/hooks/config.json; they run project code, an accepted limit.
// Exit 2 blocks the tool call and sends stderr back to the agent.
import fs from 'node:fs';
import path from 'node:path';

const BASE_ALLOWED = [
  /^cd\b/,
  /^git (status|diff|log|show|blame|rev-parse|ls-files|grep|shortlog)\b/,
  /^git branch( (--show-current|-a|--all|-r|--remotes|-v|-vv|--list))*$/,
  /^git config (--get|--get-all|--list|-l)\b/,
  /^(ls|cat|head|tail|wc|grep|rg|sort|uniq|pwd|find|diff|file|stat)\b/,
];

const FORBIDDEN = [
  { pattern: /`|\$\(|<\(/, reason: 'substituição de comando ou de processo' },
  // A lone "&" starts a second command that the segment split below would not see;
  // "&&", "2>&1" and "&>" are handled elsewhere.
  { pattern: /(^|[^&>])&(?![&>])/, reason: 'comando em segundo plano (&)' },
  { pattern: /--pre\b|--compress-program\b|--ext-diff\b|--textconv\b/, reason: 'opção que executa programa' },
  { pattern: /--fix\b|--write\b/, reason: '--fix/--write altera arquivos' },
  { pattern: /--output\w*/, reason: '--output/--outputFile grava arquivo' },
  { pattern: /\s-(delete|exec|execdir|ok|okdir|fprint0?|fprintf|fls)\b/, reason: 'find com ação' },
  { pattern: /\bsort\b[^|;&\n]*\s-[a-zA-Z]*o/, reason: 'sort -o grava arquivo' },
  { pattern: /\s(-O\S*|--open-files-in-pager)\b/, reason: 'git grep -O executa programa' },
  { pattern: /(^|[^0-9&])>(?!\s*&\d)(?!\s*\/dev\/null)/, reason: 'redirecionamento para arquivo' },
  { pattern: /\d>(?!&\d)(?!\s*\/dev\/null)/, reason: 'redirecionamento para arquivo' },
  { pattern: /&>(?!\s*\/dev\/null)/, reason: 'redirecionamento para arquivo' },
];

// In project scripts, these flags write files (snapshot update).
const SCRIPT_WRITES = /\s(-u|--update\S*)(\s|$)/;

function block(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

const args = process.argv.slice(2);
const input = JSON.parse((await readStdin()) || '{}');
const root = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
const i = args.indexOf('--config');
const configPath = i >= 0 ? args[i + 1] : path.join(root, '.claude/hooks/config.json');

let scripts = [];
try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  scripts = (config.readonlyCommands ?? []).map((source) => new RegExp(source));
} catch {
  // No config: only the base list (fail closed for project scripts).
}

const command = String(input.tool_input?.command ?? '').trim();
if (!command) process.exit(0);

for (const { pattern, reason } of FORBIDDEN) {
  if (pattern.test(command)) {
    block(`Bloqueado (${reason}): este agente é somente leitura. Comando: ${command}`);
  }
}

const segments = command
  .split(/&&|\|\||;|\||\n/)
  .map((s) => s.trim().replace(/^(\w+=\S*\s+)+/, '')) // drop env prefixes like TZ=UTC
  .filter(Boolean);

for (const segment of segments) {
  const isScript = scripts.some((re) => re.test(segment));
  if (isScript && SCRIPT_WRITES.test(segment)) {
    block(`Bloqueado (atualização de snapshots grava arquivo): este agente é somente leitura. Comando: ${segment}`);
  }
  if (!isScript && !BASE_ALLOWED.some((re) => re.test(segment))) {
    block(
      `Bloqueado: "${segment}" não está na lista de comandos somente leitura ` +
        '(git status/diff/log/show/blame, ls/cat/grep/rg, scripts de "readonlyCommands" em .claude/hooks/config.json). ' +
        'Este agente não altera o repositório.',
    );
  }
}

process.exit(0);
