# Fundação técnica

- Item do roadmap: 1a
- Status: Aprovado

## Decisões pendentes

Nenhum ADR Proposto toca o item (0003, 0004, 0008, 0009 e 0010 estão aceitos). Ambiguidades
que mudam o que se faz, cada uma com a suposição adotada:

1. **Onde moram as versões exatas depois do 1a.** O ADR 0003 pede a versão exata na
   tabela, mas a cada revisão mensal (patch e minor) ela mudaria em dois lugares
   (`package.json` e ADR). *Suposição:* a coluna passa a se chamar "Versão inicial (1a)"
   e o ADR ganha uma frase: depois do 1a, patch e minor vivem só no `package.json` e no
   lockfile; o ADR só muda em troca de major ou de biblioteca. O `architect` faz essa
   edição junto com a anotação das versões (tarefa 6).
2. **Quem copia os assets.** `assets/kenney/` é protegida (ADR 0002, `config.json`):
   nenhum agente escreve lá, nem por shell. *Suposição:* a sessão principal pede ao
   usuário e faz a cópia e o `SOURCE.md` com a confirmação dele (tarefa 2), como o
   agente `game` já prevê para arquivo novo do pack.
3. **O que o 1a copia do pack.** *Suposição:* a lista inteira do ADR 0008 (3 folhas
   `_packed`, 2 `.tsx`, `License.txt`), não só o que o esqueleto usa: são poucas dezenas de
   KB e os itens 1b a 1e usam todas. Nada além disso.
4. **O que "Jogar" faz no 1a.** Ainda não há fase. *Suposição:* o título tem só o nome,
   a frase do mockup e o botão "Jogar"; "Jogar" esconde o painel e mostra a cena vazia
   (céu e o personagem parado, frame 0 de `tilemap-characters_packed.png`, centralizado),
   só para conferir escala e nitidez. Os outros botões do título nascem no 1j e o "Tela
   cheia" no 1k.
5. **Escala inteira em pixel CSS ou em pixel do aparelho.** O ADR 0009 dá os casos em
   pixel CSS (1920×1080 → 4). Em notebook Windows a 125% ou 150%, 2× em CSS não é inteiro
   em pixel do aparelho e pode ficar levemente irregular. *Suposição:* pixel CSS, com
   `image-rendering: pixelated`; se ficar feio no teste à mão, vira mudança no ADR 0009.
6. **Valores dos tokens depois da fundação.** O CLAUDE.md diz que, depois da fundação,
   os valores moram no tema do código. *Suposição:* `src/ui/tokens.css` passa a ser a
   fonte dos valores; o `docs/DESIGN.md` mantém nomes e papéis e troca os valores por um
   apontamento para o arquivo (tarefa 5).

Mudanças que fiz no `docs/ROADMAP.md` por causa deste plano (só escopo de itens já
existentes, nada novo no MVP): o contador de fps de debug (ADR 0010) entra no 1c, o
primeiro item com teste à mão; as telas "Carregando" e "Erro de tela" do mockup, que não
estavam em nenhum item, entram no 1j.

## Objetivo

O projeto passa a existir como código: `pnpm dev` abre o título do Jorge no navegador,
com a escala de pixel art do ADR 0009, e lint, tipos, testes, cobertura, build, E2E com
axe e CI já funcionam e garantem as fronteiras do ADR 0004 e os assets do ADR 0008.
Nenhuma regra de jogo.

## Critérios de aceitação

- Dado o repositório clonado com Node 24 e pnpm 10, quando roda `pnpm install` e
  `pnpm dev`, então o navegador mostra o título "Jorge", a frase do mockup e o botão
  "Jogar" já com foco visível.
- Dado o título, quando aperta Enter ou clica em "Jogar", então o painel some e aparece o
  céu com o personagem parado no centro, nítido (sem borrão).
- Dada a janela em 1920×1080, então o jogo ocupa 1920×1080 (4×); em 1366×768, ocupa
  960×540 centralizado com faixas da cor de fundo; em 844×390, ocupa 693×390 sem
  suavização.
- Dada a janela redimensionada com o jogo aberto, então a escala é recalculada sem
  recarregar a página.
- Dado o título, quando navega só pelo teclado, então o foco é visível e o axe não acusa
  violação.
- Dado o build de produção servido com a CSP do ADR 0011, quando abre o título e entra na
  cena, então não há erro no console nem violação de CSP, no perfil de desktop e no de
  celular em paisagem com toque.
- Dado um `import` de `phaser` (ou de `src/game`, `src/ui`, `src/storage`) num arquivo de
  `src/domain`, então `pnpm lint` e o teste de arquitetura falham (conferido e desfeito).
- Dado um arquivo de `assets/kenney/` alterado, a mais ou faltando em relação ao
  `SOURCE.md`, então o teste de assets falha (conferido e desfeito).
- Dado um push na `main` com código, então o CI roda Biome, typecheck, unidade com
  cobertura do `domain` ≥ 95%, build e `pnpm audit`, e fica verde; dado um push só de
  documentação, só roda o `ci.yml`.
- Dada a pasta `kenney_pixel-platformer/` na raiz, então ela não está mais no índice do
  git e aparece como ignorada.
- Dado o ADR 0003, então a tabela tem a versão de cada pacote instalada no 1a.
- Dado o `docs/ROTEIRO-TESTE.md`, então ele diz como jogar à mão as fases 1, 10, 50 e
  100 num notebook e num celular e como anotar o fps.

## Fora de escopo

- Qualquer regra de jogo, jogador, física, fase, HUD, `physics.ts`, `tiles.ts`
  (1b em diante).
- Save e `storage` de verdade (1i); no 1a a pasta só existe.
- Abstração de comandos de entrada, pausa e perda de foco (1c); controles de toque,
  "Gire o aparelho" e tela cheia (1k).
- Outros botões do título, demais telas de menu, "Carregando" e "Erro de tela" (1j).
- Contador de fps de debug (1c).
- Atalho de teste em `window` e o teste de que ele não vai para produção (ADR 0010):
  nasce com as fases, no 1g.
- `levels:build` e `levels:check` no CI (1g).
- E2E no CI: roda no deploy (1l) e localmente (ADR 0011).
- Dockerfile, Caddyfile, compose e deploy (1l).

Nada daqui foi para "Para depois" do roadmap: tudo já tem item na Fase 1.

## ADRs aplicáveis

0002, 0003, 0004, 0008, 0009, 0010, 0011.

## Modelo de dados

Nenhum (sem save no 1a).

## Contratos

Interfaces internas que o 1a cria e os itens seguintes usam:

- **`src/domain/scale.ts`:** `computeScale(viewWidth: number, viewHeight: number)` →
  `{ scale, width, height, offsetX, offsetY }` em pixels CSS, para a resolução interna
  480×270 do ADR 0009. `fit = min(viewWidth / 480, viewHeight / 270)`; com `fit ≥ 2`,
  `scale = floor(fit)`; abaixo, `scale = fit`. `width = min(viewWidth, round(480 × scale))`,
  `height = min(viewHeight, round(270 × scale))` (arredondar, não truncar: 270 × 390/270
  dá 389,999… em ponto flutuante), offsets = `floor((view − tamanho) / 2)`. Lado ≤ 0 ou
  não finito → `scale = 1` (janela minimizada não quebra o cálculo).
- **`src/game/events.ts`:** barramento tipado próprio (sobre `EventTarget`, sem Phaser,
  para a `ui` não depender da engine por tabela), com o mapa de eventos num tipo só. No
  1a, um evento: `playRequested` (sem carga). `on`, `off`, `emit`.
- **`assets/kenney/SOURCE.md`:** cabeçalho com pack, versão, URL de origem e data da
  cópia; depois uma tabela `| Arquivo | SHA-256 |` com o caminho relativo a
  `assets/kenney/` (com `/`) e o hash em hexadecimal minúsculo. O teste de assets lê essa
  tabela.
- **`infra/csp.ts`:** exporta a string da CSP do ADR 0011 (cópia literal) e os headers do
  mesmo ADR que o preview usa. No 1a, só o `vite preview` a usa; no 1l, um teste confere
  que o `Caddyfile` tem a mesma string, para não haver duas versões.

## Regras e casos de borda

- `ui` pode importar de `src/game` só o `events.ts`; `game` não importa `ui`; só
  `src/storage` cita `localStorage` (ADR 0004). O teste de arquitetura garante as três,
  além da pureza do `domain`.
- O canvas é transparente; a cor do céu vem do token `--color-sky` no contêiner, e as
  faixas em volta, de `--color-bg` (cor só por token, ADR 0009).
- Phaser com `pixelArt` e `roundPixels`, sem banner no console; o tamanho CSS do canvas
  vem de `computeScale` a cada `resize`, seguido da atualização do gerenciador de escala
  da engine para a entrada de ponteiro continuar certa (conferir a API na versão
  instalada).
- Imagens importadas pelo Vite saem como arquivo com hash em `/assets/` (sem embutir em
  `data:`), para valer o cache do ADR 0011; o Phaser vai num chunk próprio, que não muda
  entre deploys sem troca de versão.
- Nada inline no HTML (script, estilo ou atributo `style`): a CSP não permite.
- `.gitattributes`: `assets/kenney/**` sem conversão de fim de linha (`-text`); senão o
  `* text=auto eol=lf` muda o `.tsx` e o `License.txt` e o hash diverge entre Windows e CI.

## Interface

Implementa do `docs/mockup/index.html` só a tela "Título" no estado de primeira visita:
"Jorge" (`--text-display`), a frase "100 fases. Pule nos inimigos, pegue moedas, chegue
à bandeira.", o botão primário "Jogar" com foco inicial e "Seu progresso fica salvo neste
navegador." Componentes base usados: painel e botão primário, com os estados de foco e
pressionado do `docs/DESIGN.md`. Diverge do mockup: sem "Continuar", "Escolher fase",
"Recordes", "Configurações", "Créditos" e "Tela cheia" (itens 1j e 1k). Textos em
`src/ui/strings.ts`. Canvas com `aria-label="Jorge"`; `<html lang="pt-BR">`. Nenhum
token novo.

## Testes necessários

- **Unidade (`src/domain/scale.test.ts`):** 1920×1080 → 4, 1920×1080, offset 0,0;
  1366×768 → 2, 960×540, offset 203,114; 844×390 → ≈1,444, 693×390, offset 75,0;
  960×540 → 2 exato; 959×540 → abaixo de 2, fracionário; 480×270 → 1; 0×0 e `NaN` → 1.
  Cobertura do `domain` ≥ 95% de linhas e ramos.
- **Arquitetura (`scripts/architecture.test.ts`):** varre `src/` e falha com `phaser`,
  `../game`, `../ui`, `../storage`, `document`, `window`, `localStorage`, `Math.random` ou
  `Date.now` em `src/domain`; com import de `src/ui` em `src/game`; com import de
  `src/game` em `src/ui` que não seja `events.ts`; com `localStorage` fora de
  `src/storage`. Fica fora do `domain` para não acusar a si mesmo.
- **Assets (`scripts/assets.test.ts`):** cada linha do `SOURCE.md` bate com o SHA-256 do
  arquivo; arquivo em `assets/kenney/` sem linha, ou linha sem arquivo, falha.
- **E2E de fumaça (`e2e/smoke.spec.ts`), contra o build servido pelo `vite preview` com a
  CSP:** título visível com "Jogar" focado; axe sem violações no título; Enter esconde o
  painel e mostra o canvas com `aria-label`; em 1280×720 o canvas mede 960×540; nenhum
  `console.error`, `pageerror` ou evento `securitypolicyviolation` (coletado por script
  de inicialização da página). Projetos: Chromium desktop e um perfil de celular em
  paisagem com toque do Playwright.
- **Conferência manual:** import de `phaser` em `src/domain/scale.ts` → `pnpm lint` e
  teste de arquitetura falham; um byte mudado numa cópia de asset → teste de assets
  falha. Ambos desfeitos.

## Tarefas por agente

1. **devops** — configuração da raiz e CI:
   - Conferir no npm a versão de cada pacote da tabela do ADR 0003 (a mais nova do major
     com 7 dias ou mais de publicada; nome exato e autor), e de Node 24 LTS e pnpm 10.
     Listar no resumo pacote, versão e data de publicação, para a tarefa 6.
   - `package.json` (`type: module`, `engines`, `packageManager`, scripts `dev`, `build`,
     `preview`, `lint`, `format`, `typecheck`, `test`, `test:quiet`, `test:coverage`,
     `e2e`; dependências exatas), `.nvmrc`, `.npmrc` com `save-exact=true` (ou o
     equivalente no `pnpm-workspace.yaml`, se o pnpm 10 aceitar), `pnpm-workspace.yaml`
     com `minimumReleaseAge: 10080` e `onlyBuiltDependencies: [esbuild]`. Se outro pacote
     pedir script de instalação (ex.: Biome), não aprovar: dizer no resumo.
   - `tsconfig.json` (opções do ADR 0003, tipos do Vite), `vite.config.ts` (porta fixa,
     chunk do Phaser, sem embutir assets, `preview.headers` vindos de `infra/csp.ts`),
     `vitest.config.ts` (inclui `src/**` e `scripts/**`; cobertura v8 só de `src/domain`,
     limiar 95 em linhas e ramos), `playwright.config.ts` (`webServer` com build e
     preview, dois projetos do ADR 0010), `biome.json` (ignora `assets/`,
     `levels/generated/`, `kenney_pixel-platformer/`, `*.md`, `*.yml`;
     `noRestrictedImports` em `src/domain/**` para `phaser` e para as outras camadas;
     se a versão instalada não cobrir import relativo por padrão, o Biome cobre `phaser`
     e o teste de arquitetura cobre o resto, dito no resumo).
   - `infra/csp.ts` (contrato acima).
   - `.gitignore` com `kenney_pixel-platformer/`; `.gitattributes` com
     `assets/kenney/** -text`.
   - `.github/workflows/stack.yml`: gatilhos e `concurrency` do `ci.yml`, `paths-ignore`
     de `**.md` e `docs/**`, um job, pnpm e Node pela `.nvmrc` com cache, `install
     --frozen-lockfile`, Biome, typecheck, `test:coverage`, build, `pnpm audit --prod
     --audit-level high`; ações fixadas por SHA. `ci.yml`: Node pela `.nvmrc` (mesma
     versão do ADR 0003). `dependabot.yml`: ecossistema `npm`, mensal, `cooldown` de 7
     dias, um grupo. Estimativa de minutos no resumo.
   - Feito: o CI usa `pnpm/action-setup` v6.1.1, fixado por SHA.
2. **Sessão principal, com o usuário** (área protegida, ADR 0002):
   - Copiar de `kenney_pixel-platformer/` para `assets/kenney/`, com a mesma estrutura, os
     arquivos do ADR 0008; escrever `assets/kenney/SOURCE.md` no formato do contrato.
   - `git rm -r --cached kenney_pixel-platformer` (a pasta fica no disco).
3. **game** — esqueleto das camadas:
   - `index.html` (`lang="pt-BR"`, contêiner do jogo e da UI, sem nada inline),
     `src/main.ts` (monta UI e jogo, liga o barramento).
   - `src/domain/scale.ts` (contrato acima).
   - `src/game/events.ts`, `src/game/create-game.ts` (configuração do Phaser),
     `src/game/scenes/empty-scene.ts` (carrega a folha de personagens, desenha o frame 0
     no centro), redimensionamento por `computeScale`.
   - `src/ui/tokens.css` (todos os tokens do `docs/DESIGN.md`), `src/ui/base.css` (página,
     painel, botão primário com estados), `src/ui/strings.ts`, `src/ui/title-screen.ts`
     (título, foco inicial em "Jogar", emite `playRequested`).
   - `src/storage/index.ts` vazio (só marca a camada).
4. **qa** — testes e roteiro:
   - `src/domain/scale.test.ts`, `scripts/architecture.test.ts`, `scripts/assets.test.ts`,
     `e2e/smoke.spec.ts` (seção Testes necessários), e as duas conferências manuais.
   - `docs/ROTEIRO-TESTE.md`: preparação (build local, `pnpm dev --host` para o celular
     na mesma rede), as fases 1, 10, 50 e 100 até a bandeira no notebook e no celular,
     Firefox e WebKit à mão (ADR 0010), onde anotar o fps (média de 30 s, meta 60, mínimo
     55) e o resultado. As fases ainda não existem: o roteiro é usado a partir do 1c.
5. **docs** — `docs/DESIGN.md`: aponta os valores para `src/ui/tokens.css` (decisão
   pendente 6).
6. **architect** — ADR 0003: preencher as versões do resumo da tarefa 1 e, se a decisão
   pendente 1 for aprovada, renomear a coluna e acrescentar a frase. Status continua
   Aceito.

Fora de `docs/` e do código, para a sessão principal ao fechar o item: tirar do
`CLAUDE.md` a linha "Os scripts abaixo nascem no item 1a" (e dizer que `levels:build` e
`levels:check` nascem no 1g); tirar do `docs/STATUS.md` a questão da pasta do pack.

## Riscos e alternativas descartadas

- **Phaser e a CSP estrita:** se a engine criar estilo inline ou usar algo que a CSP
  barra, o E2E acusa já no 1a, antes de haver jogo. Relaxar a CSP é mudança no ADR 0011.
- **Biome sem regra para import relativo por padrão:** coberto pelo teste de arquitetura.
- **Hash dos assets diferente entre Windows e CI** por fim de linha: resolvido com
  `-text` no `.gitattributes`, antes da cópia.
- **Pasta do pack continua no histórico do git:** aceito (CC0, `docs/STATUS.md`).
- Descartado: `Scale.FIT` do Phaser (escala sempre fracionária, contra o ADR 0009);
  jsdom e teste de unidade do título (sem lógica, o E2E com axe cobre); E2E em todo push
  (custo de minutos; roda no deploy, ADR 0011); `EventEmitter` do Phaser no barramento
  (faria a `ui` depender da engine).
