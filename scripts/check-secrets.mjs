// Runs the same secret scan as CI (gitleaks, rules in .gitleaks.toml) before a commit:
// the whole git history plus what is staged. Uses a local gitleaks or, without it, the
// same pinned Docker image as CI. Exit 1 lists the findings (values redacted).
// Neither available: says the scan was skipped (CI still runs it) and exits 0.
//
// Usage: node scripts/check-secrets.mjs   (stage the files first: git add -A)
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
// Keep in sync with the gitleaks step of the checks job in .github/workflows/ci.yml
const IMAGE =
  'zricethezav/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f';
const LEAKS = 3; // exit code for findings, to tell them apart from tool errors
const DOCKER = ['run', '--rm', '-v', `${root}:/repo`];
// The mounted repo belongs to another user inside the container
const SAFE_DIR = {
  GIT_CONFIG_COUNT: '1',
  GIT_CONFIG_KEY_0: 'safe.directory',
  GIT_CONFIG_VALUE_0: '/repo',
};

const scans = [
  ['histórico', []],
  ['arquivos em stage', ['--pre-commit', '--staged']],
];

function gitleaks(extra) {
  const args = ['git', '--redact', '--no-banner', '--verbose'];
  args.push(`--exit-code=${LEAKS}`, ...extra);
  const local = spawnSync('gitleaks', [...args, root], { stdio: 'inherit' });
  if (!local.error) return local.status;
  const env = Object.entries(SAFE_DIR).flatMap((e) => ['-e', e.join('=')]);
  const cmd = [...DOCKER, ...env, IMAGE, ...args, '/repo'];
  const docker = spawnSync('docker', cmd, { stdio: 'inherit' });
  return docker.error ? null : docker.status;
}

let found = false;
for (const [label, extra] of scans) {
  const status = gitleaks(extra);
  if (status === LEAKS) {
    found = true;
    console.error(`check-secrets: segredo encontrado (${label})`);
  } else if (status !== 0) {
    console.warn(
      'check-secrets: NÃO VERIFICADO. Instale o gitleaks ou abra o Docker; ' +
        'o CI faz a varredura de qualquer forma.',
    );
    process.exit(0);
  }
}
if (found) {
  console.error(
    'Segredo real: tire do código e use .env.local ou os secrets do GitHub. ' +
      'Senha fixa de teste: deixe-a em arquivo de teste (.gitleaks.toml).',
  );
  process.exit(1);
}
console.log('check-secrets: ok');
