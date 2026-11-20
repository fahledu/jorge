# Gerador de fases e validador

- Item do roadmap: 1g
- Status: Aprovado

## Decisões (decididas)

Decididas pelo usuário em 2026-11-20: as seis aprovadas como estão abaixo (o ADR 0013
foi aceito e o 0005 passou a "Substituído por 0013").

1. **ADR 0013 (Aceito), que substitui o ADR 0005.** O 0005 deixou números em aberto e
   tem duas contradições: "a primeira fase do bloco seguinte alivia" não sai de nenhum
   número dele, e "não repetir o trecho seguido" faz falhar toda janela com um trecho só
   (inclusive o caso-limite "o tier 10 sorteia 8"). Como já há código, o 0005 não é
   editado: o 0013 repete o que vale e acrescenta o resto. *Suposições do 0013:*
   - semente FNV-1a de `"jorge:<n>"` e PRNG mulberry32, com ordem fixa de consumo;
   - pesos 3/2/1 para `tier`, `tier − 1` e `tier − 2`, constantes; sem alívio no começo
     do bloco (a dificuldade sobe pela densidade e pelo número de trechos; o 1h ajusta);
   - trechos `start` e `finish` em listas próprias, sorteados com peso igual, sem janela;
   - posição sem candidato recomeça a fase com a mesma sequência, até 20 vezes;
   - inimigos ativos = `round(densidade × elegíveis)`, escolhidos por Fisher–Yates;
   - bordas de grama, terra e plataforma refeitas nas colunas de junção;
   - validador com folga de 5 linhas acima dos pés, espinho fora do caminho, paredes do
     mundo dos lados e em cima, molas e inimigos ignorados;
   - propriedades da fase gerada: `chunks`, `contentHash`, `generatorVersion` (1),
     `levelNumber`, `seed`, `targetTimeSeconds`, `tier`.

   Aceito o 0013, o 0005 vira "Substituído por 0013".
2. **Biblioteca provisória: 10 arquivos, não 6.** Com dificuldades 1, 3, 5, 7, 9 e 10,
   as janelas dos tiers 1, 2, 4, 6 e 8 ficam com um trecho só, e o segundo trecho do meio
   não tem candidato (não pode repetir). *Suposição:* 8 trechos do meio, com dificuldades
   1, 1, 3, 4, 6, 7, 9 e 10 (toda janela fica com 2 ou mais), mais 1 de início e 1 de
   chegada, todos simples e só com a paleta de hoje. Pelo menos um trecho com `entryRow`
   9, para o encaixe recusar alguma coisa nos dados reais. Aprovado, o architect corrige
   o escopo do item 1g no roadmap.
3. **Qual fase o jogo abre (sem seleção até o 1i e o 1j).** *Suposição:* o build de
   produção abre sempre a fase 1, como hoje. No `pnpm dev`, `?fase=N` (1 a 100) abre a
   fase N, num módulo de debug que o build de produção não inclui (conferido pelo
   `check-dist`). No build `e2e`, o atalho de teste ganha `openLevel(n)` (o ADR 0010 já
   prevê "escolher a fase"). Morte e "Jogar de novo" recomeçam a mesma fase. Nada de
   próxima fase, menu ou progresso.
4. **Faixa de morros do fundo.** *Suposição:* a faixa fica logo acima do chão que está
   embaixo do `start` (`groundRow × 18 − 36` px, 180 na fase 1, sem mudança), fixa na
   fase inteira. Se o chão sobe ou desce ao longo da fase, os morros não acompanham
   (vai para "Para depois").
5. **Alocação a cada passo (questão do 1d e do 1e).** *Suposição:* espinhos, itens e
   molas, que não se movem, vão para um índice por coluna montado ao carregar a fase. A
   cada passo a cena consulta só as colunas que o corpo toca e preenche arrays de contato
   reaproveitados (zera o `length`); nada de `filter` ou `map` no passo, e sem contato usa
   uma lista vazia compartilhada. Os inimigos, que se movem, ficam numa varredura com
   `for`. `stepAttempt` continua puro e devolve um estado novo por passo: um objeto
   pequeno por passo não depende do número de itens.
6. **Vãos no atalho de teste.** *Suposição:* `level()` ganha `pits`: as colunas sem
   nenhum tile no `terrain` (vão aberto até o fundo), e `width`. Os E2E de queda usam
   `pits[0]` no lugar da coluna 38.

## Objetivo

As 100 fases existem: a 1 é o tutorial manual e as outras 99 saem do gerador, a partir de
trechos provisórios, ficando mais longas e com mais inimigos conforme o número sobe. O
build garante que toda fase é alcançável e que os arquivos versionados são exatamente o
que o gerador produz. No dev, qualquer fase abre pelo endereço; no jogo publicado,
continua só a fase 1 até a seleção de fases.

## Critérios de aceitação

- Dado o repositório, quando `pnpm levels:build` roda duas vezes, então existem
  `levels/generated/001.json` a `100.json` e nada muda na segunda vez.
- Dada qualquer fase de 1 a 100, quando o E2E a abre pelo atalho de teste, então ela
  aparece com início e bandeira, "FASE N" no HUD, e é concluída pelo atalho, sem erro no
  console nem violação de CSP.
- Dado `pnpm dev` com `?fase=50`, então abre a fase 50; dado `?fase=0`, `?fase=101` ou
  `?fase=abc`, então abre a fase 1.
- Dado o build de produção, quando o jogo começa, então abre a fase 1, qualquer que seja
  o endereço.
- Dada uma fase gerada editada à mão (um byte), quando `pnpm levels:check` roda, então
  falha nomeando o arquivo; com o arquivo restaurado, passa.
- Dado um trecho que deixa a bandeira inalcançável (vão de 4), quando o build roda, então
  falha com a fase, os trechos e a coluna até onde chegou.
- Dadas as fases 2 a 10, então são tier 1, com 3 trechos do meio e só andadores; dada a
  fase 100, então tem 9 trechos do meio e a maior parte dos inimigos dos trechos ativos.
- Dada uma fase gerada com o chão do início noutra linha que não a 12, então os morros do
  fundo aparecem logo acima desse chão.
- Dada a fase 1, então ela continua igual (mesmo arquivo gerado, mesmo `contentHash`).
- Dada a fase 100 jogada no `pnpm dev`, então a média de fps fica em 55 ou mais.

## Fora de escopo

- Biblioteca real de trechos, neve e areia, ajuste dos números da curva (1h).
- Seleção de fase, próxima fase, progresso e recordes (1i e 1j); `?fase=N` é só do dev.
- Fundo diferente por fase ou por tier (já em "Para depois").
- Morros do fundo acompanhando a altura do chão ao longo da fase.
- Mola contando como salto no validador; validador que considera inimigos ou dano.
- Trechos espelhados pelo gerador (ADR 0012 não aceita bits de espelhar).
- Fases além das 100, geradas sem fim.
- Folha com a prévia das 100 fases (`levels:preview` já abre um `.json` gerado).
- E2E do efeito de derrota com reduzir efeitos (fica a questão no STATUS).

Copiados para "Para depois" do `docs/ROADMAP.md`: morros acompanhando o chão ao longo da
fase; fases além das 100 geradas sem fim. O resto já é item da Fase 1, já estava na
lista, ou é detalhe de implementação.

## ADRs aplicáveis

0004, 0006, 0010, 0012, 0013 (substitui o 0005).

## Modelo de dados

Sem save. Arquivos:

- `levels/chunks/*.tmj`: os 10 trechos provisórios (decisão 2), no formato do ADR 0012.
- `levels/generated/002.json` a `100.json`: novos, no formato do ADR 0013, versionados.
  `001.json` não muda.

## Contratos

- **`src/domain/prng.ts`** (novo): `fnv1a32(text)`, `levelSeed(n)`,
  `createPrng(seed): () => number` (mulberry32).
- **`src/domain/curve.ts`** (novo): `tierOf` (sai de `level.ts`, que reexporta),
  `middleChunkCount(n)`, `enemyDensity(n)`, `difficultyWindow(tier)`,
  `chunkWeight(tier, difficulty)`, `FLYER_MIN_TIER`.
- **`src/domain/tiles.ts`:** `EDGE_FAMILIES` (sozinho, esquerda, meio, direita de grama,
  terra e plataforma, conferidos na paleta de `levels/README.md`).
- **`src/domain/generator.ts`** (novo): `GENERATOR_VERSION`, `SEED_BASE`,
  `generateLevel(n, library: { name: string; map: TmjMap }[])` →
  `{ ok: true; map: TmjMap; chunks: string[]; seed: number } | { ok: false; error: string }`;
  junção, bordas e ativação de spawns como no ADR 0013.
- **`src/domain/reach.ts`** (novo): `validatorReach()` → `{ rise: 3, gap: 3,
  headroomRows: 5 }`, derivado de `jumpReach()` e `PLAYER_BODY`;
  `checkReachable({ width, terrain, start, flag })` → `{ ok: true } | { ok: false;
  farthestCol: number }`.
- **`src/domain/level.ts`:** a serialização sai de `buildManualLevel` para uma função
  comum; novo `buildGeneratedLevel({ levelNumber, seed, chunks, map, tileset, imagePath,
  sha256 })`, com as propriedades em ordem de nome. `LevelInfo` ganha `pits: number[]` e
  `groundRow` (primeira linha sólida abaixo do `start`).
- **`src/domain/geometry.ts`:** `pitColumns(terrain, width)`; `ColumnIndex` (montado de
  caixas, `query(left, right, out)` preenche `out` sem alocar).
- **`scripts/levels.ts`** (novo): `planLevels(root)` → `{ outputs: Map<string, string>;
  errors: string[] }`: lê o `.tsx`, os trechos (ordem de nome) e as manuais; para cada n,
  manual se houver, senão gerada; valida todas. Para no primeiro erro (ADR 0012).
- **`scripts/build-levels.ts`:** usa `planLevels` e grava (como hoje).
- **`scripts/check-levels.ts`** (novo, `pnpm levels:check`): `planLevels` e compara com o
  disco; lista arquivos diferentes, faltando e sobrando; sai com 1 se houver algum.
- **`src/game/create-game.ts`:** `start(levelNumber = 1)`.
- **`src/game/debug/level-from-url.ts`** (novo, importado só com `import.meta.env.DEV`):
  lê `?fase=N` e devolve 1 se inválido. `check-dist` proíbe `level-from-url` no `dist/`.
- **`src/game/test-hooks.ts`:** `openLevel(n): Promise<void>` (troca a cena, resolve em
  `playing`); `level()` com `pits` e `width`.
- **`src/game/scenes/level-scene.ts`:** faixa do fundo por `groundRow` (decisão 4);
  índice por coluna e arrays reaproveitados no passo (decisão 5).

## Regras e casos de borda

- Gerador, curva, sorteio, junção, spawns e validador seguem o ADR 0013; o plano não
  repete. A cena e os scripts não têm regra de fase.
- O gerador só lê o que é do trecho (nome, tags, dificuldade, linhas, spawns, tiles):
  mudar tiles de um trecho não muda o sorteio de nenhuma fase.
- A fase 1 passa pelo validador como as outras; se o modelo a rejeitar, o build falha e
  o `game` volta ao plano (não muda o desenho sem o usuário).
- Largura máxima de fase gerada: 11 × 48 = 528 tiles; `targetTimeSeconds` pela largura
  (ADR 0006).
- `openLevel` durante o efeito de morte ou com a fase concluída troca a cena do mesmo
  jeito; a tentativa recomeça em 1.

## Interface

Nenhuma tela nova. HUD com 3 dígitos na fase 100 já é do 1f. A faixa do fundo muda de
altura conforme o chão do início (decisão 4). Sem texto novo em `strings.ts`.

## Testes necessários

- **`src/domain/prng.test.ts`:** mesma semente → mesma sequência; valores em [0, 1);
  os 5 primeiros de `createPrng(1)` e `levelSeed(2)` fixados no teste (regressão);
  `fnv1a32("")` = 2166136261.
- **`src/domain/curve.test.ts`:** `tierOf` 1, 10, 11, 100 → 1, 1, 2, 10;
  `middleChunkCount` 1, 10, 16, 100 → 3, 3, 4, 9; `enemyDensity(1)` 0,3 e `(100)` 0,9;
  `difficultyWindow(1)` [1, 1], `(10)` [8, 10]; pesos 3/2/1 e 0 fora da janela.
- **`src/domain/generator.test.ts`** (biblioteca de fixtures em `src/domain/fixtures/`),
  todos os casos-limite de gerador do ADR 0013: mesma entrada → mesma saída; fase 10 com
  3 do meio e fase 100 com 9; nunca o mesmo trecho seguido (100 fases); encaixe 12 → 9
  recusado, 10 e 14 aceitos; tier 10 só com dois trechos de 8 → só eles, alternando; um
  só de 8 → erro com fase, tier e posição; nenhum de 8 a 10 → erro com fase e tier;
  tags `start` e `finish` juntas → erro; sem `finish` → erro; densidade da fase 2 com 5
  andadores → 2 e fase 100 com 10 → 9; voador na 20 desligado e na 21 elegível; moeda
  `minTier` 4 na 30 desligada e na 31 ativa; ids 1 a N e `x` deslocado; borda refeita
  na junção (grama do meio ao lado de vazio vira borda) e tile fora das famílias igual.
- **`src/domain/reach.test.ts`:** `validatorReach()` → 3, 3, 5; casos-limite do
  validador do ADR 0013 com mapas pequenos de fixture (vão 3 e 4, degrau 3 e 4, degrau 3
  com vão 3, teto nas linhas 5 e 6, 1, 3 e 4 espinhos, bandeira só pela mola, `start`
  sobre o vão, `farthestCol` no erro); a fase 1 real passa.
- **`src/domain/physics.test.ts`:** na trajetória de `simulateJump({ run: true })`, na
  descida, à altura de 3 tiles o corpo já andou pelo menos 3 × 18 + `PLAYER_BODY.width`
  px (o canto subida 3 com vão 3 do validador cabe no pulo real).
- **`src/domain/level.test.ts`:** fase gerada com as propriedades em ordem de nome e
  `contentHash` recalculado igual; `readLevelInfo` dá `pits` e `groundRow` (fase 1:
  `groundRow` 12, `pits` com 38).
- **`src/domain/geometry.test.ts`:** `pitColumns`; `ColumnIndex.query` devolve só as
  caixas das colunas pedidas e reaproveita `out`.
- **`scripts/build-levels.test.ts`:** 100 arquivos; dois builds iguais byte a byte;
  `001.json` igual ao versionado; trocar um tile de um trecho → mudam só as fases cujo
  `chunks` o contém (com 8 trechos do meio nenhum fica numa fase só; o teste confere o
  conjunto); `levels/manual/007.tmj` com bandeira inalcançável → erro.
- **`scripts/check-levels.test.ts`:** raiz temporária com os trechos e a manual reais:
  sem mudança → ok; um byte trocado em `037.json` → erro com `037.json`; `050.json`
  apagado → erro; `101.json` sobrando → erro.
- Cobertura do `domain` ≥ 95% (ADR 0010).
- **E2E `e2e/levels.spec.ts`** (desktop, build `e2e`): para n de 1 a 100, `openLevel(n)`,
  `hud().level` = "n", `goToFlag()`, `lastSummary().completion.levelNumber` = n; nenhum
  `console.error`, `pageerror` nem violação de CSP.
- **E2E existentes:** `player`, `hazards`, `enemies` e `score` trocam a coluna 38 por
  `level().pits[0]`.
- **À mão (`docs/ROTEIRO-TESTE.md`):** no `pnpm dev`, `?fase=2`, `?fase=50` e `?fase=100`:
  a fase abre, os morros ficam acima do chão do início, as junções não mostram borda
  errada, dá para chegar à bandeira; fps da fase 100 (meta do ADR 0010).

## Tarefas por agente

1. **devops:** `levels:check` no `package.json` e um passo `pnpm levels:check` no
   `stack.yml`, depois do `test:coverage` e antes do `build`; `level-from-url` na lista
   proibida do `scripts/check-dist.ts`. Sem dependência nova.
2. **game** — domínio: `prng.ts`, `curve.ts`, `EDGE_FAMILIES`, `reach.ts` (com o teste
   da física), `generator.ts`, `buildGeneratedLevel`, `pits` e `groundRow`, `pitColumns` e
   `ColumnIndex`, com os testes de unidade.
3. **game** — trechos: os 10 `.tmj` da decisão 2, conferidos pela prévia em PNG
   (ADR 0012); `levels/README.md` com os trechos provisórios, `levels:check` e a ordem dos
   trechos na fase gerada.
4. **game** — scripts: `scripts/levels.ts`, `build-levels.ts` e `check-levels.ts`, com os
   testes; gerar e versionar as 100 fases.
5. **game** — jogo: `start(levelNumber)`, `?fase=N` no dev, `openLevel` e `pits` no atalho
   de teste, faixa do fundo por `groundRow`, índice por coluna e arrays reaproveitados.
6. **qa:** `e2e/levels.spec.ts`, troca da coluna 38 nos E2E existentes, conferência à mão
   de que `levels:check` falha com um arquivo editado (e volta a passar), rodada à mão do
   roteiro.
7. **docs:** `docs/ROTEIRO-TESTE.md` com a linha do `?fase=N` e o que olhar nas fases
   geradas.

Fora de `docs/`, para a sessão principal, quando o ADR 0013 for aceito: no `CLAUDE.md`,
trocar "(ADR 0005)" por "(ADR 0013)" na linha das fases geradas (o resumo continua
valendo) e tirar "(nasce no 1g)" dos comandos; nos agentes `game`, `devops` e `qa`, trocar
o ADR 0005 pelo 0013. Nada em `.claude/hooks/config.json`. Os comentários do código que
citam o ADR 0005 passam ao 0013 quando o arquivo for mexido.

## Riscos e alternativas descartadas

- **Validador conservador demais** (folga de 5 linhas, queda reta) recusar trechos bons
  no 1h: o erro diz a coluna; afrouxar é mudança no ADR 0013, com teste à mão.
- **Validador otimista** num caso que o modelo não vê (pulo longo com teto baixo
  no meio do arco): mitigado pela folga e pelo teste à mão das fases 1, 10, 50 e 100.
- **Peso no git:** cerca de 100 arquivos de 20 a 50 KB; a cada mudança de trecho o diff
  mostra só as fases afetadas (uma linha do mapa por linha de texto, ADR 0012).
- **Dead end no encaixe com a biblioteca provisória:** os trechos são desenhados para
  sempre ter sucessor; o recomeço até 20 vezes cobre o resto e o erro diz onde.
- **Faixa de morros fora do lugar** quando o chão muda muito de altura: aceito no MVP
  (decisão 4).
- Descartado: gerar no navegador (ADR 0013); ler `?fase=N` também em produção (antecipa
  o 1j e pula o progresso do 1i); permitir trecho repetido em janela de um só (decisão
  2); manter `filter`/`map` no passo e medir antes (o custo cresce com o número de itens
  e a fase 100 é a mais cheia).
