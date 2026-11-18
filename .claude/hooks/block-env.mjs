// PreToolUse hook (Bash|PowerShell|Read|Grep|Edit|Write): asks the user before any
// session or agent touches env files that hold real secrets, and blocks private keys
// and certificates.
//
// Registered in .claude/settings.json, so it covers the main session and every
// subagent. Dev files (".env", ".env.development", ".env.test", ".env.example") hold
// only local, throwaway values and pass. Any other ".env" file name (".env.local",
// ".env.development.local", ".env.production", ".env*"...) asks: real keys live there,
// and whatever the agent reads goes to the model and to the local transcripts. It is
// "ask", not a block, because many uses are legitimate ("node --env-file=.env.local",
// "vercel env pull .env.local", a commit message that names the file): the user
// confirms in the prompt. Allowlist, so an unknown name asks too.
// "process.env" and "import.meta.env" are not file names and pass.
// Keys: anything under a ".ssh" folder (production servers are one ssh away), "*.pem",
// "*.p12", "*.pfx" and the default key names ("id_rsa", "id_ed25519"...). "*.key" is
// checked only in file fields: in a shell command "obj.key" is usually inline code.
// Files named "<name>.env" ("prod.env", "restore.env") hold real values too and ask;
// "process.env" is code, not a file, and passes.
// Keys: exit 2 blocks the tool call and sends stderr back to the agent. A key wins
// over an env file in the same call.

const ENV_FILE = /(?<![\w.$-])\.env[\w.*?[\]-]*|(?<![\w.$-])[\w-]+\.env(?![\w.$])/g;
const ALLOWED = new Set(['.env', '.env.development', '.env.test', '.env.example', 'process.env']);
const KEY = /(?<![\w.-])\.ssh(?![\w.-])|\.(pem|p12|pfx)\b|\bid_(rsa|dsa|ecdsa|ed25519)\b/i;
const KEY_FILE = /\.key\b/i;

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

const input = JSON.parse((await readStdin()) || '{}');
const toolInput = input.tool_input ?? {};
const fields = [
  { field: toolInput.command, isFile: false },
  ...[toolInput.file_path, toolInput.path, toolInput.glob].map((field) => ({ field, isFile: true })),
];

let envFile;
for (const { field, isFile } of fields) {
  if (typeof field !== 'string') continue;
  envFile ??= [...field.matchAll(ENV_FILE)].map((m) => m[0]).find((name) => !ALLOWED.has(name));
  const key = field.match(KEY)?.[0] ?? (isFile ? field.match(KEY_FILE)?.[0] : undefined);
  if (key) {
    process.stderr.write(
      `Bloqueado: "${key}" é chave privada, certificado ou pasta de chaves SSH; nenhuma sessão ou ` +
        'agente lê nem usa. Acesso a servidor é do usuário: peça a ele para rodar o comando.\n',
    );
    process.exit(2);
  }
}

if (envFile) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason:
          `"${envFile}" guarda segredos reais: o que o agente ler vai para o modelo e para os ` +
          'transcripts. Confirme só se o uso for necessário.',
      },
    }),
  );
}

process.exit(0);
