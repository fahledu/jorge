# Perigos e coletáveis

- Item do roadmap: 1d
- Status: Aprovado (2026-11-18), com o efeito de morte pedido pelo usuário (decisão 14)

## Decisões pendentes

Nenhum ADR Proposto ligado ao item. As regras são as do ADR 0006 (3 corações, dano de 1,
1,5 s de invulnerabilidade, espinho com empurrão, mola com pulo alto, morte por 0
corações); os números novos são constantes, não regra (como no 1c). Ambiguidades que
mudam o que se faz, cada uma com a suposição adotada (o usuário confirma ou troca antes
das tarefas):

1. **Espinho sólido ou não.** *Suposição:* deixa de ser sólido (o 1c o tratava como
   terreno só até aqui). Fere pela caixa do desenho: metade de baixo do tile, 2 px de
   folga de cada lado (14×9 px). Bate com o ADR 0005 ("espinhos não servem de chão"):
   quem pisa nele cai no que houver embaixo.
2. **Espinho durante a invulnerabilidade.** *Suposição:* não fere nem empurra; o jogador
   atravessa. Terminada a invulnerabilidade com o jogador ainda em cima, fere de novo.
   Assim ninguém fica preso entre espinhos, e pagar 1 coração para passar é jogada válida.
3. **Empurrão "para trás".** *Suposição:* para longe do espinho, não para trás do
   personagem: se o centro do jogador está à esquerda do centro dos espinhos tocados, vai
   para a esquerda; à direita, para a direita; empatado (caiu bem em cima), para o lado
   contrário ao que ele olha. Valores: 160 px/s na horizontal e 250 px/s para cima (cerca
   de 1,7 tile de altura), com o controle horizontal e o pulo travados por 250 ms (15
   passos). O impulso não é cortado ao soltar o pulo (o corte do pulo variável do 1c só
   vale para o pulo do jogador). Ajustável no teste à mão sem mudar os testes de forma.
4. **Pisca da invulnerabilidade.** *Suposição:* o personagem alterna opacidade 0,4 e 1 a
   cada 250 ms (2 piscadas por segundo, abaixo do limite de 3 do ADR 0009); com reduzir
   efeitos, opacidade fixa de 0,5. Sem tremor de câmera nem flash. Até o 1i e o 1j
   trazerem a configuração salva, reduzir efeitos vem de
   `matchMedia('(prefers-reduced-motion: reduce)')`, lido no `main.ts` ao abrir.
5. **Mola.** *Suposição:* spawn `spring` desenhado na célula, não sólido. Tocar a caixa
   dela sem estar subindo (velocidade vertical ≥ 0, inclusive andando no chão) lança o
   jogador a 520 px/s para cima (cerca de 7 tiles), sem depender de segurar o pulo e sem
   corte ao soltar; zera coyote e buffer (não dá para pular de novo no ar). Caixa: célula
   inteira na largura menos 1 px de cada lado, metade de baixo na altura (16×9 px),
   conferida pelo desenho. Dois quadros: mola comprimida por 150 ms ao lançar, depois
   estendida. Com ela, a plataforma da linha 7 da fase 1 (5 tiles acima do chão, com o
   coração) fica alcançável, como o plano 1c previa.
6. **Mola no validador de alcance (1g).** *Suposição:* o validador ignora a mola (não
   ajuda nem atrapalha) e o caminho até a bandeira não pode depender dela; mola só leva a
   extras (coração, moedas). O ADR 0005 não fala da mola: **o plano do 1g acrescenta
   essa linha ao ADR 0005** (ou, se trechos do 1h quiserem mola obrigatória, muda o
   validador por ADR). Nada muda no 1d: a fase 1 já chega à bandeira sem a mola.
7. **Moedas sem HUD.** *Suposição:* a moeda some ao ser tocada e entra na contagem da
   tentativa no `domain` (cada spawn conta uma vez), legível pelo atalho de teste; não
   aparece número na tela no 1d. Moeda parada (sem animação). Contagem, pontos e tempo
   no HUD, e a lista de eventos da tentativa, são do 1f.
8. **Corações na tela já no 1d.** *Suposição:* sim, só os corações: sem eles o dano não
   se vê à mão (critério "Pronto quando"). Faixa do HUD do mockup no topo (22 px, largura
   toda, `--color-bg` a 80%, DESIGN.md) com 3 corações (cheio e vazio); o 1f acrescenta
   moedas, pontos, tempo e fase na mesma faixa. É um pedaço do escopo do 1f trazido para
   cá. A cor do token é lida do CSS uma vez em `create-game.ts` e passada à cena.
9. **Coração com 3 corações.** *Suposição:* é consumido (some) e os corações continuam
   3, como o caso-limite do ADR 0006 diz ("coletado").
10. **Ordem num passo da física.** *Suposição:* queda → coleta (moedas e corações) →
    bandeira → dano → mola. Coração e espinho no mesmo passo com 1 coração → sobrevive
    com 1; bandeira e espinho no mesmo passo → fase concluída, sem dano; levou dano no
    passo → a mola não lança nesse passo. A ordem e a decisão 2 já são casos-limite do
    ADR 0006 (o 1e as usa para os inimigos).
11. **Morte por 0 corações.** *Suposição:* recomeço imediato da fase como na queda (1c),
    tentativa nova com 3 corações e as moedas e corações de volta. A mensagem "Ops!" do
    mockup é do 1f. O recomeço vem depois do efeito de morte (decisão 14).
12. **Assets.** *Suposição:* nada novo em `assets/kenney/`: tudo está em
    `Tilemap/tilemap_packed.png`, já copiado. Ids locais (os do mockup): espinho 68 (GID 69
    da paleta), moeda 151, coração cheio 44 e vazio 46; os 2 quadros da mola escolhidos
    pela folha numerada: estendida 108, comprimida 107. Asas do anjinho: 144 (decisão
    14). Se faltar algo, a cópia é do
    usuário (pasta protegida) e o registro no `SOURCE.md` vai no mesmo commit (ADR 0008).
14. **Efeito de morte (pedido do usuário na aprovação).** Nas duas mortes do ADR 0006
    (0 corações e queda), em vez de recomeçar na hora, o personagem vira anjinho e sobe
    até sair da tela; só então a fase recomeça. Com os assets que já temos: o próprio
    sprite do jogador, as asas brancas do tile 144 da folha de tiles atrás dele, batendo
    (alternando o espelho vertical a cada 250 ms, 2 vezes por segundo) e uma auréola
    desenhada (elipse 10×3 px, contorno de 1 px na cor do token `--color-primary`, lida
    do CSS como a do HUD). Sequência: 300 ms parado no lugar da morte (na queda, na borda
    de baixo da tela, na coluna em que caiu), depois sobe a 120 px/s balançando 4 px para
    os lados num ciclo de 1 s, até a auréola passar da borda de cima da tela. Com reduzir
    efeitos: sem balanço nem bater de asas, parado no lugar e some por opacidade em
    600 ms. Durante o efeito o corpo sai da física (sem gravidade nem colisão), os
    comandos ficam desligados e o estado do atalho de teste é `dying`; o tempo conta em
    passos de física, como a invulnerabilidade. Os números e a pose de cada instante
    ficam no `domain` (`death.ts`, função pura `deathPose`); a cena só desenha.

13. **Spawns com `minTier`.** *Suposição:* o jogo desenha todo spawn `coin`, `heart` e
    `spring` do arquivo da fase; desligar por tier é do gerador (1g), que grava só os
    ativos. A fase 1 não usa `minTier`. `walker` e `flyer` seguem sem desenho (1e).

## Objetivo

Na fase 1, o jogador começa com 3 corações, perde 1 ao tocar um espinho (e é empurrado
para longe dele, com um instante de invulnerabilidade), recupera corações coletando-os,
pega moedas e usa a mola para alcançar a plataforma alta. Com 0 corações a fase recomeça.
As regras e os números ficam puros no `domain`; a cena só aplica.

## Critérios de aceitação

- Dado o início da fase, então aparecem 3 corações cheios no topo da tela, numa faixa
  escura.
- Dado o jogador com 3 corações, quando toca um espinho, então fica com 2 (um coração do
  topo esvazia), é empurrado para longe do espinho e um pouco para cima, e pisca por
  1,5 s.
- Dado o jogador piscando, quando toca de novo um espinho, então não perde coração nem é
  empurrado; passado o 1,5 s, o espinho volta a ferir.
- Dado o jogador com 1 coração, quando toca um espinho, então a fase recomeça do início
  com 3 corações, e moedas e corações coletados estão de volta no lugar.
- Dado o jogador que cai no espinho de cima, então ele não fica em pé no espinho.
- Dado o jogador que morre (0 corações ou queda), então ele vira anjinho (asas e
  auréola) e sobe até sair da tela, e só depois a fase recomeça; com reduzir efeitos,
  some parado no lugar.
- Dado o jogador com 2 corações, quando toca um coração, então fica com 3 e o coração
  some; com 3, o coração some e continuam 3.
- Dado o jogador, quando toca uma moeda, então ela some e não volta na mesma tentativa.
- Dado o jogador andando ou caindo, quando toca a mola, então ela se comprime e o lança
  bem mais alto que o pulo, mesmo sem segurar a tecla; da mola da fase 1 ele alcança a
  plataforma alta com o coração.
- Dado "Reduzir efeitos" ligado (pelo sistema), quando leva dano, então o personagem fica
  semitransparente por 1,5 s em vez de piscar.
- Dado o jogo pausado com o jogador piscando, quando continua, então o tempo de
  invulnerabilidade não andou durante a pausa.
- Dada a fase 1, quando o dono a joga à mão, então vê o dano no espinho, os dois danos
  seguidos que tiram só um coração, a morte por 0 corações, a mola até o coração e a
  coleta de moedas (roteiro).

## Fora de escopo

- Inimigos, dano por inimigo e se o inimigo também empurra (1e); fase 1 alongada (1e).
- Contagem de moedas, pontos e tempo na tela, eventos e pontuação da tentativa, resumo de
  fim de fase e o aviso "Ops!" ao perder a tentativa (1f).
- Configuração "Reduzir efeitos" salva e na tela de configurações (1i, 1j).
- Mola no validador e ativação de spawns por `minTier` (1g).
- Animação da moeda, partículas ao coletar, tremor de câmera: não pedidos.
- Sons ao coletar e ao levar dano (já em "Para depois": sons).

Nada copiado para "Para depois" do roadmap: o que não entra já é item da Fase 1 ou já
está na lista.

## ADRs aplicáveis

0004, 0005, 0006, 0008, 0009, 0010, 0012.

## Modelo de dados

Sem save e sem mudança nos arquivos de fase: a fase 1 (`levels/manual/001.tmj`) já tem
os spawns (moedas nas colunas 8, 30, 70, 82 e 90; mola na 40, linha 11; coração na 45,
linha 6, sobre a plataforma das colunas 43 a 47, linha 7) e os espinhos (colunas 51 e
52, linha 11, sobre o chão da linha 12). Com o espinho não sólido, o caminho até a
bandeira continua igual: os dois espinhos são 2 tiles de largura no chão plano, dentro do
pulo. `levels/generated/001.json` não muda (mesmo `contentHash`).

## Contratos

- **`src/domain/tiles.ts`**, ids locais novos (GID = id + 1 no mapa e no índice de tile
  do Phaser): `SPIKE_TILES = [68]`, `COIN_TILE = 151`, `HEART_TILES = { full: 44, empty:
  46 }`, `SPRING_TILES = { extended, compressed }` (da folha numerada).
- **`src/domain/physics.ts`**, constantes novas: `KNOCKBACK_SPEED_X` 160,
  `KNOCKBACK_SPEED_Y` 250, `KNOCKBACK_MS` 250, `SPRING_SPEED` 520. Função
  `springRise()` → `{ heightTiles }`: simula a subida a partir de `vy = −SPRING_SPEED`,
  sem controle, com a mesma integração de `simulateJump`.
- **`src/domain/movement.ts`:** `MovementState` ganha `lockMs`, `lockVx` e `cuttable`.
  - `stepMovement`: com `lockMs` > 0, `vx = lockVx`, aperto de pulo descartado (sem
    buffer), `lockMs` desconta o passo; o corte do pulo só vale com `cuttable`
    (verdadeiro ao pular, falso depois de impulso); o teto de queda vale sempre.
  - `knockback(state, direction: -1 | 1)` → `MovementStep` com `vx = direction ×
    KNOCKBACK_SPEED_X`, `vy = −KNOCKBACK_SPEED_Y`, trava de `KNOCKBACK_MS`, coyote e
    buffer zerados, `cuttable` falso.
  - `springBounce(state)` → `MovementStep` com `vy = −SPRING_SPEED`, trava zerada,
    coyote e buffer zerados, `cuttable` falso (`vx` segue o controle).
- **`src/domain/geometry.ts`:** `spikeBox(cell)`, `itemBox(cell)` (moeda e coração:
  célula com 3 px de folga de cada lado, 12×12), `springBox(cell)` (decisões 1 e 5);
  `knockbackDirection(playerCenterX, sourceCenterX, facing: -1 | 1)` → `-1 | 1`;
  `spikeCells(terrain: number[], width)` → `Cell[]` (GIDs da tabela).
- **`src/domain/attempt.ts`** (novo; o 1f acrescenta eventos e tempo): `MAX_HEARTS` 3,
  `INVULNERABLE_MS` 1500.
  - `AttemptState = { hearts, invulnerableMs, coins, collected: readonly number[] }`
    (ids de spawn já coletados).
  - `initialAttempt()` → 3 corações, sem invulnerabilidade, 0 moedas.
  - `stepAttempt(state, contacts, dtMs)` → `{ state, collected: ItemContact[], hurt,
    outcome: "playing" | "completed" | "dead" }`, com `contacts = { items:
    ItemContact[], hazard: boolean, flag: boolean }` e `ItemContact = { id, type:
    "coin" | "heart" }`. Ordem: desconta `dtMs` da invulnerabilidade; coleta (id já
    coletado é ignorado; coração soma até `MAX_HEARTS`); bandeira → `completed` sem
    dano; `hazard` sem invulnerabilidade → tira 1 e liga `INVULNERABLE_MS`; 0 corações
    → `dead`.
  - `invulnerabilityAlpha(state, reduceEffects)` → 1 sem invulnerabilidade; 0,5 com
    reduzir efeitos; senão, pelo tempo decorrido desde o dano (`INVULNERABLE_MS −
    invulnerableMs`) em blocos de 250 ms: bloco par 0,4, ímpar 1 (decisão 4).
- **`src/domain/death.ts`** (novo): `DEATH_HOLD_MS` 300, `DEATH_RISE_SPEED` 120,
  `DEATH_SWAY_PX` 4, `DEATH_SWAY_MS` 1000, `DEATH_FLAP_MS` 250, `DEATH_FADE_MS` 600.
  `deathPose(elapsedMs, reduceEffects)` → `{ dx, dy, alpha, wingsFlipped }` (deslocamento
  desde o ponto da morte, px inteiros); `deathFinished(elapsedMs, startTop, reduceEffects)`
  → verdadeiro quando o topo da auréola (`startTop + dy` − margem) passou da linha 0 da
  tela, ou com reduzir efeitos depois de `DEATH_HOLD_MS + DEATH_FADE_MS`.
- **`src/domain/level.ts`:** `readLevelInfo` passa a devolver `items: { id, type: "coin"
  | "heart" | "spring", x, y }[]` e `spikes: Cell[]` (do `data` de `terrain`); o schema
  da borda ganha `id` nos objetos e `data` nas camadas.
- **`src/game/entities/player.ts`:** expõe `facing` (−1 ou 1) e aplica a opacidade.
- **`src/game/scenes/level-scene.ts`:**
  - `terrain.setCollisionByExclusion([-1, ...GIDs de SPIKE_TILES])`: o índice de tile do
    Phaser é o GID, não o id local.
  - Desenha moedas, corações e molas nas células dos spawns (sprites da folha de tiles).
  - A cada passo, depois de `stepMovement` e na ordem da decisão 10: `isBelowMap`;
    `stepAttempt` com os itens e espinhos cujas caixas tocam a do jogador (`overlaps`) e
    a bandeira; some com os coletados; `completed` → fim como no 1c; `dead` → recomeço
    como na queda; `hurt` → `knockback` com `knockbackDirection` (centro médio dos
    espinhos tocados); sem dano, mola tocada com `vy ≥ 0` → `springBounce` e quadro
    comprimido por 150 ms.
  - HUD: faixa e 3 corações em `setScrollFactor(0)`, pixel inteiro, atualizados quando
    os corações mudam.
  - `LevelSceneData` ganha `reduceEffects: boolean` e `hudColor` (cor do token).
- **`src/game/create-game.ts`** e **`src/main.ts`:** `reduceEffects` de
  `matchMedia` e cor de `--color-bg` por `getComputedStyle`, passados à cena.
- **`src/game/test-hooks.ts`:** `state()` → `{ status, attempt, hearts, coins,
  invulnerable }` (`title` com 3, 0 e falso).

## Regras e casos de borda

- Regra no `domain` (ADR 0004): a cena não decide dano, coleta nem impulso; só junta os
  contatos, chama `stepAttempt`, `knockback`, `springBounce` e aplica o resultado.
  Nenhum número de dano, tempo ou impulso na cena.
- Invulnerabilidade contada em tempo de física (passos): pausa e aba escondida não a
  consomem.
- Cada spawn de moeda e coração é coletado uma vez por tentativa, mesmo tocado em vários
  passos seguidos; recomeço (queda, morte, "Jogar de novo") traz todos de volta.
- Empurrão contra parede: o corpo para na parede e a trava de 250 ms continua.
- Mola: depois de lançar, o jogador está subindo e não dispara de novo até cair sobre
  ela; pulo segurado ao sair da mola não dá pulo extra.
- Nada pisca mais de 3 vezes por segundo (ADR 0009); posições em pixel inteiro.

## Interface

Implementa do mockup (tela de jogo) a faixa do HUD com os corações (cheio e vazio, nas
posições do mockup: x 4, 22 e 40, y 2); moedas, pontos, tempo e fase da faixa ficam para o
1f. Moedas, coração e mola com os sprites da folha de tiles. Nenhum token novo; a faixa
usa `--color-bg` a 80%, como no `docs/DESIGN.md`. Nenhum texto novo em `strings.ts`.

## Testes necessários

- **`src/domain/attempt.test.ts`** (casos-limite do ADR 0006):
  - Início → 3 corações, 0 moedas, `invulnerable` falso.
  - `hazard` → 2 corações, `invulnerableMs` 1500, `hurt` verdadeiro.
  - Dano, 89 passos de 1000/60 ms (1483 ms), `hazard` → continua 2; no passo 90
    (1500 ms) → 1. Dois danos com 1000 ms entre eles → só o primeiro tira coração.
  - Três danos com 90 passos entre eles → 0 corações e `outcome` `dead` no terceiro.
  - Coração com 2 → 3; com 3 → 3 e o id entra em `collected`; com 1, dois corações no
    mesmo passo → 3.
  - Moeda de id 5 tocada em dois passos → `coins` 1.
  - Com 1 coração, coração e `hazard` no mesmo passo → 1 e `playing`.
  - `flag` e `hazard` no mesmo passo → `completed`, corações iguais.
  - `invulnerabilityAlpha`: sem invulnerabilidade 1; 0 ms decorridos 0,4; 249 → 0,4;
    250 → 1; 500 → 0,4; com reduzir efeitos 0,5 em qualquer instante; em 1 s, no
    máximo 4 trocas de opacidade (2 piscadas).
- **`src/domain/movement.test.ts`:** `knockback(−1)` → `vx` −160, `vy` −250; nos 14
  passos seguintes, direita segurada e pulo apertado → `vx` −160 e nenhum pulo; no passo
  15 → `vx` 110; pulo solto com `vy` −240 depois do empurrão → `vy` −240 (sem corte);
  `springBounce` → `vy` −520 e, solto o pulo com `vy` −503, continua −503; depois do
  `springBounce` com coyote cheio, pulo apertado no ar → não pula; pulo normal solto
  com `vy` −393 → −200 (o corte do 1c continua).
- **`src/domain/physics.test.ts`:** `springRise().heightTiles` ≥ 6 e < 8 (passa dos 5
  tiles da plataforma da fase 1) e maior que `jumpReach().heightTiles`;
  `SPRING_SPEED / PHYSICS_FPS` < 9 px (meio tile).
- **`src/domain/geometry.test.ts`:** espinho na célula (51, 11): caixa 920–934 × 207–216;
  jogador com `right` 920 → não toca; 921 → toca. `knockbackDirection(900, 927, 1)` →
  −1; `(950, 927, 1)` → 1; `(927, 927, 1)` → −1; `(927, 927, −1)` → 1. `spikeCells`
  num mapa de 3×15 com GID 69 na linha 11, coluna 1 → `[{ col: 1, row: 11 }]`; GID 0 e 22
  ignorados.
- **`src/domain/death.test.ts`:** em 0 e 299 ms `dy` 0; em 1300 ms `dy` −120; balanço
  dentro de ±4 px e 0 com reduzir efeitos; asas trocam no máximo 4 vezes por segundo e
  nunca com reduzir efeitos; opacidade 1 sem reduzir efeitos e de 1 a 0 nos 600 ms com
  ele; `deathFinished` falso antes de sair da tela e verdadeiro depois.
- **`src/domain/level.test.ts`:** `readLevelInfo` da fase 1 gerada → 5 moedas, 1 coração,
  1 mola com ids, 2 espinhos em (51, 11) e (52, 11); spawn sem `id` → erro.
- Cobertura do `domain` continua ≥ 95% (ADR 0010).
- **E2E (`e2e/hazards.spec.ts`, desktop, build `e2e`, esperas por `waitForFunction`):**
  - Espinho: `placePlayer(51, 11)` → `hearts` 2, `invulnerable` verdadeiro, `vx` < 0
    (empate, olhando para a direita); `placePlayer(51, 11)` de novo enquanto invulnerável
    → continua 2; esperar `invulnerable` falso, `placePlayer(51, 11)` → 1; repetir →
    `attempt` sobe 1, `hearts` 3, `coins` 0.
  - Pausa: dano, Esc, esperar 2 s de relógio, continuar → `invulnerable` ainda verdadeiro.
  - Moeda: `placePlayer(8, 10)` → `coins` 1; de novo → 1.
  - Coração: dano, `placePlayer(45, 6)` → `hearts` 3; tentativa nova com 3,
    `placePlayer(45, 6)` → 3.
  - Mola: `placePlayer(39, 11)`, segurar direita → `vy` ≤ −450 em algum quadro; a subida
    medida passa de 5 tiles.
  - Morte: o estado passa por `dying` antes de `attempt` subir (espinho com 1 coração e
    queda); o teste de queda do 1c continua passando.
  - Nenhum `console.error`, `pageerror` ou violação de CSP (os testes do 1b e do 1c
    continuam).
- **À mão (`docs/ROTEIRO-TESTE.md`):** fase 1 no Chrome do notebook (e Firefox, se
  houver): dano no espinho e empurrão, dois espinhos seguidos tirando um coração, morte por
  0 corações, mola até o coração, moedas sumindo; pisca a no máximo 2 vezes por segundo;
  com reduzir efeitos do sistema ligado, transparência fixa; fps médio ≥ 55.

## Tarefas por agente

1. **devops:** nada neste item (sem dependência nova, sem mudança de build ou CI).
2. **game** — domínio: escolher os quadros da mola na folha numerada; `tiles.ts`,
   constantes e `springRise` em `physics.ts`, trava, impulsos e `cuttable` em
   `movement.ts`, caixas, direção e `spikeCells` em `geometry.ts`, `attempt.ts` novo,
   `readLevelInfo` estendido (Contratos).
3. **game** — cena: espinho fora da colisão, sprites de moeda, coração e mola, a ordem do
   passo com `stepAttempt`, empurrão, mola, morte por 0 corações, opacidade da
   invulnerabilidade, `facing` no jogador, efeito de morte (anjinho) nas duas mortes.
4. **game** — HUD e ligações: faixa e corações; `reduceEffects` e cor do token em
   `main.ts` e `create-game.ts`; `state()` do atalho de teste estendido.
5. **qa** — testes da seção Testes necessários e a rodada à mão do roteiro, com o
   registro na tabela.
6. **docs** — `docs/ROTEIRO-TESTE.md`, "O que fazer": linha de perigos e coletáveis
   (dano, invulnerabilidade, morte por 0 corações, mola, moedas e coração).

Fora de `docs/`, para a sessão principal: nada no `CLAUDE.md`, em
`.claude/hooks/config.json` nem nos agentes.

## Riscos e alternativas descartadas

- **Empurrão apagado pelo controle:** `stepMovement` reescreve `vx` a cada passo; sem a
  trava, o empurrão dura um passo. Coberto por teste de unidade.
- **Impulso cortado pelo pulo variável:** sem `cuttable`, soltar o pulo cortaria a mola e
  o empurrão para 200 px/s. Coberto por teste.
- **Índice de tile errado na exclusão de colisão:** o Phaser usa o GID; com o id local o
  espinho seguiria sólido. O E2E do espinho cai no chão abaixo dele.
- **Mola que lança contra o teto ou para fora da tela:** a plataforma da fase 1 fica
  livre acima; trechos do 1h conferem pela prévia.
- **Dano e coleta no mesmo passo resolvidos em ordens diferentes pela cena e pelos
  testes:** a ordem mora em `stepAttempt`, não na cena.
- Descartado: espinho sólido com dano ao encostar (vira chão durante a
  invulnerabilidade, contra o ADR 0005); mola sólida que só lança por cima (atrapalha o
  validador e trava o jogador andando contra ela); empurrão também durante a
  invulnerabilidade (mais um caso sem pedido); HUD completo agora (é do 1f, com os
  dígitos e os eventos); invulnerabilidade como corpo fantasma do Arcade (a regra fica no
  `domain`).

## Desvios na implementação

- `cellsWith(data, width, gids)` genérico em `geometry.ts` no lugar de `spikeCells`.
- `springBounce(vx)` recebe o `vx` do passo em vez do estado.
- `reduceEffects` e as cores dos tokens são lidos em `create-game.ts` (não no `main.ts`).
- A trava do empurrão conta o próprio passo do empurrão: 15 passos no total, como o teste.
- Asas do anjinho: o desenho do tile 144 ocupa a metade de baixo e fica escondido atrás
  do personagem; desenhadas em escala 2 (inteira) e batendo por um sobe-e-desce de 2 px,
  não por espelho vertical (que as jogava para cima da cabeça).
- O teto de queda passa a valer também durante a trava.
