# Temas e inimigos novos

- Item do roadmap: 1g2
- Status: Aprovado (2026-11-20, com as suposições abaixo; decisões 2 e 9 fechadas na
  tarefa 1)

## Decisões pendentes

Nenhum ADR Proposto ligado ao item: as regras são as dos ADRs 0015 (temas, revisado em
2026-11-20: 10 temas, um por tier), 0014 (espinhoso, voador vertical, item secreto),
0013 (sorteio e densidade), 0012 (tipos de spawn) e 0008 (assets), todos aceitos; o
plano não as repete. Ambiguidades e lacunas que mudam o que se faz, cada uma com a
suposição adotada (o usuário confirma ou troca antes das tarefas):

1. **Tabela de tiles dos 5 temas do pack base (ADR 0015 pede que saia do plano).** Lida
   na folha numerada (`.preview/tileset-tiles.png`, rótulo `id local/GID`), por
   analogia com a paleta base de `levels/README.md` (linha 0 da folha = plataforma,
   linha 1 = topo do chão; as linhas 2 e 3 repetem isso na areia, 4 e 5 na neve). GIDs,
   na ordem sozinho, borda esquerda, meio, borda direita:

   | Papel (paleta base) | Campo | Floresta | Deserto | Caverna | Neve |
   |---|---|---|---|---|---|
   | Plataforma de uma linha | 1–4 | 1–4 | 41–44 | 141–144 | 81–84 |
   | Topo do chão | 21–24 | 21–24 | 61–64 | 121–124 | 101–104 |
   | Terra abaixo do topo | 121–124 | 121–124 | 121–124 | 121–124 | 121–124 |
   | Broto (decoração) | 125 | 129 (cogumelo) | 128 (cacto) | sai | sai |
   | Planta alta (decoração) | 126 | 127 (pinheiro) | 128 (cacto) | sai | 127 (pinheiro) |
   | Pinheiro (decoração) | 127 | 127 | sai | sai | 127 |
   | Cogumelo (decoração) | 129 | 129 | sai | 129 | 146 (boneco de neve) |
   | Placa com seta (decoração) | 86 | 86 | 86 | 86 | 86 |

   *Suposições:* a terra abaixo do topo é a mesma em todos (a folha não tem terra de
   areia nem de neve); a caverna é "terra sem cobertura": topo e plataforma na linha
   141–144 (outra terra marrom); se a prévia mostrar que ela não tem as bordas, a
   caverna usa 121–124 e a plataforma passa aos blocos de tijolo do pack (GIDs lidos na
   folha). A floresta tem o chão do campo e se distingue pela decoração (pinheiros e
   cogumelos no lugar de brotos), pelo céu e pelo tom da faixa (decisão 9); se a folha
   tiver a árvore larga ou arbustos, eles entram na linha da planta alta. Espinho,
   mola, moeda, coração, bandeira e gema ficam fora da tabela (ADR 0015). Na tarefa 2 o
   `game` confere a tabela na prévia de uma fase de cada tema; linha errada é corrigida
   na tabela e anotada no resumo da tarefa (o architect atualiza o plano).
   **Corrigido na tarefa 5:** 141–144 têm contorno embaixo (base de um bloco); como topo
   do chão deixavam uma linha entre o topo e a terra. O pack não tem terra com contorno
   em cima sem grama: o topo do chão da caverna é 121–124; 141–144 ficam na plataforma.
2. **Variante de cor dos inimigos por tema.** O ADR 0015 manda usar o pack base em
   todos os temas, com variantes repetindo e sem recolorir; a folha de personagens tem
   27 quadros (9 × 3) e, na escala dela, não deu para ler quais são variantes de qual
   tipo. *Suposição:* a tarefa 1 gera a folha de personagens numerada; o `game` propõe a
   tabela `tipo × tema → quadros` para os **10 temas** (andador, voador e voador
   vertical com 2 quadros; espinhoso com 1 ou 2, conforme a folha), alternando as
   variantes de um bloco para o seguinte, e o usuário aprova antes da tarefa 5. Fica
   pronta já no 1g2, inclusive para os temas de expansão (não depende das expansões);
   o 1g3 não mexe nela. Tipo com uma variante só repete em todos.
   **Aprovado na tarefa 1** (`.preview/characters.png`, ids locais): o pack não tem
   variantes de cor, então os 10 temas usam o mesmo sprite: andador 18–19, voador 24–25,
   espinhoso 15–16 (robô com broca em cima), voador vertical 11–12 (bloco de cara
   brava). A tabela continua por tema.
3. **Troca de tema na fase manual.** O ADR 0015 fala do gerador; não diz se uma fase
   manual de outro bloco também troca. *Suposição:* o build aplica a mesma troca à fase
   manual, pelo tier dela; na 001 (campo) a troca não muda nada e o arquivo gerado fica
   igual. Aprovada, o architect acrescenta uma linha ao ADR 0015.
4. **Item secreto antes de existir o desafio.** O 1g2 faz o spawn, o sorteio e o sprite;
   o efeito e o modo desafio são do 1i2, e no livre o item não aparece (ADR 0014).
   *Suposição:* a cena recebe a opção `showSecret` (falsa em toda entrada do jogo); só o
   `pnpm dev` com `?segredo=1` (módulo de debug do 1g, fora do build de produção) a
   liga, para ver o sprite no lugar. Sem contato nem coleta. O 1i2 troca o parâmetro
   pelo modo.
5. **Movimento do voador vertical e do espinhoso.** *Suposição:* o voador vertical segue
   o voador do plano 1e no eixo y: até 3 células para cima e para baixo do spawn,
   parando antes de célula sólida, espinho, do topo do mapa ou da última linha; começa
   subindo; 50 px/s; caixa do voador (16×12, centrada na célula); não espelha (olha para
   a esquerda). O espinhoso usa o trilho, a velocidade (40 px/s), a caixa (16×14) e a
   direção inicial do andador; a caixa é conferida contra o desenho e pode encolher,
   mantendo a regra do pisão do plano 1e (queda máxima por passo ≤ meia altura da menor
   caixa).
6. **Sorteio do item com um elegível só, e item em fase manual.** *Suposição:* com 0
   elegíveis nada é sorteado; com 1, ele fica ativo sem consumir valor; com 2 ou mais,
   consome um valor e fica o de índice `floor(v × k)` na ordem da fase (último sorteio,
   não muda mais nada). Fase manual com mais de um `secret` faz o build falhar.
7. **Spawns novos nos 10 trechos provisórios.** *Suposição:* espinhoso em `climb` (4) e
   `spikes` (6); voador vertical em `gaps` (3) e `summit` (10); item secreto em `gaps`,
   `spikes`, `ledge` e `summit`, depois de um vão ou atrás de espinhos. Nenhum inimigo
   novo sobre um vão (o `game` confere pela prévia; a conferência no build é do 1h). A
   fase 1 não muda.
8. **Decidido (architect): tema provisório dos blocos de expansão.** Até o 1g3, cada
   tema de expansão usa a tabela de tiles e o fundo (faixa, céu, tom) do tema do pack
   base mais parecido: fazenda → campo (plantação, grama), fábrica → caverna (escuro,
   sem cobertura), templo → deserto (pedra clara, areia), doces → neve (claro, coberto),
   castelo → caverna (pedra escura). O `theme` da fase já é o id real (`farm`...); só a
   aparência é emprestada, por um mapa único `PROVISIONAL_THEME` em
   `src/domain/theme.ts`. O 1g3 tira a entrada do mapa e só as fases daquele bloco
   mudam. Os inimigos já usam a variante do próprio tema (decisão 2).
9. **Céu, faixa e tom dos 5 temas do pack base (valores visuais).** *Suposição*, a
   aprovar pelo usuário vendo `?fase=1`, `11`, `31`, `41` e `71` no `pnpm dev`:

   | Tema | Faixa (folha de fundos) | Céu | Tom sobre a faixa |
   |---|---|---|---|
   | Campo | verde | `#9fd8ff` | nenhum |
   | Floresta | verde | `#a6cdb0` | `#7aa07a` (mata mais escura; ajustada na aprovação) |
   | Deserto | laranja | `#ffe0aa` | nenhum |
   | Caverna | clara 1 | `#2b2540` | `#5a4f73` (faixa escurecida) |
   | Neve | clara 2 | `#e3f2ff` | nenhum |

   **Faixas aprovadas na tarefa 1** (`.preview/backgrounds.png`: 4 faixas de 48 px, 2
   quadros de largura, linhas céu/faixa/base): campo e floresta na verde com árvores
   (colunas 6–7), deserto na laranja com palmeiras (4–5), caverna na clara com árvores
   (0–1), neve na clara com pinheiros (2–3). Céu e tom continuam a aprovar no `pnpm dev`.
   As 4 faixas são lidas na folha `tilemap-backgrounds_packed.png` pela tarefa 2 (hoje
   a cena usa a primeira, de 96 px de largura, com céu, faixa e base em y 0, 24 e 48);
   o céu do pack deixa de ser desenhado: no lugar, um retângulo da cor do tema; faixa e
   base levam o tom. Se a caverna escura deixar jogador, espinho ou inimigo pouco
   legível (ADR 0015), o tom clareia.

## Objetivo

As fases mudam de cara a cada 10: campo, floresta, deserto, caverna e neve completos com
o pack base, e os blocos de fazenda, fábrica, templo, doces e castelo já marcados com o
tema certo, usando por enquanto a aparência de um tema do pack base (o 1g3 os completa).
Cada tema tem o seu céu, faixa de fundo, terreno, decoração e variante dos inimigos.
Aparecem dois inimigos novos, o espinhoso (não pode ser pisado) e o voador vertical, e as
fases passam a ter o lugar do item secreto, que o desafio usa no 1i2.

## Critérios de aceitação

- Dado `pnpm dev`, quando abre `?fase=1`, `11`, `31`, `41` e `71`, então vê campo,
  floresta, deserto, caverna e neve, cada um com o seu céu, faixa, terreno e
  decoração, e com jogador, inimigos, espinhos e moedas legíveis.
- Dadas as fases 10, 11, 30, 31, 41, 51, 61, 71, 90, 91 e 100, então o tema é campo,
  floresta, fazenda, deserto, caverna, fábrica, templo, neve, doces, castelo e castelo.
- Dada a fase 25 (fazenda, provisória), então os tiles e o fundo são os do campo; dada a
  55 (fábrica), os da caverna; 65 (templo), do deserto; 85 (doces), da neve; 95
  (castelo), da caverna.
- Dado um trecho com um tile de areia desenhado direto, quando o build de fases roda,
  então falha com o arquivo, a camada, a coluna e a linha.
- Dado um mesmo trecho que aparece numa fase do campo e numa do deserto, então a
  geometria é a mesma, os tiles são outros, e as duas passam no validador com o mesmo
  resultado.
- Dada uma mudança só na tabela de tiles do deserto, quando o build roda, então só
  mudam as fases 31 a 40 e, enquanto o templo empresta o deserto (decisão 8), 61 a 70.
- Dada uma mudança só no céu ou no tom de um tema, então nenhum arquivo de fase muda.
- Dado o espinho da fase 95, então é o mesmo sprite do espinho da fase 5.
- Dada a fase 1, então o arquivo gerado continua o mesmo (mesmo `contentHash`); só o
  fundo da cena muda para o do campo.
- Dado um espinhoso, quando o jogador cai sobre ele, então perde 1 coração e é empurrado,
  sem quique, e o espinhoso continua andando; de lado, também fere.
- Dado um voador vertical, quando o jogador cai sobre ele, então ele é derrotado e a
  tentativa soma 200 pontos; de lado ou por baixo, fere.
- Dado o jogador invulnerável, quando cai sobre um espinhoso, então atravessa sem dano
  nem empurrão.
- Dadas as fases geradas, então não há espinhoso antes da fase 31 (tier 4) nem voador
  vertical antes da 41 (tier 5).
- Dada uma fase gerada com mais de um item secreto elegível nos trechos, então o arquivo
  tem no máximo um; sem nenhum elegível, nenhum.
- Dado o jogo (sem `?segredo=1`), então o item secreto não aparece; dado `pnpm dev` com
  `?fase=N&segredo=1` numa fase que tem item, então a gema aparece no lugar do spawn e
  encostar nela não faz nada.
- Dado o repositório, quando `pnpm levels:build` roda duas vezes, então as 100 fases
  saem iguais, passam no `levels:check` e o E2E conclui cada uma pelo atalho de teste.

## Fora de escopo

- Temas fazenda, fábrica, templo, doces e castelo com as expansões, tileset das
  expansões nas fases e cópia dos arquivos para `assets/kenney/` (1g3).
- Efeito do item secreto, modo desafio, vidas e top 10 (1i2).
- Biblioteca real de trechos, rota alta e conferência do arco de salto no build (1h); o
  voador sobre o vão do trecho `ledge` (fase 70) continua até lá.
- Apresentar o espinhoso e o voador vertical antes do primeiro encontro (já em "Para
  depois").
- Recolorir inimigos e fundo próprio por tema (descartados no ADR 0015).
- Morros acompanhando o chão (já em "Para depois").
- Faixa do HUD por tema: o HUD tem faixa própria, com contraste já conferido.
- Prévia em PNG com o fundo do tema (a prévia mostra os tiles trocados; o fundo se vê no
  jogo).

Nada novo copiado para "Para depois": o que tem valor próprio já está lá ou é o 1g3.

## ADRs aplicáveis

0004, 0008, 0009, 0010, 0012, 0013, 0014, 0015.

## Modelo de dados

Sem save. Arquivos:

- `levels/chunks/*.tmj`: spawns novos (decisão 7); tiles continuam na paleta base.
- `levels/generated/002.json` a `100.json`: regenerados (`generatorVersion` 2, tiles do
  tema, tipos novos, no máximo um `secret`). `001.json` não muda.
- `assets/kenney/`: **nenhum arquivo novo.** Terreno, decoração e gema estão na
  `tilemap_packed.png`, as 4 faixas na `tilemap-backgrounds_packed.png`, inimigos na
  `tilemap-characters_packed.png`, todos copiados no 1a. Se a decisão 2 pedir arquivo
  que não está lá, a cópia é do **usuário** (pasta protegida por hook), da
  `packs/pixel-platformer/`, com o SHA-256 no `SOURCE.md` no mesmo commit (ADR 0008).

## Contratos

- **`src/domain/theme.ts`** (novo): `Theme` com os 10 ids do ADR 0015 (`meadow`,
  `forest`, `farm`, `desert`, `cave`, `factory`, `temple`, `snow`, `candy`, `castle`);
  `THEMES` na ordem dos tiers; `themeOf(tier)`; `PROVISIONAL_THEME: Partial<Record<Theme,
  Theme>>` (decisão 8); `lookOf(theme)` → o próprio tema ou o provisório;
  `applyTheme(terrain, decor, theme, table = THEME_TILES)` → novas listas (usa
  `lookOf`).
- **`src/domain/tiles.ts`:** `THEME_TILES: Partial<Record<Theme, ReadonlyMap<number,
  number>>>` só com os 5 do pack base (GID base → GID do tema, 0 = sai; decisão 1, a
  única do projeto); `BASE_PALETTE` (as chaves); os GIDs de terreno novos no conjunto
  de sólidos; `ENEMY_FRAMES: Record<Theme, Record<EnemyType, readonly number[]>>`
  (decisão 2, os 10); `SECRET_TILE = 67` (a gema, GID 68).
- **`src/game/themes.ts`** (novo): `THEME_LOOKS: Partial<Record<Theme, { strip: {
  x: number; width: number }; sky: number; tint: number | null }>>` com os 5 do pack
  base (decisão 9); a cena usa `THEME_LOOKS[lookOf(theme)]`. Não é importado pelo
  `domain` nem pelo build de fases.
- **`src/domain/curve.ts`:** `SPIKY_MIN_TIER = 4`, `FLYER_V_MIN_TIER = 5` (ADR 0014).
- **`src/domain/tmj.ts`:** `SPAWN_TYPES` com `spiky`, `flyer-v`, `secret` (e `minTier`
  neles); conferência de spawn de `spiky` (chão sólido embaixo) e `flyer-v` (célula não
  sólida nem espinho); em trecho e fase manual, GID de `terrain` ou `decor` fora de
  `BASE_PALETTE` → erro "fora da paleta base" com arquivo, camada, coluna e linha (depois
  da conferência de faixa de GID, que continua igual).
- **`src/domain/enemies.ts`:** `EnemyType` com `spiky` e `flyer-v`; `ENEMY_BOX` e
  `ENEMY_SPEED` deles (decisão 5); `patrolRange` com eixo (vertical só para `flyer-v`);
  `PatrolState` com `pos` no eixo do tipo; `enemyBox(type, x, y)`; `isStompable(type)`
  (falso só no espinhoso); `scoredAs(type)` → `"walker" | "flyer" | null` (voador
  vertical conta como voador, espinhoso não conta).
- **`src/domain/attempt.ts`:** contato com espinhoso é sempre dano (mesmo com `stomp`);
  `enemyDefeated` leva o tipo pontuado (`scoredAs`), então `score.ts`, o resumo e o HUD
  não mudam de forma.
- **`src/domain/generator.ts`:** depois de `join`, `applyTheme` pelo tema do tier, antes
  do validador; filtros de tier dos tipos novos; espinhoso e voador vertical entram na
  densidade; depois dos inimigos, o sorteio do item (decisão 6). Parâmetro opcional da
  tabela de temas (para o teste de "só mudam as fases 31 a 40 e 61 a 70").
- **`src/domain/level.ts`:** `GENERATOR_VERSION = 2`; `LevelInfo` ganha `theme` (do
  `tier` gravado, id real) e `secret: { id, x, y } | null`; `enemies` com os tipos
  novos.
- **`scripts/levels.ts`:** fase manual com a troca do tema (decisão 3) e com no máximo um
  `secret`.
- **`scripts/level-preview.ts`:** letras K (espinhoso), U (voador vertical), G (item
  secreto); `--sheet characters` gera `.preview/characters.png` numerada (quadros de
  24 px); `--sheet backgrounds` gera `.preview/backgrounds.png` com a grade das faixas.
- **`src/game/scenes/level-scene.ts`:** retângulo do céu na cor do tema; faixa e base
  pela `strip` do tema, com o tom; inimigos com quadros do tema e movimento no eixo do
  tipo; gema só com `showSecret`.
- **`src/game/entities/enemy.ts`:** quadros por tema e tipo, chave de animação por tema e
  tipo; voador vertical sem espelhar; posição em `x` e `y`.
- **`src/game/debug/level-from-url.ts`:** lê também `?segredo=1` (só no dev).
- **`src/game/test-hooks.ts`:** `level()` com `theme`, `look` (o tema da aparência) e
  `secret`; `enemies()` com `y`.

## Regras e casos de borda

- Tema, troca de tiles, fundo, legibilidade e variantes: ADR 0015. Tipos novos, pontos e
  item: ADR 0014. Ordem do sorteio e densidade: ADR 0013. Tipos de spawn: ADR 0012.
- As bordas na junção são refeitas na paleta base e só depois trocadas: a família de
  borda em `tiles.ts` continua só com os tiles do campo.
- A troca é tile a tile: um tile da paleta base sempre vira o mesmo do tema; o teste
  confere, para cada linha e cada tema, que `isSolid` e `isSpike` não mudam.
- Decoração que "sai" vira 0 na camada `decor`; terreno nunca sai.
- Floresta e campo têm o mesmo terreno: a fase 11 difere da 10 na decoração e no fundo,
  não na colisão.
- Tema sem entrada em `THEME_TILES` nem em `PROVISIONAL_THEME` → erro no build (nunca
  cai num padrão silencioso); o mesmo na cena para `THEME_LOOKS`.
- Cair sobre um andador e encostar num espinhoso no mesmo passo → o andador é derrotado,
  o espinhoso fere, empurrão no lugar do quique (ADR 0014).
- Cair exatamente no centro do espinhoso → empurrão para o lado oposto ao que o jogador
  olha (regra de empate do 1e, `knockbackDirection`).
- Voador vertical com espaço só para cima ou só para baixo → trilho só para esse lado;
  sem espaço nenhum → parado na célula do spawn.
- O item secreto não entra na densidade nem é inimigo; o validador continua ignorando-o.
- Animações ficam no cache do Phaser entre fases: a chave inclui tema e tipo, ou a fase
  31 aberta depois da 1 mostraria o inimigo do campo. O tom é por objeto e não vaza.

## Interface

Nenhuma tela nova nem texto novo em `strings.ts`. Muda o canvas: céu, faixa, terreno,
decoração e inimigos por tema; a fase 1 passa a mostrar o céu e a faixa do campo. O
`--color-sky` do CSS continua para o que fica fora do mapa e para as telas sem fase. O
HUD não muda (faixa própria). Menus sobre o canvas com o céu escuro da caverna: o anel de
foco de dois traços do `docs/DESIGN.md` já cobre; conferido à mão.

## Testes necessários

- **`src/domain/theme.test.ts`:** `themeOf` nos tiers 1 a 10 → os 10 temas na ordem;
  fases 10, 11, 30, 31, 41, 51, 61, 71, 90, 91, 100 (por `tierOf`) → campo, floresta,
  fazenda, deserto, caverna, fábrica, templo, neve, doces, castelo, castelo; `lookOf`
  dos 5 de expansão → campo, caverna, deserto, neve, caverna, e dos 5 do pack base →
  eles mesmos; `applyTheme` troca cada GID da tabela, tira a decoração sem
  equivalente, mantém o espinho; para cada GID da paleta base e cada tema, `isSolid` e
  `isSpike` iguais antes e depois; tema sem tabela nem provisório (fixture) → erro.
- **`src/domain/tmj.test.ts`:** trecho com GID 61 (areia) em `terrain` → erro "fora da
  paleta base" com coluna e linha; o mesmo na `decor` e em fase manual; GID 181 continua
  com o erro de faixa; `spiky` sem chão embaixo → erro; `flyer-v` dentro do terreno →
  erro; `secret` com `minTier: 3` → aceito; `minTier` em `spiky` e `flyer-v` → aceito.
- **`src/domain/generator.test.ts`:** espinhoso na fase 30 desligado e na 31 elegível;
  voador vertical na 40 desligado e na 41 elegível; fase 2 com 5 andadores e 1 `secret`
  → 2 andadores e 1 item; fase com 3 `secret` elegíveis → 1, o mesmo em duas gerações;
  `secret` com `minTier` 5 na fase 40 → nenhum; acrescentar um `secret` a um trecho não
  muda quais inimigos ficam ativos; o mesmo trecho numa fase do campo e numa do deserto
  → mesma máscara de sólidos, tiles diferentes, mesmo `checkReachable`; tabela do
  deserto trocada no parâmetro → das 100 fases com a biblioteca de fixture, só 31 a 40 e 61 a 70 (templo provisório)
  diferem; a fase 25 sai com os mesmos tiles que sairia com o tema campo.
- **`src/domain/enemies.test.ts`:** `flyer-v` em céu aberto na linha 6 → trilho das
  linhas 3 a 9; com sólido na linha 4 → começa na 5; spawn na linha 1 → para no topo
  (linha 0); spawn na linha 13 → para na 14; começa subindo; `stepPatrol` reflete nos
  dois limites; `spiky` com o mesmo trilho do `walker` no mesmo chão;
  `isStompable("spiky")` falso; `scoredAs` dos quatro tipos.
- **`src/domain/attempt.test.ts`** (casos-limite do ADR 0014): cair sobre espinhoso com 3
  corações → 2, `hurt`, sem `stomped`, espinhoso não derrotado; o mesmo invulnerável →
  nada; voador vertical pisado → derrotado, evento de voador; andador pisado e espinhoso
  tocado no mesmo passo → andador derrotado, `hurt`, sem quique.
- **`src/domain/score.test.ts`:** 1 voador e 1 voador vertical derrotados → linha de
  voadores com 2 e 400 pontos; espinhoso não aparece.
- **`src/domain/level.test.ts`:** `readLevelInfo` dá `theme` pelo `tier` (1 → campo, 3 →
  fazenda, 4 → deserto) e `secret` (ou `null`); `GENERATOR_VERSION` 2 na saída.
- **`scripts/build-levels.test.ts`:** `001.json` igual ao versionado; nas fases 31, 41 e
  71 nenhum GID 21 a 24 (grama) e algum do tema; na 11 a mesma colisão de terreno do
  campo e nenhum broto (125); na 30 nenhum de areia nem de neve; o espinho (69) nas
  fases 5 e 95 com o mesmo GID; nenhuma fase com mais de um `secret`; nenhum `spiky`
  antes da 31 nem `flyer-v` antes da 41; fase manual de fixture com dois `secret` →
  erro; manual de fixture no tier 4 sai com os tiles do deserto.
- **`src/game/themes.test.ts`:** cada tema do pack base tem `THEME_LOOKS`; cada tema de
  expansão resolve por `lookOf` para um que tem.
- Cobertura do `domain` ≥ 95% (ADR 0010).
- **E2E `e2e/themes.spec.ts`** (build `e2e`): `openLevel` 1, 10, 11, 21, 31, 41, 51,
  61, 71, 81, 91 e 100 → `level().theme` com o id do ADR 0015 e `level().look` com o
  da decisão 8; abrir a 1 e depois a 31 → `look` deserto e inimigos com a chave do
  deserto; sem `console.error`, `pageerror` nem violação de CSP.
- **E2E `e2e/enemies.spec.ts`** (acréscimo): numa fase gerada com espinhoso e voador
  vertical (procurada por `level().enemies` a partir da 41), com `freezeEnemies(true)`:
  `placePlayer` acima do espinhoso e cair → `hud()` com 2 corações, espinhoso vivo em
  `enemies()`; acima do voador vertical e cair → derrotado e pontos do HUD +200.
- **E2E `e2e/levels.spec.ts`:** continua concluindo as 100 (fases regeneradas).
- **À mão (`docs/ROTEIRO-TESTE.md`):** `?fase=1`, `11`, `31`, `41` e `71` mostram os 5
  temas (céu, faixa, terreno, decoração, inimigos), sem borda errada nas junções, com
  jogador, espinho, moeda e inimigo legíveis (caverna em especial); `?fase=21` com a
  aparência do campo; espinhoso fere ao ser pisado e voador vertical é derrotado
  pisando; `?fase=N&segredo=1` mostra a gema; fps da fase 100 (meta do ADR 0010).

## Tarefas por agente

Sem tarefa de `devops`: nenhuma dependência nova, nenhum passo novo no CI (o
`levels:check` já roda) e o módulo de debug já está na lista proibida do `check-dist`.

1. **game** — folhas numeradas: `--sheet characters` e `--sheet backgrounds` no
   `level-preview.ts`; proposta da tabela `ENEMY_FRAMES` dos 10 temas (decisão 2) e das
   faixas da decisão 9, para o usuário aprovar.
2. **game** — domínio do tema: `theme.ts` (10 temas, `PROVISIONAL_THEME`, `lookOf`,
   `applyTheme`), `THEME_TILES` dos 5 do pack base, `BASE_PALETTE`, sólidos novos e
   `SECRET_TILE` em `tiles.ts`; paleta base no `tmj.ts`; troca no gerador e na manual
   (`scripts/levels.ts`); `theme` no `LevelInfo`; testes. Conferir a tabela na prévia de
   uma fase de cada tema do pack base (decisão 1).
3. **game** — domínio dos inimigos e do item: tipos de spawn novos, trilho vertical,
   espinhoso no `attempt`, `scoredAs`, tiers mínimos, densidade, sorteio do item,
   `secret` no `LevelInfo`, `GENERATOR_VERSION` 2; testes.
4. **game** — trechos e fases: spawns novos nos trechos provisórios (decisão 7),
   conferidos pela prévia; `levels/README.md` com a paleta base (só campo; tabela dos
   temas em `tiles.ts`), as letras novas e a tabela de trechos; regenerar e versionar as
   100 fases.
5. **game** — cena: `src/game/themes.ts` (decisão 9), céu, faixa e tom por tema,
   inimigos por tema e tipo, voador vertical, espinhoso, gema com `showSecret` e
   `?segredo=1` no dev, atalho de teste com `theme`, `look`, `secret` e `y`. Mostrar ao
   usuário as 5 fases da decisão 9 para aprovar céu e tom.
6. **qa:** `e2e/themes.spec.ts`, acréscimo no `e2e/enemies.spec.ts`, E2E existentes
   verdes com as fases regeneradas; rodada à mão do roteiro.
7. **docs** (sessão principal): `docs/ROTEIRO-TESTE.md` com os 5 temas, o provisório,
   os inimigos novos e o `?segredo=1`; `docs/DESIGN.md`, linha do `--color-sky`: passa
   a ser só o fundo fora do mapa e das telas sem fase; o céu de cada tema mora em
   `src/game/themes.ts` (ADR 0015).

Fora de `docs/`, para a sessão principal: linha 5 do resumo do `CLAUDE.md` (texto na
resposta do architect); nada nos agentes nem no `.claude/hooks/config.json`. Se a
decisão 3 for aprovada, o architect acrescenta a linha ao ADR 0015.

## Riscos e alternativas descartadas

- **Tabela da analogia errada** (linha da folha com outro papel, sobretudo a da
  caverna): pega na prévia da tarefa 2 antes de regenerar; a correção é só na tabela.
- **Caverna escura ilegível:** conferida à mão; o tom clareia (decisão 9).
- **Cache de animação entre fases** com chave sem o tema: inimigo do tema anterior;
  coberto pelo E2E que abre 1 e depois 31.
- **Diff grande nas fases** (99 arquivos mudam): esperado; a 001 fica igual e o teste
  confere. O 1g3 muda de novo as fases 21–30, 51–70 e 81–100.
- **Voador vertical sobre um vão** num trecho provisório antes da conferência do 1h:
  evitado pela posição (decisão 7) e pela prévia.
- Descartado: deixar os blocos de expansão sem tema até o 1g3 (o `theme` da fase
  mudaria de novo e o E2E de temas não cobriria os 10); provisório por rodízio dos 5
  temas (não fica parecido com o tema final); `THEME_LOOKS` no `domain` (é visual, o
  gerador não usa); mostrar o item no jogo normal antes do desafio (ADR 0014).
