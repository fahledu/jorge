// PreToolUse hook (Edit|Write|NotebookEdit) for subagents: keeps each agent in its area.
//
// Usage in agent frontmatter: node guard-paths.mjs --agent <name> [--config <file>]
// Rules come from .claude/hooks/config.json:
// - "protected": paths no agent changes (only the main session, with the user)
// - "owners": path -> the only agent that changes it
// - "agents.<name>.allow": when present, the agent changes only these paths
// A rule ending in "/" matches a directory prefix; otherwise it matches one file.
// Unknown agent or unreadable config blocks (fail closed).
// Exit 2 blocks the tool call and sends stderr back to the agent.
import fs from 'node:fs';
import path from 'node:path';

function block(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

function normalize(p) {
  const slashed = p.replaceAll('\\', '/').replace(/^\.\//, '');
  return process.platform === 'win32' ? slashed.toLowerCase() : slashed;
}

function matches(rel, rule) {
  return rule.endsWith('/') ? rel.startsWith(rule) : rel === rule;
}

function option(args, name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

const args = process.argv.slice(2);
const agent = option(args, 'agent');
if (!agent) block(`guard-paths: argumentos inválidos (falta --agent <nome>): ${args.join(' ')}`);

const input = JSON.parse((await readStdin()) || '{}');
const root = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
const configPath = option(args, 'config') ?? path.join(root, '.claude/hooks/config.json');

let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (err) {
  block(`guard-paths: não foi possível ler ${configPath}: ${err.message}`);
}

const rules = config.agents?.[agent];
if (!rules) block(`guard-paths: o agente "${agent}" não está em "agents" de ${configPath}.`);

const target = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
if (!target) process.exit(0);

const rel = normalize(path.relative(root, path.resolve(root, target)));
if (rel === '..' || rel.startsWith('../') || path.isAbsolute(rel)) {
  block(`Bloqueado: "${target}" está fora do projeto.`);
}

const protectedRule = (config.protected ?? []).map(normalize).find((rule) => matches(rel, rule));
if (protectedRule) {
  block(
    `Bloqueado: "${rel}" é protegido (${protectedRule}); só a sessão principal altera, com o usuário. ` +
      'Descreva a mudança necessária no seu resumo.',
  );
}

for (const [rule, owner] of Object.entries(config.owners ?? {})) {
  if (owner !== agent && matches(rel, normalize(rule))) {
    block(`Bloqueado: "${rel}" é área do agente ${owner}. Descreva a mudança no seu resumo para ele.`);
  }
}

const allow = (rules.allow ?? []).map(normalize);
if (allow.length > 0 && !allow.some((rule) => matches(rel, rule))) {
  block(`Bloqueado: o agente ${agent} só altera ${allow.join(', ')}; "${rel}" está fora.`);
}

process.exit(0);
