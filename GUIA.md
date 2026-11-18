# Guia: como trabalhar neste projeto com Claude Code e subagentes

## 1. O que tem no esqueleto

```
CLAUDE.md                   # contexto e índice das regras, lido em toda sessão
GUIA.md                     # este arquivo
docs/adr/                   # decisões de arquitetura: a fonte única das regras
docs/plans/                 # planos de feature (modelo em docs/plans/README.md)
docs/mockup/index.html      # mockup em HTML feito no /iniciar-projeto, antes do código
docs/DESIGN.md              # design system, feito no /iniciar-projeto (só com interface)
docs/ROADMAP.md             # ordem de implementação
docs/STATUS.md              # onde o projeto está e o próximo passo
scripts/check-docs.mjs      # confere se a documentação está consistente
scripts/check-secrets.mjs   # varredura de segredos local, igual à do CI (gitleaks)
.github/workflows/ci.yml    # CI: check-docs, testes dos hooks e varredura de segredos
.github/dependabot.yml      # atualiza as ações do CI uma vez por mês
.gitleaks.toml              # regras da varredura de segredos (protegido)
.claude/settings.json       # bloqueia chaves privadas, pede confirmação para .env com segredo e em git destrutivo, roda o check-docs no fim
.claude/agents/             # architect, game, qa, reviewer, security, devops, docs
.claude/hooks/
  config.json               # área de cada agente e comandos liberados para revisão
  guard-paths.mjs           # impede um agente de editar fora da sua área
  readonly-bash.mjs         # só deixa reviewer e security rodarem comandos de leitura
  block-env.mjs             # .env.local / .env.production pedem sua confirmação; chaves (.ssh, *.pem) bloqueadas
  confirm-external.mjs      # push, ssh, disparo de workflow e publicação pedem sua confirmação
  format-on-edit.mjs        # formata cada arquivo editado (formatters em config.json)
  check-docs-on-stop.mjs    # impede encerrar com documentação inconsistente
  hooks.test.mjs            # testes dos hooks e da configuração dos agentes
.claude/skills/             # /iniciar-projeto, /feature, /retomar, /concluir-item
```

A pasta `.claude` começa com ponto e pode ficar oculta no explorador de arquivos. Os
hooks precisam do Node instalado; sem ele, as restrições não são aplicadas.

## 2. Conceitos rápidos

**CLAUDE.md** é a memória do projeto: o Claude Code o lê no início de cada sessão.
Mantenha-o curto; regra desatualizada atrapalha mais do que ajuda.

**Fonte única (ADR 0001).** Cada regra mora num lugar só: o ADR do assunto. O
CLAUDE.md tem uma linha de resumo por regra com o número do ADR; agentes e planos só
citam o número. Mudar uma regra é mudar um arquivo, e o `scripts/check-docs.mjs` avisa
se alguma citação ficou apontando para o vazio.

**Subagentes** são assistentes especializados, cada um com contexto próprio (não
poluem a conversa principal; devolvem só o resultado). Cada arquivo em
`.claude/agents/` tem `name`, `description` (quando usar; o Claude principal lê para
decidir delegar), `tools` (o que pode fazer), `model` (`opus` só para planejar,
`sonnet` para implementar e revisar, `haiku` para documentação) e `hooks`. O corpo é o
prompt do agente.

**Hooks (ADR 0002)** são scripts que rodam antes de cada ferramenta e podem bloqueá-la.
Regra escrita só no prompt é um pedido; hook é uma garantia. As áreas ficam em
`.claude/hooks/config.json`. Limite: o hook de caminhos vale para Edit/Write, não para
shell, e contorná-lo é proibido.

**Skills** são comandos de barra do projeto: `/iniciar-projeto`, `/feature`,
`/retomar`, `/concluir-item`.

**Comandos úteis do Claude Code:** `/agents` (lista e edita subagentes), `/memory`
(abre o CLAUDE.md), `/clear` (limpa a conversa ao trocar de tarefa), `Shift+Tab`
(alterna modos, incluindo o plan mode).

## 3. Passo a passo

### Definir o projeto (uma vez)

```
/iniciar-projeto <descrição: o que é, para quem, escopo da primeira versão (MVP), o que
o MVP quer provar, stack preferida, dados sensíveis, onde vai rodar>
```

Ele pergunta o que faltar, o `architect` propõe o corte do MVP (o que entra e o que fica
para depois), os ADRs de fundação e o roadmap com a fase MVP, você
aprova ou ajusta. Com interface, ele pede referências visuais (marca, cores, sites de que
você gosta, tema claro ou escuro) e propõe o design system (`docs/DESIGN.md`). Depois
monta um mockup em HTML (`docs/mockup/index.html`) com esse visual, para você ver o
produto antes do código; aprovar o mockup é aprovar o design system junto. Por fim,
CLAUDE.md, áreas e agentes são ajustados à stack.

### Cada item do roadmap

```
/feature <id do item ou descrição>
```

Leia o plano e aprove (ou peça ajustes) antes do código. Depois: `Plano aprovado, siga.`
Ao final, `/concluir-item` confere tudo, atualiza o STATUS e faz o commit.

### Voltar depois de uma pausa

```
/retomar
```

### Chamar um agente específico

```
Use o agente reviewer para revisar as mudanças desde o último commit.
Use o agente security para auditar o módulo de autenticação.
Use o agente docs para explicar, em docs/<assunto>.md, como <algo> funciona, com exemplos.
```

## 4. Dicas

- **Aprove o plano antes do código.** Corrigir um plano é barato; corrigir código
  espalhado é caro.
- **Tarefas pequenas.** Um item do roadmap por vez, com commit ao final.
- **Leia o que ele fez** e peça explicações quando não entender.
- **Evolua as regras no lugar certo.** Se o Claude errar a mesma coisa duas vezes: regra
  do domínio vai para o ADR do assunto (pelo `architect`) com a linha no CLAUDE.md; jeito
  de trabalhar de um agente vai para o arquivo dele. Nunca a mesma regra em dois lugares.
- **Mudou agentes ou hooks?** Rode `node --test .claude/hooks/hooks.test.mjs`.
- **Sem branch `dev`.** Trabalhe na `main`, sempre pronta para deploy; o deploy escolhe
  o SHA (Convenções do CLAUDE.md).
- **O Claude pede confirmação antes de push, ssh e deploy.** Confirme só o que você pediu.
- **`/clear` entre tarefas diferentes** para manter o contexto limpo.

## 5. Economizar uso (limite do plano)

- **`/clear` ao terminar cada item** e `/retomar` no próximo: o STATUS recupera o
  contexto por uma fração do custo de uma conversa longa.
- **Modelo:** `/model` com Sonnet como padrão, ou `opusplan` (Opus só no plan mode).
  Os agentes já usam `opus` só no `architect`.
- **`/compact`** quando a conversa ficar longa no meio de uma tarefa; **`/context`** mostra
  o que ocupa o contexto; **`/usage`** mostra o consumo do plano.
- **Subagente custa caro:** cada um relê CLAUDE.md, ADRs, plano e código. Por isso o
  `/feature` implementa na sessão principal e usa subagente só para o plano, a revisão
  e áreas com muitas tarefas. Item pequeno? Peça direto, sem `/feature`.
- **`security` só quando necessário** (autenticação, dados pessoais, dinheiro, uploads,
  integrações).
- **Peça respostas curtas** e evite colar logs inteiros: cole só o erro.
- **Desative MCP servers que não usa** (`/mcp`): as ferramentas de cada um ocupam
  contexto em toda sessão.
- **Já automático:** o formatador roda por hook depois de cada edição (sem rodadas de
  "corrige o lint" nem achados de estilo na revisão); lockfiles, build da raiz e
  cobertura estão bloqueados para leitura em `.claude/settings.json`; `node_modules`
  fica fora das buscas pelo `.gitignore`, mas pode ser lido direto (docs e tipos da
  versão instalada); os agentes rodam testes pelo script de saída resumida.
- **Meça:** anote o `/usage` antes e depois de uma feature média; sem número, não dá
  para saber se um ajuste no fluxo compensa.

## 6. Economizar minutos do GitHub Actions

Repositório privado no plano gratuito tem 2.000 minutos por mês, somando todos. Quem
gasta é o CI, não o deploy.

- **Push em lote:** cada push roda o CI uma vez, com quantos commits tiver. Faça push
  ao fim da sessão ou de alguns itens, não a cada commit.
- **Já configurado:** o CI básico é um job só (cada job conta no mínimo um minuto),
  execuções antigas do mesmo branch são canceladas e o timeout é curto. As regras para
  lint, testes, e2e e deploy estão no agente `devops`: só Linux, sem matriz, nada caro
  em commit só de documentação, imagem só no deploy.
- **Acompanhe:** o consumo fica em Settings → Billing, na sua conta do GitHub.
