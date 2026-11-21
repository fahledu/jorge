# CLAUDE.md

Orientação para o Claude Code neste repositório. É lido em toda sessão: mantenha-o
curto, como índice. O detalhe mora nos ADRs.

# Jorge

> **Para retomar o trabalho, leia `docs/STATUS.md`** (fase atual, próximo passo, pendências).

Jogo de plataforma 2D no navegador, público e sem login: 100 fases geradas a partir de
trechos desenhados à mão, com dificuldade crescente e um tema por bloco de fases; pontos
por inimigos derrotados, moedas e conclusão; modo livre (recorde por fase) e modo desafio
(partida com vidas e top 10 local com apelido); save só no navegador. Teclado e toque. Arte do
pack Kenney Pixel Platformer (CC0). Fora do MVP: chefes, sons, gamepad, PWA, ranking
global e save na nuvem (lista em `docs/ROADMAP.md`).

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

Um pacote TypeScript estrito com pnpm (versões no ADR 0003).

- **Jogo:** Phaser 3 (arcade physics, tilemaps do Tiled), Vite
- **Menus e HUD fora do canvas:** TypeScript e DOM puros, CSS à mão com os tokens do `docs/DESIGN.md`
- **Domínio:** TypeScript puro; zod (`zod/mini`) para o save
- **Qualidade:** Vitest, Playwright com axe, Biome
- **Infra:** Docker, Caddy estático na VM da plataforma fahledu, GHCR, GitHub Actions

## Estrutura

```
src/
  domain/                 # regras puras: PRNG, curva, gerador, validador, pontuação, save, recordes
  game/                   # Phaser: cenas, entidades, câmera, entrada
  ui/                     # DOM: menus, telas, toque, textos pt-BR (strings.ts)
  storage/                # adaptador do localStorage
  main.ts
levels/
  chunks/                 # trechos do Tiled (.tmj)
  manual/                 # fases feitas à mão
  generated/              # 100 fases geradas (versionadas; não ler)
  README.md               # paleta de tiles e comandos de fases
scripts/                  # build e checagem de fases, check-docs, check-secrets
assets/kenney/            # cópia dos arquivos usados do pack (protegida)
e2e/                      # Playwright
.preview/                 # prévias em PNG das fases (fora do git)
infra/                    # Dockerfile, compose, Caddyfile, deploy
docs/
  adr/                    # decisões (fonte única das regras)
  plans/                  # planos de feature (architect)
  mockup/index.html       # mockup aprovado antes de codar (referência, não é código)
  DESIGN.md               # design system
  ROADMAP.md              # ordem de implementação
  STATUS.md               # ponto de retomada
.claude/
  agents/                 # subagentes
  hooks/                  # garantias (áreas, somente leitura, .env, docs)
  skills/                 # /iniciar-projeto, /feature, /retomar, /concluir-item
```

## Comandos

```bash
node scripts/check-docs.mjs                  # consistência da documentação
node --test --test-reporter=dot .claude/hooks/hooks.test.mjs  # testes dos hooks
pnpm test:quiet                              # testes, só falhas e total (use este)
pnpm install                                 # dependências (e, uma vez, pnpm exec playwright install chromium)
pnpm dev                                     # jogo em http://localhost:5190 (Vite)
pnpm test                                    # todos os testes (Vitest)
pnpm exec vitest run src/domain/score.test.ts   # um arquivo (-t "<nome>" para um teste)
pnpm lint && pnpm typecheck                  # Biome e tsc
pnpm levels:build                            # gera as 100 fases em levels/generated/ (manuais e geradas)
pnpm levels:preview <arquivo>                # prévia em PNG em .preview/ (--sheet: folha numerada)
pnpm levels:check                            # confere que as fases versionadas são as que o gerador produz
pnpm build                                   # build de produção
pnpm e2e                                     # Playwright com axe (refaz o build de modo e2e, com o atalho de teste; preview em 5191)
pnpm audit --prod --audit-level high         # auditoria de dependências
```

## Regras não negociáveis (resumo; o detalhe está no ADR)

1. Decisão estrutural mora num ADR; ADR **Proposto** não é regra; uma regra mora num ADR só. (ADR 0001)
2. Cada agente altera só a sua área; `.claude/` só com o usuário; segredo real só em `.env.local`, que agente só toca com a sua confirmação; chave privada e `.ssh` ninguém lê; push, ssh, disparo de workflow e publicação pedem confirmação; contornar hook por shell é proibido. (ADR 0002)
3. Versões fixadas e conferidas; versão nova só depois de 7 dias publicada; script de instalação só de pacote aprovado. (ADR 0003)
4. Um pacote, `src/{domain,game,ui,storage}`; `domain` puro (sem Phaser, DOM, `Math.random` nem `Date.now`); `game` e `ui` falam por eventos; constantes de física no `domain`. (ADR 0004)
5. Fases geradas no build a partir de trechos do Tiled com semente fixa, versionadas no git; curva por grupos de 10; validador de alcance faz o build falhar; trechos com rota alta; cada fase tem `contentHash`; um tema a cada 10 fases (10 temas, só terreno, decoração e fundo
   mudam). (ADR 0013, ADR 0015)
6. 3 corações; modo livre com tentativas ilimitadas, pontos só com a fase concluída e total = soma do melhor de cada fase; modo desafio com partida desde a fase 1, vidas, vida extra que não volta e game over. (ADR 0014)
7. Um save por navegador, sem dado pessoal (exceto o apelido do top 10, só local); recordes pessoais; schema versionado com migração; mescla entre abas; save corrompido preservado. (ADR 0007)
8. Só assets CC0 ou OFL; só os arquivos usados, em `assets/kenney/`, conferidos por hash; crédito à Kenney. (ADR 0008)
9. Menus em HTML sobre o canvas, WCAG 2.2 AA; resolução 480×270 em escala inteira; teclado e toque com os mesmos comandos; opção de reduzir efeitos; pt-BR. (ADR 0009)
10. `domain` com cobertura ≥ 95%; `levels:check` no CI; E2E com axe e sem violação de CSP. (ADR 0010)
11. Caddy estático na VM da plataforma fahledu, sem cookie nem rastreio, CSP estrita, deploy manual por SHA. (ADR 0011)
12. Trechos e fases manuais escritos por agente no subconjunto do Tiled conferido pelo build; nenhum inimigo no arco de um salto obrigatório. (ADR 0012)

Antes de mexer numa área, leia o ADR dela.

## Convenções

- Código, nomes e commits em inglês; interface e documentação em português (pt-BR).
- Tipagem estrita; sem escape do tipo (`any` ou equivalente) sem comentário do porquê.
- Entrada validada na borda (o save lido do navegador também); regra do jogo no `domain`, nunca na cena.
- Sem datas nem relógio no domínio: tempo injetado; números e tempos na interface com `Intl` pt-BR.
- Segredos só em variáveis de ambiente; `.env.example` completo e comentado; nada de segredo em log.
- `.env`, `.env.development` e `.env.test` só têm valores locais e descartáveis (agentes
  leem e editam); chave real de serviço externo vai no `.env.local`, que o agente só lê
  ou cita com confirmação do usuário.
- Dependência nova só com motivo; versões fixadas conforme o ADR de stack. Antes de
  instalar, confira nome exato, autor e idade do pacote: nome parecido com o de um
  pacote popular é ataque comum.
- Commits em Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`...); um item do roadmap por vez, commit ao final.
- Trabalho direto na `main`, que fica sempre pronta para deploy: cada commit fecha algo
  completo. Mudança grande ou arriscada (refatoração ampla) vai num branch curto, de
  poucos dias. Sem branch `dev` de longa duração: o deploy manual por SHA já separa o
  que está integrado do que está no ar.
- Repositório público: nada de dado pessoal, segredo ou e-mail real em arquivo ou commit
  (e-mail de commit é o noreply do GitHub).

## Fluxo com subagentes

Feature nova: `/feature <descrição>`: plano do `architect` (em `docs/plans/`) →
implementação na sessão principal pelas regras de `.claude/agents/<agente>.md` de cada
área (`devops` → `game` → `qa`; subagente só para área com muitas tarefas) →
`reviewer` (e `security` se envolver armazenamento, CSP, dependências ou integração
externa).

Hooks garantem as áreas (ADR 0002): só o `architect` escreve em `docs/adr/`,
ninguém altera `.claude/` nem `assets/kenney/`, `reviewer` e `security` só leem. Se um
hook bloquear, delegue ao agente responsável. O hook de caminhos vale para Edit/Write,
não para shell: usar `sed -i`, redirecionamento ou script para mexer na área de outro
agente é contornar o hook, e é proibido. `.env`, `.env.development`, `.env.test` e
`.env.example` são liberados; os demais (`.env.local`, `.env.*.local`,
`.env.production`...) pedem confirmação do usuário, inclusive por shell. Se não for
preciso ver o valor, não peça.

## Economia de tokens

- Subagente começa do zero e relê o contexto: implementação é feita na sessão
  principal; subagente só para plano, revisão ou área com muitas tarefas.
- Não releia o que já está no contexto (este arquivo é carregado sozinho) nem um arquivo
  logo depois de editá-lo.
- Procure antes de ler (busca por texto ou nome); em arquivo grande, leia só o trecho
  que interessa. Não leia `levels/generated/` nem os packs em `packs/`.
- Rode testes pelo script de saída resumida (seção Comandos). Não leia lockfiles, build
  nem código gerado.
- Antes de usar API de framework ou biblioteca, consulte a doc e os tipos da versão
  instalada em `node_modules` (ex.: `node_modules/phaser/types/`), não a memória.
  Procure o trecho e leia só ele.
- Respostas curtas: sem repetir o pedido, sem resumo final do que já está no diff, sem
  explicar o óbvio.

## Antes de dizer que terminou

- Lint, typecheck e os testes afetados passam (comandos acima)
- Mexeu em física, gerador ou trechos: `pnpm levels:build` e `pnpm levels:check` passam
- `node scripts/check-docs.mjs` passa (se mexeu em documentação)
- Nenhum log de depuração esquecido, nenhum segredo no código
  (`node scripts/check-secrets.mjs` antes do commit; senha fixa só em arquivo de teste)
- `docs/STATUS.md` atualizado se um item do roadmap terminou ou uma questão foi resolvida
