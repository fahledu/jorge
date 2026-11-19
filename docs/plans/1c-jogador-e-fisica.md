# Jogador e física

- Item do roadmap: 1c
- Status: Implementado

## Decisões pendentes

Nenhum ADR Proposto ligado ao item, e nenhuma regra estrutural nova: as constantes moram
em `src/domain/physics.ts` (ADR 0004) e os números são ajuste, não regra. Ambiguidades
que mudam o que se faz, cada uma com a suposição adotada (o usuário confirma ou troca
antes das tarefas):

1. **Valores da física.** *Suposição:* passo fixo de 60 Hz; gravidade 1000 px/s²;
   corrida 110 px/s (6,1 tiles/s; o tempo-alvo do ADR 0006 supõe 4); impulso do pulo
   410 px/s; corte do pulo variável em 200 px/s; queda máxima 360 px/s (6 px por passo,
   menos que meio tile, sem atravessar o chão). Com eles, a simulação dá cerca de 4,5
   tiles de altura e 5,0 de vão. Os números podem mudar no teste à mão desde que os
   testes de alcance (altura de 4 a menos de 5 tiles, vão de 4 ou mais) continuem
   passando. Altura abaixo de 5 mantém a mola (ADR 0006) com papel: a plataforma da fase 1
   na linha 7 (5 tiles acima do chão) só se alcança com ela.
2. **Coyote time e buffer de pulo.** *Suposição:* entram, 100 ms cada (6 passos):
   ajudam quem joga de vez em quando, que é o público do MVP. O validador do 1g ignora os
   dois (é conservador, ADR 0005).
3. **Movimento horizontal.** *Suposição:* velocidade instantânea (sem aceleração nem
   inércia), igual no chão e no ar; esquerda e direita juntas param o jogador.
4. **Onde o controle é aplicado.** *Suposição:* a cada passo da física do Arcade (evento
   de passo do mundo), não no `update` da cena, para a simulação do `domain` reproduzir o
   mesmo passo e o pulo não mudar com monitor de 120 Hz.
5. **O que acontece ao tocar a bandeira.** *Suposição:* o jogador para, os comandos de
   jogo deixam de valer e aparece um painel mínimo "Fase 1 concluída!" com "Jogar de
   novo" (textos do mockup). O 1f troca pelo resumo de pontos e o 1j pelos botões
   "Próxima fase" e "Escolher fase".
6. **Morte por queda.** *Suposição:* recomeço imediato da fase (a cena reinicia, como
   tentativa nova), sem mensagem. O aviso "Ops! Você caiu." do mockup é do 1f.
7. **Pausa no 1c.** *Suposição:* painel "Pausa" com a linha "Fase 1" e só "Continuar";
   Esc, P, Enter ou clique continuam. Volta do foco não retoma sozinha. Os outros botões
   do mockup (recomeçar, configurações, tela cheia, sair) e tempo e pontos na linha são
   do 1j e do 1f.
8. **Estado dos comandos.** *Suposição:* a lógica pura (fontes somadas, bordas de
   apertar) fica em `src/domain/commands.ts`; o adaptador de teclado fica em `src/game`.
   O toque do 1k, que está em `src/ui`, alimenta o mesmo estado por um evento do
   barramento (decidido no plano do 1k).
9. **Atalho de teste (ADR 0010).** *Suposição:* nasce agora, só no build de modo `e2e`,
   como `window.__jorgeTest`, com leitura do estado do jogador e da tentativa, posição do
   jogador e "ir para a bandeira". Ler o estado e posicionar o jogador vão além do "pular
   para a bandeira e escolher a fase" do ADR, mas cabem no mesmo propósito e na mesma
   garantia (ausente do build de produção), sem mudar o ADR. Escolher a fase fica para
   o 1g ou o 1j, quando houver mais de uma.
10. **Tiles sólidos.** *Suposição:* todo tile de `terrain` é sólido dos quatro lados,
    inclusive as plataformas de uma linha e o espinho (este até o 1d, como no plano 1b).
11. **Contador de fps.** *Suposição:* elemento DOM no canto superior direito, só com
    `import.meta.env.DEV`, mostrando o fps atual e a média dos últimos 30 s (o que o
    roteiro pede). É ferramenta de desenvolvimento: o texto fica no próprio módulo, fora
    de `src/ui/strings.ts`.

## Objetivo

Depois de "Jogar", o jogador controla o personagem pelo teclado na fase 1: anda, pula
mais alto segurando a tecla, colide com o terreno, recomeça ao cair num buraco, pausa e
continua, e conclui a fase ao tocar a bandeira. As constantes da física e o cálculo do
alcance do pulo ficam puros no `domain`, prontos para o validador do 1g.

## Critérios de aceitação

- Dado o título, quando aperta "Jogar", então o personagem aparece parado no início da
  fase 1, em pé no chão, e a câmera o acompanha.
- Dada a fase em jogo, quando segura seta para a direita ou D, então o personagem anda
  para a direita com a animação de 2 quadros, virado para a direita; com seta para a
  esquerda ou A, para a esquerda; soltando, para e mostra o quadro parado.
- Dada a fase em jogo, quando segura esquerda e direita ao mesmo tempo, então o
  personagem fica parado.
- Dado o personagem no chão, quando aperta Espaço, W ou seta para cima e solta logo,
  então ele dá um pulo baixo (entre 1 e 2 tiles); quando segura, então pula mais alto
  (de 4 a menos de 5 tiles).
- Dado o personagem correndo num chão plano, quando segura o pulo, então ele atravessa
  no ar pelo menos 4 tiles antes de voltar à altura de onde saiu.
- Dado o personagem que acabou de sair da borda de um chão andando, quando aperta o pulo
  em até 0,1 s, então ele pula; depois disso, não.
- Dado o personagem caindo, quando aperta o pulo até 0,1 s antes de tocar o chão, então
  ele pula ao tocar.
- Dado o personagem com o pulo segurado ao pousar, então ele não pula de novo até soltar
  e apertar outra vez; no ar, um segundo aperto não pula de novo.
- Dado o personagem andando contra uma parede ou degrau mais alto que o pulo, então ele
  para encostado, sem atravessar nem tremer; batendo a cabeça num teto, ele começa a cair.
- Dado o personagem no início da fase, quando anda para a esquerda, então para na borda
  do mapa; a câmera nunca mostra nada além das bordas da fase.
- Dado o personagem que cai num vão, quando ele sai por baixo do mapa, então a fase
  recomeça do início, com o personagem parado no ponto de início.
- Dado o personagem que toca a bandeira, então ele para, os comandos de jogo deixam de
  valer e aparece "Fase 1 concluída!" com "Jogar de novo", com o foco no botão; ao
  apertar o botão, a fase recomeça do início.
- Dada a fase em jogo, quando aperta Esc ou P, então tudo para e aparece "Pausa" com
  "Continuar" em foco; quando aperta Esc, P, Enter ou clica em "Continuar", então o jogo
  continua do mesmo ponto, sem pausar de novo.
- Dada a fase em jogo, quando a aba fica escondida ou a janela perde o foco, então o jogo
  pausa; ao voltar, continua em pausa até o jogador continuar.
- Dada a seta para a direita segurada, quando a janela perde o foco e o jogador continua
  depois sem segurar nada, então o personagem está parado (nenhuma tecla fica presa).
- Dada a fase em jogo, quando aperta as teclas do jogo, então a página não rola e nenhum
  botão escondido é acionado; atalhos do navegador com Ctrl, Alt ou Cmd continuam
  funcionando.
- Dado `pnpm dev`, então o contador de fps aparece no canto, com o atual e a média de
  30 s; no build de produção, não existe.
- Dada a fase 1, quando o dono a joga do início à bandeira só pelo teclado, então
  consegue sem trecho impossível, a 55 fps ou mais de média (roteiro à mão).
- Dados os painéis "Pausa" e "Fase 1 concluída!", então o axe não acusa violação e tudo
  funciona só pelo teclado.

## Fora de escopo

- Corações, dano, espinho como perigo, molas, moedas e a morte por 0 corações (1d).
- Inimigos (1e); os spawns de moeda, coração, mola e inimigos continuam sem desenho.
- Pontos, tempo da tentativa, HUD, resumo de fim de fase e o aviso "Ops! Você caiu." (1f).
- Fases além da 1, escolha de fase no atalho de teste (1g, 1j).
- Botões "Recomeçar fase", "Configurações", "Tela cheia" e "Sair da fase" na pausa;
  "Próxima fase" e "Escolher fase" no fim (1j).
- Controles de toque, aviso de girar o aparelho, tela cheia (1k).
- Aceleração e inércia, pulo duplo, deslizar na parede, câmera com zona morta ou olhando
  à frente: não pedidos; entram só se o teste à mão pedir, por plano.
- Plataformas atravessáveis por baixo (com papel no validador do 1g).
- Sons, gamepad e remapear teclas (já em "Para depois").

Para "Para depois" do roadmap: "Plataformas atravessáveis por baixo". O resto já tem item
na Fase 1 ou na lista.

## ADRs aplicáveis

0004, 0005, 0006, 0008, 0009, 0010, 0012.

## Modelo de dados

Sem save e sem mudança nos arquivos de fase. A fase 1 (`levels/manual/001.tmj`) não muda:
conferida contra a física da decisão 1, ela é alcançável. Vãos no caminho: 2 tiles
(colunas 15 e 16), 3 (35 a 37, descendo 1) e 3 (64 a 66, descendo 2). Degraus para cima:
1 tile (coluna 27, e a escada de 77 a 81) e 2 tiles (coluna 56). Os 2 espinhos (colunas
51 e 52, linha 11) são 1 tile de altura e, sólidos até o 1d, servem de chão. A
plataforma da linha 7 (colunas 43 a 47, com o coração em cima) fica 5 tiles acima do
chão: fora do pulo, de propósito (é da mola, 1d), e fora do caminho até a bandeira. Se
o teste à mão mudar os números, a conferência se repete pela prévia; se um vão ou
degrau do caminho ficar fora do alcance, ajusta-se o `.tmj` (limites do ADR 0005), não a
física.

`src/domain/tiles.ts` nasce aqui (ADR 0008) com os ids com papel do 1c: os 2 quadros do
jogador na folha de personagens (0 parado, 1 andando, o mesmo personagem do 1a) e o(s)
tile(s) da bandeira na folha de tiles, escolhidos pela folha numerada
(`pnpm levels:preview --sheet`).

## Contratos

- **`src/domain/physics.ts`:** constantes `PHYSICS_FPS`, `GRAVITY`, `RUN_SPEED`,
  `JUMP_SPEED`, `JUMP_CUT_SPEED`, `MAX_FALL_SPEED`, `COYOTE_MS`, `JUMP_BUFFER_MS` e o
  tamanho do corpo do jogador (`PLAYER_BODY`, suposição 14×20 px, rente à base do quadro
  de 24×24; ajustado olhando o sprite). Funções:
  - `simulateJump({ run: boolean, holdSteps?: number })` → `{ maxRisePx, airDistancePx,
    airSteps }`: simula, a partir de chão plano, o pulo com o controle de
    `movement.ts` e a mesma integração do Arcade (ordem conferida na fonte do Phaser
    instalado), até os pés voltarem à altura de saída. Sem `holdSteps`, segura até o fim.
  - `jumpReach()` → `{ heightTiles, gapTiles }`: pulo segurado e correndo, em tiles
    (`maxRisePx / 18`, `airDistancePx / 18`), sem somar a largura do corpo
    (conservador). É o que o validador do 1g usa para derivar os limites do ADR 0005.
  - `isBelowMap(bodyTop: number)` → `true` com o topo do corpo em `MAP_HEIGHT × 18`
    (270) ou mais.
- **`src/domain/movement.ts`:** `initialMovement()` e `stepMovement(state, input, dtMs)`
  → `{ state, vx, vy }`, puro. `input` = `{ left, right, jump, jumpPressed, onGround,
  vy }` (o `vy` atual do corpo). Decide a velocidade horizontal, o início do pulo (borda
  de apertar, coyote e buffer), o corte ao soltar subindo mais rápido que
  `JUMP_CUT_SPEED`, e consome coyote e buffer ao pular. `vy` devolvido é o que o corpo
  deve ter (igual ao de entrada quando o controle não mexe).
- **`src/domain/commands.ts`:** `type Command = "left" | "right" | "jump" | "pause"`;
  `CommandState` com `press(input: string, command)`, `release(input: string)`,
  `releaseAll()` e `frame()` → `{ left, right, jump, jumpPressed, pausePressed }`, que
  consome as bordas. `input` identifica a origem (ex.: `key:ArrowLeft`, `key:KeyA`; no
  1k, `touch:<id>`): o comando vale enquanto alguma origem o segura.
- **`src/domain/tiles.ts`:** `PLAYER_FRAMES = { idle, walk }` e `FLAG_TILES` (ids locais).
- **`src/game/input/keyboard.ts`:** `attachKeyboard(state: CommandState)` → `{ enable(),
  disable(), detach() }`. Mapa do ADR 0009 por `event.code`: `ArrowLeft`/`KeyA` →
  `left`; `ArrowRight`/`KeyD` → `right`; `Space`/`KeyW`/`ArrowUp` → `jump`;
  `Escape`/`KeyP` → `pause`. Só age habilitado (fase em jogo): então chama
  `preventDefault` nas teclas do mapa sem Ctrl, Alt ou Meta; `repeat` não gera borda.
  `disable()` solta tudo.
- **`src/game/events.ts`**, eventos novos:
  - game → ui: `paused: { levelNumber }`, `levelCompleted: { levelNumber }`.
  - ui → game: `resumeRequested`, `restartRequested`.
- **`src/game/entities/player.ts`:** sprite da folha de personagens com corpo do Arcade
  (`PLAYER_BODY`), animação de 2 quadros (parado; andando alterna 0 e 1 a 8 quadros/s;
  no ar, quadro 1), espelhado pela direção.
- **`src/game/scenes/level-scene.ts`:** tira o ponto que andava sozinho; cria o jogador
  com os pés no fundo da célula do `start`, centrado no `x` do ponto; colisão com
  `terrain`; limites do mundo com colisão à esquerda, à direita e no topo, aberto
  embaixo; câmera seguindo o jogador (ADR 0009); bandeira desenhada na célula do `flag`,
  com a área de toque na coluna dela, da linha do ponto até uma acima. Estados
  `playing`, `paused`, `completed`. Assina o barramento no `create` e cancela no
  `shutdown`.
- **`src/game/create-game.ts`:** recebe o barramento; física Arcade com as constantes
  do `domain`; liga o teclado; pausa por `visibilitychange` (escondida) e `blur` da
  janela; carrega `debug/fps-meter.ts` só em `DEV` e `test-hooks.ts` só no modo `e2e`
  (import dinâmico dentro do `if`, para sair do build de produção).
- **`src/game/test-hooks.ts`** (modo `e2e`): `window.__jorgeTest = { state(), player(),
  placePlayer(col, row), goToFlag() }`. `state()` → `{ status, attempt }` (`attempt`
  sobe a cada recomeço); `player()` → `{ x, y, bottom, vx, vy, onGround }` ou `null`;
  `placePlayer` põe os pés no fundo da célula; `goToFlag()` põe o jogador em pé 2
  colunas à esquerda da bandeira.
- **`src/game/debug/fps-meter.ts`** (só `DEV`): fps atual do laço do jogo e média dos
  últimos 30 s, atualizado 2 vezes por segundo, `aria-hidden`.
- **`src/ui/pause-screen.ts`** e **`src/ui/level-complete-screen.ts`:** painéis com as
  classes do 1a (`veil`, `panel`, `btn`), `role="dialog"`, `aria-modal`,
  `aria-labelledby`, foco no botão ao abrir. A pausa ouve Esc e P para continuar.
- **`src/ui/strings.ts`:** `pause` "Pausa", `resume` "Continuar", `levelCompleted(n)`
  "Fase {n} concluída!", `playAgain` "Jogar de novo".

## Regras e casos de borda

- Regra de jogo no `domain` (ADR 0004): a cena só aplica o que `stepMovement` devolve e
  pergunta `isBelowMap`; nenhum número da física na cena.
- Bordas de comando consumidas a cada passo da física: um toque rápido (apertar e soltar
  entre dois passos) ainda pula, baixo.
- Pausa ignorada fora de `playing` (carregando, já pausado, concluído). Ao pausar, o
  teclado é desabilitado (solta tudo) e o teclado passa a ser dos menus; ao continuar,
  as bordas pendentes são descartadas, para o Esc que continuou não pausar de novo.
- Cena pausada não acumula tempo de física: voltar de uma aba escondida por 10 minutos
  não dá um salto (conferir no Phaser instalado).
- Recomeço (queda ou "Jogar de novo") reinicia a cena com a mesma fase já carregada,
  sem baixar de novo; o tilemap só é registrado no cache se ainda não existir; nenhuma
  assinatura do barramento duplica (3 recomeços → um Esc abre um só painel).
- Bandeira tocada no ar conta; morrer depois de concluir não acontece (o jogador para).
- Posições na tela em pixel inteiro (ADR 0009); nenhum efeito pisca.

## Interface

Implementa do mockup a tela "Pausa" (só título, "Fase 1" e "Continuar") e uma versão
mínima de "Fase concluída" (só o título "Fase 1 concluída!" e "Jogar de novo"); o resto
dessas telas é do 1f e do 1j. HUD não entra (1f). Nenhum token novo; o contador de fps
usa uma classe em `src/ui/base.css` com tokens existentes. O personagem é o quadro 0 da
folha de personagens, o mesmo do 1a.

## Testes necessários

- **`src/domain/physics.test.ts`:** `jumpReach().heightTiles` ≥ 4 e < 5;
  `jumpReach().gapTiles` ≥ 4 (critério do roadmap); `simulateJump({ run: true,
  holdSteps: 1 })` sobe entre 18 e 36 px; `simulateJump({ run: false })` →
  `airDistancePx` 0; queda longa nunca passa de `MAX_FALL_SPEED`;
  `MAX_FALL_SPEED / PHYSICS_FPS` e `JUMP_SPEED / PHYSICS_FPS` menores que 9 px (meio
  tile); `isBelowMap(269.9)` falso, `isBelowMap(270)` verdadeiro.
- **`src/domain/movement.test.ts`:** no chão com `jumpPressed` → `vy` −`JUMP_SPEED`;
  soltar com `vy` −393 → −200; soltar com `vy` −150 → −150; soltar descendo com `vy` 50
  → 50; saiu do chão há 5 passos (83 ms) e aperta → pula; há 7 passos (117 ms) → não;
  apertou 5 passos antes de pousar → pula no passo do pouso; 7 passos antes → não;
  pulo segurado do início ao pouso → não pula de novo; aperto no ar logo depois de pular
  (dentro dos 100 ms) → não pula de novo; direita → `vx` 110; esquerda → −110; as duas →
  0; nenhuma → 0.
- **`src/domain/commands.test.ts`:** `key:ArrowLeft` e `key:KeyA` apertadas, soltar
  `key:KeyA` → `left` continua; soltar a outra → falso; apertar `jump` → `jumpPressed`
  verdadeiro no primeiro `frame()` e falso no segundo, com `jump` ainda verdadeiro;
  apertar a mesma origem duas vezes → uma borda; apertar e soltar antes do `frame()` →
  `jumpPressed` verdadeiro e `jump` falso; `releaseAll()` → tudo falso e sem bordas;
  `key:ArrowLeft` e `touch:1` em `left`, soltar o toque → `left` continua.
- Cobertura do `domain` continua ≥ 95% (ADR 0010).
- **E2E (`e2e/player.spec.ts`, perfil desktop; o celular entra no 1k)**, contra o build
  `e2e`, sem espera fixa (ADR 0010): esperas por `waitForFunction` sobre o atalho.
  - Alcance real: do início (chão plano das colunas 0 a 13), segurar seta para a
    direita e Espaço; amostrar `player()` a cada quadro até pousar; subida ≥ 4 tiles e
    distância no ar ≥ 4 tiles, cada uma a no máximo 0,25 tile do `jumpReach()` (o
    modelo do `domain` bate com a engine). Pulo com Espaço solto logo → subida < 2 tiles.
  - Queda: `placePlayer(15, 10)` (sobre o vão) → `attempt` sobe 1 e o jogador volta ao
    início.
  - Bandeira: `goToFlag()`, segurar seta para a direita → aparece "Fase 1 concluída!"
    com foco em "Jogar de novo"; axe sem violações; Enter → `attempt` sobe e
    `status` `playing`.
  - Pausa: Esc → "Pausa" visível, axe sem violações, posição do jogador igual depois de
    10 quadros; Esc → painel some e `status` `playing` (não pausa de novo); P e clique em
    "Continuar" idem; `blur` disparado na janela → pausa.
  - Tecla presa: segurar seta para a direita, `blur`, soltar, continuar → `vx` 0.
  - Recomeço não duplica: "Jogar de novo" 3 vezes, Esc → um só painel "Pausa".
  - Nenhum `console.error`, `pageerror` ou violação de CSP (os testes do 1b continuam).
- **Build de produção:** `dist/` sem `__jorgeTest` e sem o módulo do contador de fps
  (ADR 0010).
- **À mão (`docs/ROTEIRO-TESTE.md`):** fase 1 do início à bandeira só pelo teclado no
  Chrome e no Firefox de um notebook; pulo baixo e alto; pausa por Esc, P e troca de
  aba; fps médio de 30 s ≥ 55 com o contador; registro na tabela do roteiro. O celular
  fica para o 1k (sem toque não dá para jogar).

## Tarefas por agente

1. **devops** — build de teste:
   - Script `build:e2e` (`vite build --mode e2e`, saída em `dist-e2e/`); Playwright
     passa a construir e servir esse build com o mesmo preview e a mesma CSP;
     `dist-e2e/` no `.gitignore` e fora do Biome.
   - Conferência de que `dist/` não contém `__jorgeTest` nem o contador de fps, rodada
     ao fim de `pnpm build` (script em `scripts/`, sem dependência nova).
2. **game** — domínio:
   - Conferir na fonte do Phaser instalado (`node_modules/phaser/src/physics/arcade/`)
     a ordem de integração de velocidade e posição, o passo fixo e o evento de passo do
     mundo; anotar no topo de `physics.ts` o que a simulação reproduz.
   - `src/domain/physics.ts`, `movement.ts`, `commands.ts`, `tiles.ts` (Contratos). Os
     quadros da bandeira escolhidos pela folha numerada.
3. **game** — jogador na cena:
   - `src/game/entities/player.ts`, mudanças em `level-scene.ts` e `create-game.ts`
     (física, colisão, câmera, queda e recomeço, bandeira, estados), sem o ponto que
     andava sozinho. Conferir nos tipos instalados `setCollisionByExclusion`,
     `setBoundsCollision` e o evento de passo do Arcade.
4. **game** — entrada, pausa e fim:
   - `src/game/input/keyboard.ts`, eventos novos, pausa por perda de foco,
     `src/ui/pause-screen.ts`, `src/ui/level-complete-screen.ts`, textos em
     `src/ui/strings.ts`, ligação em `src/main.ts`.
5. **game** — ferramentas: `src/game/debug/fps-meter.ts` e `src/game/test-hooks.ts`.
6. **qa** — testes da seção Testes necessários e a rodada à mão do roteiro, com o
   registro na tabela.
7. **docs** — `docs/ROTEIRO-TESTE.md`, passo 5 da preparação: onde o contador aparece e
   que mostra a média de 30 s.

Fora de `docs/`, para a sessão principal: no `CLAUDE.md`, o comentário de `pnpm e2e`
passa a dizer que refaz o build de modo `e2e` (o resto não muda). Nada em
`.claude/hooks/config.json` nem nos agentes.

## Riscos e alternativas descartadas

- **Modelo do `domain` diferente da engine** (ordem de integração, limite de velocidade,
  viés de colisão de tiles): o E2E de alcance compara os dois com tolerância de 0,25
  tile e falha antes do validador do 1g confiar num número errado.
- **Monitor de 120 Hz ou mais, ou celular a 30 fps:** física em passo fixo de 60 Hz e
  controle no passo do mundo; conferido à mão onde houver o aparelho.
- **Salto ao voltar de pausa longa:** cena pausada não alimenta o acumulador da física;
  conferido no Phaser instalado e no teste à mão (trocar de aba por 1 minuto).
- **Tecla presa ao trocar de janela** (o navegador não manda `keyup`): `disable()` solta
  tudo ao pausar; teste E2E.
- **Espaço acionando botão escondido ou rolando a página:** `preventDefault` só nas
  teclas do jogo, só em jogo.
- **Assinaturas duplicadas a cada recomeço:** cancelar no `shutdown` da cena; teste E2E.
- Descartado: teclado pelo plugin de entrada do Phaser (preso à cena, que fica pausada,
  e longe da abstração que o toque também usa); física própria no `domain` (o ADR 0004
  deixa a física com a engine e o `domain` com as constantes); alcance só pela fórmula
  fechada `v²/2g` (ignora o passo discreto e o limite de queda da engine); E2E jogando a
  fase 1 inteira com teclas em tempos fixos (o ADR 0010 proíbe espera fixa; o percurso
  completo fica no roteiro à mão e o fim, no atalho); Matter.js (pesado e sem
  necessidade para caixas alinhadas a tiles).
