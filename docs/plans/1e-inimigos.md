# Inimigos

- Item do roadmap: 1e
- Status: Aprovado

## Decisões pendentes

Nenhum ADR Proposto ligado ao item. As regras de base são as do ADR 0006 (derrota caindo
sobre o inimigo com os pés acima do meio dele, quique, qualquer outro contato fere,
derrotado não volta na tentativa) e do ADR 0012 (`walker` e `flyer` já são tipos de
spawn aceitos). Ambiguidades que mudam o que se faz, cada uma com a suposição adotada (o
usuário confirma ou troca antes das tarefas). As decisões 4, 5, 6 e 13 já estão nos
ADRs: 4 a 6 nos casos-limite do ADR 0006, 13 no ADR 0012; o plano não é a fonte delas.

1. **Movimento no `domain`, sem corpo do Arcade.** *Suposição:* o inimigo não tem corpo
   de física nem gravidade; anda num trilho horizontal calculado uma vez ao carregar a
   fase, a partir do terreno (como espinhos e itens no 1d, o contato é por caixas no
   `domain`). Andador: a partir da célula do spawn, estende para cada lado enquanto a
   célula ao lado está livre (nem sólida nem espinho) e a de baixo dela é sólida; a borda
   do mapa conta como parede. Assim "vira na borda e na parede" sai do trilho: a frente
   do corpo encosta no fim da última célula com chão ou no começo da parede e ele volta.
   Espinho conta como parede para o andador (não anda por cima dele). Voador: estende até
   3 células para cada lado do spawn, parando antes de célula sólida, espinho ou borda do
   mapa. Os dois começam indo para a esquerda (na direção de quem chega).
2. **Velocidades e caixas.** *Suposição:* andador a 40 px/s, voador a 50 px/s (o jogador
   anda a 110). Caixa do andador 16×14 px, centrada no `x` e com a base no fundo da
   célula (pé no chão); do voador 16×12 px, centrada no `x` e no meio da linha do spawn.
   Desenho de 24×24 com a base no fundo da célula (andador) ou centrado nela (voador). As
   caixas são conferidas contra o desenho pelo agente `game` e podem encolher sem mudar a
   regra (como no 1d), desde que a decisão 3 continue valendo.
3. **"Pisar" com precisão.** *Suposição:* é pisão quando, no passo, as caixas se tocam
   (`overlaps`), a velocidade vertical do corpo no passo (a de antes do controle, a que o
   moveu) é maior que 0 e a base do jogador está no máximo na linha do meio do inimigo
   (`bottom ≤ (top + bottom) / 2`, empate conta como pisão). A "tolerância" é a metade de
   cima do inimigo, sem margem extra: com queda máxima de 6 px por passo (`MAX_FALL_SPEED`
   360 a 60 passos), o primeiro passo de contato caindo sempre cai na metade de cima (7 px
   no andador, 6 no voador). Um teste prende isso: `MAX_FALL_SPEED / PHYSICS_FPS` ≤ meia
   altura da menor caixa. Velocidade 0 (no topo do pulo ou parado) ou para cima → dano
   (caso-limite do ADR 0006).
4. **Lugar do pisão na ordem do passo.** *No ADR 0006 (Casos-limite).* queda → coleta → **pisão** →
   bandeira → dano (espinho e inimigo não pisado) → mola. Pisar e tocar a bandeira no mesmo
   passo conta o inimigo e conclui a fase. Impulso do passo: dano → empurrão (sem quique);
   senão, pisão → quique; senão, mola (a mola não lança no passo de dano nem no de
   pisão). Os inimigos andam no começo do passo, antes de se juntarem os contatos.
5. **Contato com inimigo durante a invulnerabilidade.** *No ADR 0006 (Casos-limite).* igual ao espinho: não
   fere nem empurra, o jogador atravessa; acabada a invulnerabilidade ainda em contato,
   fere. O pisão continua valendo durante a invulnerabilidade (derrota e quica).
6. **Dano de inimigo empurra.** *No ADR 0006 (Casos-limite).* sim, o mesmo empurrão do espinho (1d,
   decisão 3: `knockback`, para longe do centro do inimigo; espinhos e inimigos tocados no
   mesmo passo entram na média dos centros). Sem empurrão o jogador ficaria dentro do
   andador e levaria outro dano ao fim da invulnerabilidade. Pisar um inimigo e encostar
   de lado em outro no mesmo passo → o pisado é derrotado e o outro fere (ADR 0006: "qualquer
   outro contato"), com empurrão no lugar do quique. O inimigo não muda de direção ao
   ferir o jogador. Inimigos se atravessam e ignoram moedas, corações e molas.
7. **Quique.** *Suposição:* `STOMP_BOUNCE_SPEED` 300 px/s para cima (cerca de 2,5 tiles),
   igual com ou sem o pulo segurado, sem corte ao soltar e sem pulo no ar (coyote e buffer
   zerados, `cuttable` falso), `vx` segue o controle, como a mola. Quique mais alto
   segurando o pulo fica fora (Fora de escopo).
8. **Contagem para o 1f.** *Suposição:* a tentativa guarda os ids dos inimigos derrotados
   (cada spawn uma vez) e o total por tipo (`defeatedWalkers`, `defeatedFlyers`), legíveis
   pelo atalho de teste; nada na tela e nenhum ponto no 1e. A lista de eventos e os pontos
   (100 e 200, ADR 0006) são do 1f.
9. **Efeito de derrota.** *Suposição:* o inimigo derrotado deixa de tocar o jogador no
   mesmo passo, vira de cabeça para baixo (espelho vertical), dá um pulinho (150 px/s para
   cima) e cai com gravidade de 1000 px/s² na frente do terreno; some aos 1000 ms (a essa
   altura desceu 350 px e já saiu do mapa de 270 px de altura, de qualquer linha). Com
   reduzir efeitos: de cabeça para baixo, parado, some por opacidade em 300 ms. Sem
   piscar, sem tremor, sem partículas. A pose de cada instante é uma função pura no
   `domain` (`defeatPose`, como `deathPose` do 1d); a cena só desenha. Tempo contado em
   passos de física (pausa não anda).
10. **Inimigos no efeito de morte e na pausa.** *Suposição:* param durante o efeito de
    morte (o passo da cena já sai cedo) e na pausa (a cena pausa). Tentativa nova recria
    todos no spawn.
11. **Sprites.** *Suposição:* nada novo em `assets/kenney/`: a folha
    `Tilemap/tilemap-characters_packed.png` já copiada tem os inimigos. Quadros do mockup:
    andador 18, voador 24; segundo quadro da animação o vizinho (19 e 25), a confirmar pelo
    agente `game` olhando a folha; animação de 2 quadros, andador a 4 quadros/s e voador a
    8. Se a folha olhar para a esquerda, o espelho segue a direção como no jogador. Se
    faltar algo, a cópia é do usuário (pasta protegida) e o registro no `SOURCE.md` vai no
    mesmo commit (ADR 0008).
12. **Fase 1 nova.** *Suposição:* 180 tiles de largura (`targetTimeSeconds` 45, o dobro
    de tempo de jogo do 1c), chão base na linha 12 no começo e no fim, degraus e vãos
    dentro dos limites do validador (no máximo 3 de altura e 3 de vão, ADR 0005), cada
    elemento sozinho, com chão plano antes, na ordem pedida, exceto a moeda, que vem antes
    do espinho (a mola só leva a extras, 1d decisão 6, e as moedas no alto dela pedem que a
    moeda já tenha aparecido). Seções na tabela de "Modelo de dados". **A faixa de morros
    fixa para chão na linha 12 (desvio do 1b) continua valendo:** o chão base segue na
    linha 12 e os degraus só sobem, cobrindo os morros sem quebrá-los; muda no 1g.
13. **Spawn de inimigo conferido no build.** *No ADR 0012 (Spawns e Casos-limite).* `levels:build` falha (com
    arquivo, camada, coluna e linha, ADR 0012) se a célula de um `walker` ou `flyer` é
    sólida ou espinho, ou se a célula abaixo de um `walker` não é sólida (espinho não
    conta). Sem isso, um andador desenhado no ar ficaria parado flutuando (trilho vazio).
    Vale para trechos do 1h também.
14. **Atalho de teste.** *Suposição:* o atalho `window.__jorgeTest` (só no build `e2e`)
    ganha a lista de inimigos, um congelador do movimento deles (para o E2E acertar o
    pisão sem depender do relógio) e as posições da fase (espinhos, itens, inimigos,
    bandeira) em células, para os E2E do 1c e do 1d deixarem de fixar colunas da fase 1
    antiga.

## Objetivo

Na fase 1, o jogador encontra andadores, que vão e voltam no chão virando na borda e na
parede, e um voador, que vai e volta no ar. Caindo sobre eles, derrota-os e quica; tocando
de qualquer outro jeito, perde um coração e é empurrado. A fase 1 fica mais longa e
apresenta cada elemento sozinho, do pulo ao voador, e continua concluível à mão.

## Critérios de aceitação

- Dado um andador no chão, quando o jogador observa, então ele anda até uma parede ou até a
  beira do chão, vira e volta, sem cair nem atravessar a parede.
- Dado o voador, quando o jogador observa, então ele vai e volta no ar, sempre na mesma
  altura, num trecho curto.
- Dado o jogador caindo sobre um andador ou um voador, quando os pés tocam a metade de
  cima dele, então o inimigo é derrotado (vira e cai para fora da tela), o jogador quica e
  não perde coração.
- Dado o jogador andando contra um inimigo, ou subindo no pulo e batendo nele por baixo,
  ou parado quando o inimigo chega, então perde 1 coração, é empurrado para longe e pisca
  por 1,5 s.
- Dado o jogador piscando, quando encosta num inimigo, então não perde coração nem é
  empurrado; quando cai sobre ele, derrota-o normalmente.
- Dado um inimigo derrotado, quando o jogador volta ao lugar dele na mesma tentativa,
  então ele não está lá; quando a fase recomeça (morte ou "Jogar de novo"), ele está de
  volta.
- Dado o jogador com 1 coração, quando um inimigo o fere, então ele vira anjinho e a fase
  recomeça, como no espinho.
- Dado "Reduzir efeitos" ligado, quando o jogador derrota um inimigo, então o inimigo fica
  de cabeça para baixo parado e some aos poucos, sem cair.
- Dado o jogo pausado, quando o jogador continua, então os inimigos estão onde estavam.
- Dada a fase 1 nova, quando o dono a joga à mão, então encontra, um de cada vez e nessa
  ordem, o pulo, o vão, a moeda, o espinho, a mola, o coração, o andador e o voador, e
  chega à bandeira (roteiro).

## Fora de escopo

- Pontos por inimigo, eventos da tentativa, contagem na tela, resumo de fim de fase (1f).
- Validador de alcance e ativação de inimigos por densidade e tier (1g); a fase manual
  desenha todos os spawns (1d, decisão 13), inclusive o voador, que nas geradas só sai do
  tier 3 (ADR 0005).
- Inimigo com gravidade, que cai de plataformas ou é empurrado; inimigo que persegue o
  jogador ou muda de direção ao ferir; inimigos que se ferem entre si.
- Voador com trajetória vertical, em onda ou em círculo.
- Quique mais alto segurando o pulo; combo por pisões seguidos.
- Mais tipos de inimigo e chefes (já em "Para depois").
- Partículas, números flutuando, tremor de câmera, sons (sons já em "Para depois").

Copiados para "Para depois" do `docs/ROADMAP.md`: voador com trajetória vertical ou em
onda; quique mais alto segurando o pulo. O resto já é item da Fase 1 ou já estava na
lista, ou é detalhe sem valor próprio.

## ADRs aplicáveis

0004, 0005, 0006, 0008, 0009, 0010, 0012.

## Modelo de dados

Sem save. Muda a fase 1 (`levels/manual/001.tmj`, reescrita por agente, ADR 0012) e, com
ela, `levels/generated/001.json` e o `contentHash` da fase 1 (esperado: ainda não há save
que dependa dele). Spawns de `walker` e `flyer` são pontos no centro da célula, sem
propriedade nova (o subconjunto do ADR 0012 já os aceita).

Fase 1 nova, 180 × 15, chão base na linha 12 (posições exatas ajustáveis pela prévia,
mantendo a ordem, os limites do validador e as distâncias de respiro):

| Colunas | Elemento | Conteúdo |
|---|---|---|
| 0–15 | andar | `start` (2, 11), placa na coluna 4, chão plano |
| 16–35 | pulo | bloco de 1 de altura na coluna 20; degrau de 2 (topo na linha 10) nas colunas 26–31; desce na 32 |
| 36–55 | vão | vão de 2 (colunas 38–39); chão; vão de 3 (colunas 46–48) |
| 56–70 | moeda | 3 moedas no caminho (58, 60 e 62, linha 11); 1 no alto, pedindo pulo (66, 8) |
| 71–88 | espinho | 1 espinho (75, 11); chão; 2 espinhos (81 e 82, linha 11) |
| 89–104 | mola | mola (93, 11); plataforma de uma linha na linha 7, colunas 95–99, com 2 moedas (96 e 98, linha 6) |
| 105–118 | coração | coração no ar (110, 9), alcançável com um pulo do chão |
| 119–138 | andador na parede | paredes de 1 de altura nas colunas 121 e 135 (linha 11); `walker` (128, 11), trilho 122–134 |
| 139–158 | andador na borda | mesa de 2 de altura (topo na linha 10) nas colunas 142–150; `walker` (146, 9), vira nas duas bordas |
| 159–172 | voador | `flyer` (166, 9), trilho 163–169; passa-se por baixo sem pular (o topo do jogador em pé fica abaixo da caixa dele) ou pula-se nele |
| 173–179 | bandeira | `flag` (176, 11) |

Total: 6 moedas, 1 coração, 1 mola, 3 espinhos, 2 andadores, 1 voador.

## Contratos

- **`src/domain/tiles.ts`:** `ENEMY_FRAMES = { walker: [18, 19], flyer: [24, 25] }` e
  `ENEMY_FACES_RIGHT` (quadros da folha de personagens, decisão 11).
- **`src/domain/physics.ts`:** `STOMP_BOUNCE_SPEED` 300.
- **`src/domain/movement.ts`:** `stompBounce(vx)` → `MovementStep` com `vy =
  −STOMP_BOUNCE_SPEED`, trava, coyote e buffer zerados, `cuttable` falso.
  `springLaunches(vy, hurt, stomped)` → falso também com `stomped`.
- **`src/domain/enemies.ts`** (novo):
  - `EnemyType = "walker" | "flyer"`; `WALKER_SPEED` 40, `FLYER_SPEED` 50,
    `FLYER_RANGE_CELLS` 3, `ENEMY_BOX = { walker: { width: 16, height: 14 }, flyer: {
    width: 16, height: 12 } }`.
  - `patrolRange(type, cell, terrain: readonly number[], width)` → `{ min, max }` (`x` do
    centro, px), pelas regras da decisão 1; sólido = GID ≠ 0 e fora de `SPIKE_TILES`.
  - `PatrolState = { x, direction: -1 | 1 }`; `initialPatrol(range, x)` → direção −1.
  - `stepPatrol(state, range, speed, dtMs)` → anda e, passando de `min` ou `max`, reflete
    o excesso e vira; com `min === max`, fica parado.
  - `enemyBox(type, x, row)` → `Rect` (decisão 2).
  - `isStomp(player: Rect, vy, enemy: Rect)` → decisão 3.
  - `DEFEAT_HOP_SPEED` 150, `DEFEAT_GRAVITY` 1000, `DEFEAT_MS` 1000, `DEFEAT_FADE_MS`
    300; `defeatPose(elapsedMs, reduceEffects)` → `{ dy, alpha }` (px inteiros, sempre de
    cabeça para baixo); `defeatFinished(elapsedMs, reduceEffects)`.
- **`src/domain/attempt.ts`:**
  - `AttemptState` ganha `defeated: readonly number[]`, `defeatedWalkers`,
    `defeatedFlyers`.
  - `AttemptContacts` ganha `enemies: readonly EnemyContact[]`, com `EnemyContact = { id,
    type: EnemyType, stomp: boolean }`.
  - `AttemptStep` ganha `defeated: EnemyContact[]` e `stomped: boolean`.
  - `stepAttempt` na ordem da decisão 4: id já derrotado é ignorado; `stomp` derrota
    (com ou sem invulnerabilidade); contato sem `stomp` conta como dano, junto com o
    espinho (um dano só por passo, respeitando a invulnerabilidade).
- **`src/domain/level.ts`:** `readLevelInfo` devolve `enemies: { id, type, x, y, row,
  range }[]` (`range` de `patrolRange`, do `data` de `terrain`).
- **`src/domain/tmj.ts`:** a conferência da decisão 13.
- **`src/game/entities/enemy.ts`** (novo): sprite de 24×24 com a animação de 2 quadros,
  espelho pela direção, `place(x)`, `showDefeat(pose)`. Sem corpo de física.
- **`src/game/scenes/level-scene.ts`**, a cada passo jogando: `stepPatrol` de cada
  inimigo vivo (exceto congelado pelo atalho); contatos com `enemyBox` e `isStomp` (com o
  `vy` do corpo antes do controle); `stepAttempt`; derrotados entram no efeito; impulso
  pela prioridade da decisão 4 (`knockback` com os centros de espinhos e inimigos
  tocados, `stompBounce`, `springBounce`); inimigos em efeito de derrota andam pela
  `defeatPose` e somem em `defeatFinished`.
- **`src/game/test-hooks.ts`:** `state()` ganha `defeatedWalkers` e `defeatedFlyers`;
  `enemies()` → `{ id, type, x, y, col, row, defeated }[]`; `freezeEnemies(frozen)`;
  `level()` → `{ start, flag, spikes, items, enemies }` em células.

## Regras e casos de borda

- Regra no `domain` (ADR 0004): a cena não decide pisão, dano, trilho nem pose; junta
  caixas, chama as funções e aplica. Nenhum número de velocidade, caixa ou tempo na cena.
- Cada inimigo é derrotado uma vez por tentativa, mesmo tocado em vários passos seguidos.
- Dois inimigos pisados no mesmo passo → os dois derrotados, um quique.
- Andador num trilho de uma célula só (`min === max`) fica parado, virado para a esquerda.
- Andador ao lado da borda do mapa: a borda é parede.
- Empurrão do inimigo contra parede: como no espinho, o corpo para e a trava continua.
- Posições desenhadas em pixel inteiro; nada pisca (ADR 0009).

## Interface

Implementa do mockup (tela de jogo) o andador e o voador com os quadros 18 e 24 da folha de
personagens. Nenhum token, componente ou texto novo em `strings.ts`; nada novo no HUD.

## Testes necessários

- **`src/domain/enemies.test.ts`:**
  - `patrolRange` andador, mapa 10 de largura, chão (linha 12) nas colunas 2–7, spawn
    (4, 11) → `{ min: 44, max: 136 }`; com parede em (6, 11) → `max` 100; com espinho em
    (3, 11) → `min` 80; chão nas colunas 0–9 → `{ min: 8, max: 172 }` (borda do mapa).
  - `patrolRange` voador, largura 20, spawn (5, 8), ar livre → `{ min: 44, max: 154 }`;
    parede em (7, 8) → `max` 118; spawn (1, 8) → `min` 8.
  - `stepPatrol`: `x` 50, direção −1, 40 px/s, 1000/60 ms → 49,333…; `x` 44,2 indo para a
    esquerda no trilho 44–136 → 44,467 (±0,001) e direção 1; `min === max` → `x` igual.
  - `enemyBox("walker", 128, 11)` → 120–136 × 202–216; `("flyer", 166, 9)` → 158–174 ×
    165–177.
  - `isStomp` com a caixa 202–216 (meio 209): base 203 e `vy` 300 → verdadeiro; base 209
    → verdadeiro; 210 → falso; base 203 com `vy` 0 → falso; com −100 → falso; base 202
    (sem sobrepor) → falso.
  - `MAX_FALL_SPEED / PHYSICS_FPS` ≤ metade da altura da menor caixa (decisão 3).
  - `defeatPose`: em 0 ms `dy` 0 e opacidade 1; em 150 ms `dy` −11 (subindo); em 1000 ms
    `dy` 350; com reduzir efeitos `dy` 0 sempre, opacidade de 1 a 0 em 300 ms;
    `defeatFinished` falso em 999 e verdadeiro em 1000 (300 com reduzir efeitos).
- **`src/domain/attempt.test.ts`** (casos-limite do ADR 0006 e decisões 4 a 6):
  - Pisão no andador de id 7 → `defeated` [7], `defeatedWalkers` 1, corações 3,
    `stomped` verdadeiro; id 7 de novo no passo seguinte → nada muda.
  - Contato sem pisão → 2 corações, invulnerável, `hurt`; invulnerável → continua 2.
  - Invulnerável e pisão no voador → `defeatedFlyers` 1, corações iguais.
  - Espinho e andador no mesmo passo → perde só 1. Espinho e, 1000 ms depois, andador → só
    o primeiro tira coração.
  - Pisão em um e contato de lado em outro → um derrotado e `hurt`.
  - Bandeira e pisão no mesmo passo → `completed` com `defeatedWalkers` 1; bandeira e
    contato → `completed` sem dano.
  - 1 coração e contato → `dead`.
  - Tentativa nova (`initialAttempt`) → `defeated` vazio e contagens 0.
- **`src/domain/movement.test.ts`:** `stompBounce(110)` → `vx` 110, `vy` −300; solto o
  pulo com `vy` −280 → continua −280; pulo apertado no ar logo depois → não pula.
  `springLaunches(100, false, true)` → falso.
- **`src/domain/level.test.ts`:** fase 1 gerada → 2 andadores e 1 voador com ids e
  trilhos (o andador da coluna 128 com `{ min: 2204, max: 2422 }`, ou o que a tabela der
  depois da prévia), 6 moedas, 1 coração, 1 mola, 3 espinhos, largura 180,
  `targetTimeSeconds` 45.
- **`src/domain/tmj.test.ts`** (decisão 13): `walker` com a célula de baixo vazia → erro
  com coluna e linha; `walker` sobre espinho → erro; `flyer` dentro de terreno → erro;
  `walker` no chão → aceito.
- `pnpm levels:build` duas vezes → mesmo arquivo; cobertura do `domain` ≥ 95% (ADR 0010).
- **E2E (`e2e/enemies.spec.ts`, desktop, build `e2e`, esperas por `waitForFunction`), para
  cada tipo:**
  - Pisão: `freezeEnemies(true)`, `placePlayer(col, row − 3)` sobre o inimigo → o
    inimigo fica `defeated`, a contagem do tipo vai a 1, corações 3 e `vy` < 0 em algum
    quadro depois do contato (quique).
  - Contato: `placePlayer(col, row)` na célula do inimigo → corações 2 e invulnerável;
    de novo enquanto invulnerável → continua 2.
  - Derrotado não volta: depois do pisão, `placePlayer` na célula dele → corações 3; morte
    por queda → `enemies()` com todos vivos e contagens 0.
  - Trilho: sem congelar, amostrar o `x` do andador por 4 s → sempre dentro do trilho e
    com as duas direções; pausar 1 s → `x` igual ao continuar.
  - Nenhum `console.error`, `pageerror` ou violação de CSP; axe sem violações.
- **E2E existentes (`hazards.spec.ts`, `player.spec.ts`):** passam a tirar as células da
  fase de `level()` em vez de colunas fixas; continuam passando na fase nova.
- **À mão (`docs/ROTEIRO-TESTE.md`):** fase 1 nova do início à bandeira no Chrome ou Edge
  do notebook: pisão nos dois tipos, dano de lado e por baixo, andador virando na parede e
  na borda, voador indo e voltando, efeito de derrota com e sem reduzir efeitos, morte por
  inimigo; fps médio ≥ 55; a fase não pareceu curta.

## Tarefas por agente

1. **devops:** nada neste item (sem dependência nova, sem mudança de build ou CI).
2. **game** — domínio: confirmar os quadros dos inimigos na folha de personagens;
   `tiles.ts`, `STOMP_BOUNCE_SPEED`, `stompBounce` e `springLaunches`, `enemies.ts`
   novo, `attempt.ts` estendido, `readLevelInfo` com inimigos e trilhos, conferência de
   spawn de inimigo em `tmj.ts` (Contratos), com os testes de unidade.
3. **game** — fase 1 nova: reescrever `levels/manual/001.tmj` pela tabela, conferir pela
   prévia em PNG e pelo build (duas vezes, mesmo arquivo); `levels/generated/001.json`
   regenerado.
4. **game** — cena: entidade `enemy.ts`, trilho a cada passo, contatos, pisão, dano e
   prioridade de impulso, efeito de derrota, parada no efeito de morte; atalho de teste
   estendido.
5. **qa** — testes da seção Testes necessários, ajuste dos E2E do 1c e do 1d para
   `level()`, rodada à mão do roteiro com o registro na tabela.
6. **docs** — `docs/ROTEIRO-TESTE.md`, "O que fazer": linha de inimigos (pisão, dano,
   trilho, efeito de derrota) e a fase 1 nova do início à bandeira.

Fora de `docs/`, para a sessão principal: nada no `CLAUDE.md`, em
`.claude/hooks/config.json` nem nos agentes. As decisões 4 a 6 e 13 já estão nos ADRs
0006 e 0012.

## Riscos e alternativas descartadas

- **Pisão perdido em queda rápida:** se `MAX_FALL_SPEED` subir acima de 6 px por passo
  com as caixas atuais, o primeiro contato pode cair na metade de baixo. Preso por teste.
- **`vy` errado no pisão:** usar o `vy` devolvido pelo controle (que pode ser o do pulo
  pelo buffer) em vez do que moveu o corpo. O contrato fixa o do corpo antes do controle.
- **Trilho calculado errado na borda do mapa ou com espinho:** coberto por unidade; o
  agente confere o trilho dos inimigos da fase 1 pela prévia.
- **E2E frágil por posição de inimigo em movimento:** o congelador do atalho de teste
  evita depender do relógio.
- **E2E antigos quebrando com a fase nova:** passam a ler as células de `level()`.
- Descartado: inimigo com corpo do Arcade e colisor com o terreno (vira e borda decididos
  na cena, sem teste de unidade; ADR 0004); virar ao detectar a borda passo a passo (dá o
  mesmo trilho, com mais estado); quique fixo sem empurrão no dano por inimigo (o jogador
  fica dentro do andador); voador com trilho do tamanho do vão livre (pode cruzar a fase
  inteira); fase 1 com mais de 200 tiles (o tutorial fica arrastado, e o
  `targetTimeSeconds` acima de 50 s pesa no bônus).
