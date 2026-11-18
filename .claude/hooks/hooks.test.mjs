// Regression tests for the agent hooks. Run: node --test .claude/hooks/hooks.test.mjs
//
// Hook behavior is tested against a fixed fixture config, so customizing
// config.json never breaks these tests. The last tests check the real setup:
// every agent file agrees with config.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = import.meta.dirname;
const root = path.resolve(dir, '../..');

const fixture = {
  protected: ['.claude/'],
  owners: { 'docs/adr/': 'architect', 'db/migrations/': 'database' },
  agents: {
    architect: { allow: ['docs/'] },
    docs: { allow: ['docs/', 'README.md', 'CLAUDE.md', 'GUIA.md'] },
    database: {},
    backend: {},
  },
  readonlyCommands: ['^(npm|pnpm) (run )?(test|lint|typecheck)\\b', '^pnpm (-F|--filter) \\S+ (test|lint)\\b'],
};
const fixturePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-test-')), 'config.json');
fs.writeFileSync(fixturePath, JSON.stringify(fixture));

function run(script, args, toolInput) {
  const result = spawnSync(process.execPath, [path.join(dir, script), ...args], {
    input: JSON.stringify({ tool_input: toolInput, cwd: root }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    encoding: 'utf8',
  });
  return result.status;
}

const bash = (command) => run('readonly-bash.mjs', ['--config', fixturePath], { command });

test('readonly-bash allows read-only commands and configured scripts', () => {
  for (const cmd of [
    'git status --short',
    'git diff HEAD | head -50',
    'git log --oneline -5',
    'git diff --no-ext-diff',
    'rg -n foo src',
    'pnpm test',
    'npm run lint',
    'pnpm -F api lint',
    'TZ=UTC pnpm test',
    'ls docs 2>/dev/null',
    'sort -u names.txt',
  ]) {
    assert.equal(bash(cmd), 0, cmd);
  }
});

test('readonly-bash blocks writes and program execution', () => {
  for (const cmd of [
    'cat a > b',
    'echo x >> file',
    'cat <(touch pwned)',
    'echo $(rm -rf x)',
    'echo `rm -rf x`',
    'rg --pre ./evil.sh foo',
    'sort --compress-program=sh x',
    'sort -o out in',
    'git diff --ext-diff',
    'git log --textconv -p',
    'git diff --output=x',
    'git grep -O foo',
    'find . -delete',
    'find . -exec rm {} ;',
    'pnpm lint --fix',
    'pnpm test -u',
    'pnpm test --update-snapshots',
    'npx prettier --write .',
    'pnpm install',
    'rm -rf x',
    'node script.js',
    'git commit -m x',
    'git -c core.pager=sh log',
    'ls & touch pwned',
    'cat a &>/dev/null & touch b',
    'ls &',
  ]) {
    assert.equal(bash(cmd), 2, cmd);
  }
});

test('readonly-bash still allows && and fd redirects', () => {
  for (const cmd of ['git status && git log -1', 'pnpm test 2>&1 | tail -5', 'ls &>/dev/null']) {
    assert.equal(bash(cmd), 0, cmd);
  }
});

test('readonly-bash without config allows only the base list', () => {
  const missing = path.join(os.tmpdir(), 'no-such-config.json');
  assert.equal(run('readonly-bash.mjs', ['--config', missing], { command: 'git status' }), 0);
  assert.equal(run('readonly-bash.mjs', ['--config', missing], { command: 'pnpm test' }), 2);
});

// block-env answers in three ways: 2 (key: blocked), 'ask' (env file with real secrets)
// or 0 (allowed).
function env(toolInput) {
  const result = spawnSync(process.execPath, [path.join(dir, 'block-env.mjs')], {
    input: JSON.stringify({ tool_input: toolInput, cwd: root }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    encoding: 'utf8',
  });
  if (result.status !== 0) return result.status;
  return result.stdout ? JSON.parse(result.stdout).hookSpecificOutput?.permissionDecision : 0;
}

test('block-env asks before env files with real secrets in shell commands and file tools', () => {
  for (const command of [
    'Get-Content .env.local',
    'cat apps/api/.env.local',
    'grep SECRET .env.production',
    'cat .env.development.local',
    'cat .env*',
    'cat .env .env.local',
    'cat C:\\Users\\u\\app-restore.env',
    'source deploy/prod.env',
    'node --env-file=.env.local server.js',
    'git commit -m "docs: explain .env.local"',
  ]) {
    assert.equal(env({ command }), 'ask', command);
  }
  assert.equal(env({ file_path: path.join(root, 'apps/api/.env.local') }), 'ask');
  assert.equal(env({ file_path: 'C:\\dev\\x\\.env.staging' }), 'ask');
  assert.equal(env({ file_path: '.env.production', content: 'X=1' }), 'ask');
  assert.equal(env({ pattern: 'x', path: '.env.local' }), 'ask');
  assert.equal(env({ pattern: 'x', glob: '.env*' }), 'ask');
  assert.equal(env({ file_path: 'C:\\Users\\u\\backup.env' }), 'ask');
});

test('block-env blocks a key even when the same call names an env file', () => {
  assert.equal(env({ command: 'cat .env.local ~/.ssh/id_ed25519' }), 2);
});

test('block-env allows dev env files and env mentions that are not files', () => {
  for (const command of [
    'cat .env',
    'cat apps/api/.env',
    'grep PORT .env.development',
    'cat .env.test',
    'cp .env.example .env',
    'cat .env.example',
    'cat apps/api/.env.example',
    'grep -rn "process.env" apps',
    'grep -rn process.env apps',
    'rg import.meta.env apps/web',
    'node -e "console.log(process.env.PORT)"',
    'echo $env:PATH',
    'git status',
  ]) {
    assert.equal(env({ command }), 0, command);
  }
  assert.equal(env({ file_path: 'apps/api/.env.example' }), 0);
  assert.equal(env({ file_path: path.join(root, 'apps/api/.env') }), 0);
  assert.equal(env({ file_path: '.env.development', old_string: 'A=1', new_string: 'A=2' }), 0);
  assert.equal(env({ pattern: 'x', path: '.env' }), 0);
  assert.equal(env({ file_path: 'apps/api/src/env.ts' }), 0);
  assert.equal(env({ pattern: '\\.env', path: 'docs' }), 0);
});

test('block-env blocks private keys, certificates and the .ssh folder', () => {
  for (const command of [
    'cat ~/.ssh/id_ed25519',
    'Get-Content C:\\Users\\u\\.ssh\\prod-server',
    'ssh -i ~/.ssh/prod user@host',
    'ls $HOME/.ssh',
    'cat certs/server.pem',
    'openssl pkcs12 -in cert.p12',
    'cat id_rsa.pub',
  ]) {
    assert.equal(env({ command }), 2, command);
  }
  assert.equal(env({ file_path: 'C:\\Users\\u\\.ssh\\config' }), 2);
  assert.equal(env({ file_path: 'deploy/tls.key' }), 2);
  assert.equal(env({ pattern: 'BEGIN', glob: '**/*.pem' }), 2);
});

test('block-env allows names that only look like keys', () => {
  for (const command of ['node -e "console.log(o.key)"', 'grep -rn sshd docs', 'git log --grep ssh', 'cat docs/ssh.md']) {
    assert.equal(env({ command }), 0, command);
  }
  assert.equal(env({ file_path: 'src/keyboard.ts' }), 0);
  assert.equal(env({ file_path: 'docs/ssh.md' }), 0);
});

function external(command) {
  const result = spawnSync(process.execPath, [path.join(dir, 'confirm-external.mjs')], {
    input: JSON.stringify({ tool_input: { command } }),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, command);
  return result.stdout ? JSON.parse(result.stdout).hookSpecificOutput?.permissionDecision : 'none';
}

test('confirm-external asks before commands that act outside the machine', () => {
  for (const command of [
    'git push',
    'git push origin main --force',
    'cd app && git push',
    'git -C "../app" push origin main',
    'ssh user@host',
    'scp a host:b',
    'rsync -a x host:y',
    'gh workflow run Deploy -f sha=abc',
    'gh run rerun 123',
    'gh secret set TOKEN',
    'gh api -X DELETE repos/o/r/x',
    'gh api repos/o/r/git/refs -f ref=refs/tags/x',
    'docker push img:1',
    'pnpm publish',
    'GIT_TRACE=1 git push',
    '& git push',
  ]) {
    assert.equal(external(command), 'ask', command);
  }
});

test('confirm-external lets local and read-only commands through', () => {
  for (const command of [
    'git status',
    'git log --grep push',
    'git commit -m "push later"',
    'gh run list',
    'gh run view 1 --log',
    'gh workflow list',
    'gh api repos/o/r/commits/x/check-runs',
    'gh api -X GET repos/o/r',
    'docker build -t x .',
    'echo ssh',
    'pnpm install',
  ]) {
    assert.equal(external(command), 'none', command);
  }
});

const guard = (agent, filePath) =>
  run('guard-paths.mjs', ['--agent', agent, '--config', fixturePath], { file_path: filePath });

test('guard-paths: protected paths and owners', () => {
  assert.equal(guard('backend', 'src/app.ts'), 0);
  assert.equal(guard('backend', 'docs/plans/x.md'), 0);
  assert.equal(guard('backend', '.claude/hooks/guard-paths.mjs'), 2);
  assert.equal(guard('architect', '.claude/agents/architect.md'), 2);
  assert.equal(guard('backend', 'docs/adr/0001-x.md'), 2);
  assert.equal(guard('backend', 'db/migrations/001.sql'), 2);
  assert.equal(guard('backend', path.join(root, 'db/migrations/001.sql')), 2);
  assert.equal(guard('database', 'db/migrations/001.sql'), 0);
  assert.equal(guard('architect', 'docs/adr/0001-x.md'), 0);
});

test('guard-paths: allow lists', () => {
  assert.equal(guard('architect', 'docs/plans/x.md'), 0);
  assert.equal(guard('architect', 'src/app.ts'), 2);
  assert.equal(guard('docs', 'docs/STATUS.md'), 0);
  assert.equal(guard('docs', 'README.md'), 0);
  assert.equal(guard('docs', 'docs/adr/0001-x.md'), 2);
  assert.equal(guard('docs', 'src/main.ts'), 2);
});

test('guard-paths: outside the project, unknown agent, bad arguments', () => {
  assert.equal(guard('backend', '../other/file.ts'), 2);
  assert.equal(guard('ghost', 'src/app.ts'), 2);
  assert.equal(run('guard-paths.mjs', ['--config', fixturePath], { file_path: 'x' }), 2);
  assert.equal(run('guard-paths.mjs', ['--agent', 'backend', '--config', '/no/such.json'], { file_path: 'x' }), 2);
});

test('format-on-edit runs the matching formatter and reports failures', () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'format-test-'));
  const formatConfig = path.join(work, 'config.json');
  fs.writeFileSync(
    formatConfig,
    JSON.stringify({
      formatters: {
        '\\.txt$': `node -e "require('fs').appendFileSync(process.argv[1], '!')"`,
        '\\.bad$': 'node -e "process.exit(1)"',
      },
    }),
  );
  const format = (file) =>
    spawnSync(process.execPath, [path.join(dir, 'format-on-edit.mjs'), '--config', formatConfig], {
      input: JSON.stringify({ tool_input: { file_path: file } }),
      env: { ...process.env, CLAUDE_PROJECT_DIR: work },
      encoding: 'utf8',
    }).status;

  for (const name of ['a.txt', 'b.bad', 'c.md']) fs.writeFileSync(path.join(work, name), 'x');
  assert.equal(format('a.txt'), 0);
  assert.equal(fs.readFileSync(path.join(work, 'a.txt'), 'utf8'), 'x!');
  assert.equal(format('b.bad'), 2);
  assert.equal(format('c.md'), 0);
  assert.equal(format('missing.txt'), 0);
  assert.equal(format('../outside.txt'), 0);
});

// The real setup: agent files and config.json agree.
const config = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
const agentsDir = path.join(root, '.claude/agents');
const agentFiles = fs.existsSync(agentsDir) ? fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md')) : [];

function frontmatter(file) {
  const text = fs.readFileSync(path.join(agentsDir, file), 'utf8');
  return text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
}

test('every agent that edits files is guarded by its own name and listed in config.json', () => {
  for (const file of agentFiles) {
    const fm = frontmatter(file);
    const name = fm.match(/^name:\s*(\S+)/m)?.[1];
    assert.equal(name, file.replace(/\.md$/, ''), `${file}: name difere do nome do arquivo`);
    const tools = fm.match(/^tools:\s*(.+)$/m)?.[1];
    assert.ok(tools, `${file}: sem "tools:" (sem ele o agente herda todas as ferramentas)`);
    if (/\b(Edit|Write|NotebookEdit)\b/.test(tools)) {
      assert.match(fm, new RegExp(`guard-paths\\.mjs" --agent ${name}\\b`), `${file}: sem guard-paths --agent ${name}`);
      assert.ok(config.agents?.[name], `${file}: agente ausente de "agents" em config.json`);
    } else if (/\bBash\b/.test(tools)) {
      assert.match(fm, /readonly-bash\.mjs/, `${file}: agente sem edição com Bash precisa de readonly-bash`);
    }
  }
});

test('config.json names only existing agents', () => {
  const names = new Set(agentFiles.map((f) => f.replace(/\.md$/, '')));
  for (const name of Object.keys(config.agents ?? {})) assert.ok(names.has(name), `agents.${name} sem arquivo`);
  for (const [rule, owner] of Object.entries(config.owners ?? {})) {
    assert.ok(names.has(owner), `owners["${rule}"] = ${owner}, agente sem arquivo`);
  }
  for (const source of config.readonlyCommands ?? []) assert.doesNotThrow(() => new RegExp(source), source);
  for (const source of Object.keys(config.formatters ?? {})) assert.doesNotThrow(() => new RegExp(source), source);
});

test('CI keeps the secret scan and its rules stay protected', () => {
  const ci = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
  const job = ci.split(/^  checks:\r?$/m)[1]?.split(/^  \S/m)[0] ?? '';
  assert.match(job, /zricethezav\/gitleaks:v[\d.]+@sha256:/, 'ci.yml: job "checks" com gitleaks fixado sumiu');
  assert.doesNotMatch(job, /continue-on-error|--exit-code[ =]0/, 'ci.yml: job "checks" não pode ignorar achados');
  assert.doesNotMatch(ci, /paths-ignore|\[skip ci\]/, 'ci.yml: a varredura de segredos roda em todo push');
  const rules = fs.readFileSync(path.join(root, '.gitleaks.toml'), 'utf8');
  assert.match(rules, /^useDefault = true/m, '.gitleaks.toml: precisa manter as regras padrão');
  for (const file of ['.gitleaks.toml', '.gitleaksignore']) {
    assert.ok(config.protected?.includes(file), `config.json: ${file} fora de "protected"`);
  }
});
