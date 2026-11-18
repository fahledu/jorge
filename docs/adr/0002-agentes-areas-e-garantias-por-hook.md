# 0002. Agentes, áreas e garantias por hook

- Status: Aceito
- Data: 2026-11-18

## Contexto
Regra escrita no prompt de um agente é um pedido; hook é uma garantia. Sem limites, um
agente edita a área de outro, desliga os próprios hooks ou lê segredos.

## Decisão
- Cada subagente em `.claude/agents/` tem uma área. As áreas estão em
  `.claude/hooks/config.json`: `protected` (nenhum agente altera), `owners` (único
  agente que altera um caminho) e `agents.<nome>.allow` (o agente só altera esses
  caminhos). O hook `guard-paths.mjs --agent <nome>` aplica isso em Edit/Write.
- `docs/adr/` é do `architect`; `.claude/` é protegido: só a sessão principal altera,
  com o usuário. O schema e as migrations do banco são do `database` quando a stack
  existir (entra em `owners`).
- Agente que precisa de mudança fora da sua área descreve a mudança no resumo, para o
  agente responsável.
- `reviewer` e `security` só leem: sem Edit/Write, e Bash restrito por
  `readonly-bash.mjs` a comandos de leitura e aos scripts de `readonlyCommands`.
- `.env`, `.env.development` e `.env.test` guardam só valores locais e descartáveis
  (banco local, segredo de dev): qualquer sessão ou agente lê e edita. Chave real de
  serviço externo fica em `.env.local` (ou `.env.*.local`); ler, editar ou citar num
  comando esse e qualquer outro arquivo de ambiente fora dessa lista (inclusive
  `<nome>.env`, como `prod.env`) pede confirmação ao usuário (`block-env.mjs`, lista de
  permissão, e `permissions.ask`). É confirmação, não bloqueio: há usos legítimos
  (`node --env-file=.env.local`, `vercel env pull`, commit que cita o arquivo), e o
  bloqueio total atrapalhava mais do que protegia.
- Chave privada, certificado e a pasta `.ssh` (`*.pem`, `*.key`, `*.p12`, `*.pfx`,
  `id_rsa`, `id_ed25519`...) também não são lidos nem usados por nenhuma sessão ou
  agente (`block-env.mjs` e `permissions.deny`), e ficam fora do git (`.gitignore`).
  Acesso a servidor de produção é do usuário.
- Ação fora da máquina pede confirmação ao usuário em toda sessão e agente
  (`confirm-external.mjs`): `git push`, `ssh`/`scp`/`sftp`/`rsync`, `gh` que dispara
  ou muda workflow, segredo, variável, repositório ou release, `gh api` que altera,
  `docker push`/`login` e `publish`.
- O hook de caminhos vale para Edit/Write, não para shell: usar `sed -i`,
  redirecionamento ou script para alterar a área de outro agente é contornar o hook, e é
  proibido.
- Agente com Edit ou Write sempre declara `tools:` e o hook de área;
  `.claude/hooks/hooks.test.mjs` confere isso, e roda no CI.
- Comandos destrutivos de git locais (`reset --hard`, `clean`) pedem confirmação
  (`permissions.ask`).
- O CI varre segredos em todo o histórico, em todo push (gitleaks, job `checks`), e
  `node scripts/check-secrets.mjs` faz a mesma varredura antes do commit. As regras
  ficam em `.gitleaks.toml`, protegido como `.claude/`: só a regra genérica deixa de
  valer em arquivo de teste, para a senha fixa de teste não quebrar o CI. Segredo real
  nunca entra no código, nem em teste. O `hooks.test.mjs` confere que o job existe.

## Casos-limite
- Caminho fora do projeto, agente fora do `config.json` ou config ilegível → bloqueia.
- Falso positivo da varredura já no histórico publicado → fingerprint em
  `.gitleaksignore`, com o porquê, decidido com o usuário; o histórico não é reescrito.
- Comando de revisão com `--fix`, `--write`, `-u` ou redirecionamento para arquivo → bloqueia.
- `cd app && git push` ou `git -C app push` → pede confirmação; `ssh -i ~/.ssh/<chave>` →
  bloqueia (cita a pasta de chaves).

## Descartado
- **Só instruções no prompt:** o agente pode ignorar ou esquecer.
- **Lista de bloqueio de comandos:** sempre falta um caso; a lista de permissão falha fechada.
