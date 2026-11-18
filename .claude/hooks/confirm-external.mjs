// PreToolUse hook (Bash|PowerShell): asks the user before a command that acts outside
// this machine: publishes commits (git push, which also runs CI), reaches a server (ssh,
// scp, sftp, rsync), triggers or changes GitHub Actions (a deploy is one "gh workflow
// run" away), secrets, variables, repository or releases, writes through "gh api", or
// publishes images and packages.
//
// Registered in .claude/settings.json, so it covers the main session and every
// subagent. The command is split on &&, ||, ;, | and newlines, like readonly-bash.mjs,
// so "cd app && git push" also asks. It answers "ask", not a block: these commands are
// fine when the user asked for them, and the user confirms in the prompt. Wrapping a
// command to dodge the check (bash -c, a script) is bypassing a hook (ADR 0002).

const EXTERNAL = [
  { pattern: /^git(\s+-[Cc]\s+("[^"]*"|'[^']*'|\S+))*\s+push\b/, what: 'publica commits no remoto e roda o CI' },
  { pattern: /^(ssh|scp|sftp|rsync)(\s|$)/, what: 'acessa outro servidor' },
  { pattern: /^gh\s+(workflow\s+(run|enable|disable)|run\s+(rerun|cancel|delete))\b/, what: 'dispara ou muda um workflow' },
  { pattern: /^gh\s+(secret|variable)\b/, what: 'mexe em segredos ou variáveis do GitHub' },
  { pattern: /^gh\s+(repo\s+(delete|edit|rename|archive)|release\s+(create|delete|edit|upload))\b/, what: 'muda o repositório ou um release' },
  { pattern: /^gh\s+api\b.*\s(-X|--method)[\s=]*(?!GET\b)[A-Z]/i, what: 'altera algo pela API do GitHub' },
  { pattern: /^gh\s+api\b.*\s(-f|-F|--field|--raw-field|--input)\b/, what: 'altera algo pela API do GitHub (campos viram POST)' },
  { pattern: /^docker\s+(push|login)\b/, what: 'publica imagem ou entra num registro' },
  { pattern: /^(npm|pnpm|yarn)\s+publish\b/, what: 'publica um pacote' },
];

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

const input = JSON.parse((await readStdin()) || '{}');
const command = String(input.tool_input?.command ?? '');

const segments = command
  .split(/&&|\|\||;|\||\n/)
  .map((s) => s.trim().replace(/^(\w+=\S*\s+)+/, '').replace(/^&\s*/, '')) // env prefixes, PowerShell "&"
  .filter(Boolean);

for (const segment of segments) {
  const hit = EXTERNAL.find(({ pattern }) => pattern.test(segment));
  if (hit) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'ask',
          permissionDecisionReason: `Ação fora da máquina (${hit.what}): confirme. Comando: ${segment}`,
        },
      }),
    );
    process.exit(0);
  }
}

process.exit(0);
