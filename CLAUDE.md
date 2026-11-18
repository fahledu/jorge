# CLAUDE.md

Orientação para o Claude Code neste repositório. É lido em toda sessão: mantenha-o
curto, como índice. O detalhe mora nos ADRs.

# <!-- PREENCHER: nome do projeto -->

> **Status:** esqueleto, projeto ainda não definido. Próximo passo: `/iniciar-projeto <descrição>`.
> **Para retomar o trabalho, leia `docs/STATUS.md`** (fase atual, próximo passo, pendências).

<!-- PREENCHER: 2 a 4 linhas: o que o sistema faz, para quem e o que fica fora do escopo. -->

## Onde cada informação mora (fonte única)

| Assunto | Fonte | Aqui e nos agentes |
|---|---|---|
| Regras de domínio e arquitetura | `docs/adr/` (índice em `docs/adr/README.md`) | só uma linha + número do ADR |
| Versões de bibliotecas | ADR de stack | nomes, sem versão |
| Plano de uma feature | `docs/plans/<feature>.md` (architect) | nada |
| Ordem de implementação | `docs/ROADMAP.md` | nada |
| Como o produto se parece (referência visual) | `docs/mockup/index.html` | nada |
| Design system: tokens, componentes base, textos da interface | `docs/DESIGN.md` (com interface; depois da fundação, os valores moram no tema do código) | nada |
| Operação em produção: deploy, voltar versão, backup e restauração, segredos, alertas | `docs/OPERACAO.md` (a partir do item de deploy) | nada |
| Fase atual e pendências | `docs/STATUS.md` | nada |
| Papel e processo de cada agente | `.claude/agents/<agente>.md` | nada |
| Área de cada agente (garantida por hook) | `.claude/hooks/config.json` | nada |
| Como trabalhar com os agentes | `GUIA.md` | nada |

Nunca copie o detalhe de uma regra para outro arquivo: cite o ADR. Mudou uma regra,
muda o ADR (e a linha do resumo abaixo, se ela mudou). `node scripts/check-docs.mjs`
confere índice, links e ADRs citados; um hook o roda ao fim de cada sessão.

## Stack

<!-- PREENCHER (a partir do ADR de stack): uma linha por camada, só nomes, sem versão. -->

## Estrutura

```
<!-- PREENCHER: pastas do código (apps, pacotes, módulos) -->
docs/
  adr/                    # decisões (fonte única das regras)
  plans/                  # planos de feature (architect)
  mockup/index.html       # mockup aprovado antes de codar (referência, não é código)
  DESIGN.md               # design system (só com interface)
  ROADMAP.md              # ordem de implementação
  STATUS.md               # ponto de retomada
scripts/check-docs.mjs    # consistência da documentação
.claude/
  agents/                 # subagentes
  hooks/                  # garantias (áreas, somente leitura, .env, docs)
  skills/                 # /iniciar-projeto, /feature, /retomar, /concluir-item
```

## Comandos

```bash
node scripts/check-docs.mjs                  # consistência da documentação
node --test --test-reporter=dot .claude/hooks/hooks.test.mjs  # testes dos hooks
# PREENCHER: instalar dependências, subir serviços, dev, testes (todos, um arquivo,
# por nome), lint, typecheck, e2e, migrations. Para agentes, liste primeiro o script
# de teste com saída resumida (ex.: test:quiet, que mostra só falhas e o total)
```

## Regras não negociáveis (resumo; o detalhe está no ADR)

1. Decisão estrutural mora num ADR; ADR **Proposto** não é regra; uma regra mora num ADR só. (ADR 0001)
2. Cada agente altera só a sua área; `.claude/` só com o usuário; segredo real só em `.env.local`, que agente só toca com a sua confirmação; chave privada e `.ssh` ninguém lê; push, ssh, disparo de workflow e publicação pedem confirmação; contornar hook por shell é proibido. (ADR 0002)
<!-- PREENCHER: uma linha por regra de domínio ou arquitetura, sempre com o ADR -->

Antes de mexer numa área, leia o ADR dela.

## Convenções

- Código, nomes e commits em inglês; interface e documentação em português (pt-BR).
- Tipagem estrita; sem escape do tipo (`any` ou equivalente) sem comentário do porquê.
- Entrada validada na borda; regra de negócio fora da camada de transporte e da de dados.
- Segredos só em variáveis de ambiente; `.env.example` completo e comentado; nada de segredo em log.
- `.env`, `.env.development` e `.env.test` só têm valores locais e descartáveis (agentes
  leem e editam); chave real de serviço externo vai no `.env.local`, que o agente só lê
  ou cita com confirmação do usuário.
- Dependência nova só com motivo; versões fixadas conforme o ADR de stack. Antes de
  instalar, confira nome exato, autor e idade do pacote: nome parecido com o de um
  pacote popular é ataque comum.
- Commits em Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`...); um item do roadmap por vez, commit ao final.
- Trabalho direto na `main`, que fica sempre pronta para deploy: cada commit fecha algo
  completo. Mudança grande ou arriscada (migration destrutiva, refatoração ampla) vai
  num branch curto, de poucos dias. Sem branch `dev` de longa duração: o deploy manual
  por SHA já separa o que está integrado do que está no ar.
<!-- PREENCHER: camadas, padrões de pasta, formatação de datas e números, estado no frontend -->

## Fluxo com subagentes

Feature nova: `/feature <descrição>`: plano do `architect` (em `docs/plans/`) →
implementação na sessão principal pelas regras de `.claude/agents/<agente>.md` de cada
área (`devops` → `database` → `backend` → `frontend` → `qa`; subagente só para área
com muitas tarefas) → `reviewer` (e `security` se envolver autenticação, dinheiro,
dados pessoais ou integração externa).

Hooks garantem as áreas (ADR 0002): só o `architect` escreve em `docs/adr/`,
ninguém altera `.claude/`, `reviewer` e `security` só leem. Se um hook bloquear,
delegue ao agente responsável. O hook de caminhos vale para Edit/Write, não para
shell: usar `sed -i`, redirecionamento ou script para mexer na área de outro agente
é contornar o hook, e é proibido. `.env`, `.env.development`, `.env.test` e
`.env.example` são liberados; os demais (`.env.local`, `.env.*.local`,
`.env.production`...) pedem confirmação do usuário, inclusive por shell. Se não for
preciso ver o valor, não peça.

## Economia de tokens

- Subagente começa do zero e relê o contexto: implementação é feita na sessão
  principal; subagente só para plano, revisão ou área com muitas tarefas.
- Não releia o que já está no contexto (este arquivo é carregado sozinho) nem um arquivo
  logo depois de editá-lo.
- Procure antes de ler (busca por texto ou nome); em arquivo grande, leia só o trecho
  que interessa.
- Rode testes pelo script de saída resumida (seção Comandos). Não leia lockfiles, build
  nem código gerado.
- Antes de usar API de framework ou biblioteca, consulte a doc e os tipos da versão
  instalada em `node_modules` (ex.: `node_modules/next/dist/docs/`), não a memória.
  Procure o trecho e leia só ele.
- Respostas curtas: sem repetir o pedido, sem resumo final do que já está no diff, sem
  explicar o óbvio.

## Antes de dizer que terminou

- Lint, typecheck e os testes afetados passam (comandos acima)
- `node scripts/check-docs.mjs` passa (se mexeu em documentação)
- Nenhum log de depuração esquecido, nenhum segredo no código
  (`node scripts/check-secrets.mjs` antes do commit; senha fixa só em arquivo de teste)
- Migrations geradas pela ferramenta, nunca editadas depois de aplicadas
- `docs/STATUS.md` atualizado se um item do roadmap terminou ou uma questão foi resolvida
