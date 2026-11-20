# Pontuação, HUD e fim de fase

- Item do roadmap: 1f
- Status: Aprovado (2026-11-19)

## Decisões pendentes

Nenhum ADR Proposto ligado ao item. As regras de pontos, do relógio e do recorde são do
ADR 0006; as do HUD, dos números e de reduzir efeitos, do ADR 0009. O plano não repete
nenhuma delas. Ambiguidades que mudam o que se faz, cada uma com a suposição adotada (o
usuário confirma ou troca antes das tarefas):

1. **Lista de eventos da tentativa.** *Suposição:* o `AttemptState` ganha `events`, a
   lista do que vale ponto, na ordem em que aconteceu no passo (ADR 0006: coleta → pisão
   → bandeira): `{ type: "coin" }`, `{ type: "enemyDefeated", enemy: "walker" | "flyer" }`
   e `{ type: "completed" }`. Coração não gera evento (não vale ponto). Os contadores do
   1e (`coins`, `defeatedWalkers`, `defeatedFlyers`) ficam, porque o atalho de teste e os
   E2E já os leem; um teste prende que batem com a lista. Os pontos saem só da lista
   (`score.ts`); a cena não soma nada.
2. **Relógio da tentativa.** *Suposição:* `AttemptState.elapsedMs`, somado com o `dtMs` de
   cada `stepAttempt` (tempo injetado, ADR 0004). Conta a partir do primeiro passo
   jogando (a fase aparece e o relógio corre, sem esperar o primeiro comando) e inclui o
   passo da bandeira. Não conta na pausa (a cena pausada não dá passo), no efeito de morte
   nem depois da bandeira (a cena não chama `stepAttempt` fora de `playing`). Segundos
   usados = parte inteira de `elapsedMs / 1000`, com a mesma tolerância de `EPSILON_MS`
   do `attempt.ts` (1200 passos de 1000/60 ms somam 19999,99… e precisam dar 20).
3. **`targetTimeSeconds` no jogo.** *Suposição:* `readLevelInfo` lê a propriedade gravada
   na fase (ADR 0006: "gravado na fase pelo gerador") e falha se ela faltar; o jogo não
   recalcula pela largura. Fase 1: 45.
4. **HUD.** *Suposição:* a faixa do 1d, com as posições do mockup (tela "Jogo"):
   corações em 4, 22 e 40; ícone de moeda em 70 e a contagem em 90; pontos em 190; tempo
   em 330; "FASE" e o número à direita (410/440, ou 400/430 com 3 dígitos). Dígitos do
   pack (ADR 0009) na folha de tiles, ids 160–169 (a última linha tem duas séries de 0 a
   9; o agente `game` confirma qual olhando a folha), avanço de 10 px por dígito; os dois
   pontos do relógio são dois quadrados de 2 px na cor `--color-text`, como no mockup.
   "FASE" é texto do sistema no canvas (o pack não tem letras), vindo de `strings.ts` por
   parâmetro do `createGame`, como o `levelLabel` de hoje. Valores:
   - **pontos** = pontos da tentativa até agora: inimigos e moedas, sem a conclusão nem
     o bônus (que só existem na bandeira); 6 dígitos com zeros à esquerda ("000430"),
     como no mockup, **sem separador de milhar**: o pack não tem ponto, e o
     `Intl.NumberFormat('pt-BR')` do ADR 0009 vale nos textos do DOM (pausa, resumo).
     Se o usuário quiser o ponto no HUD, desenha-se um quadrado de 2 px como os do relógio;
   - **tempo** = `m:ss` subindo, sem décimos ("0:42"; "12:05" passando de 9 minutos);
   - **moedas** = contagem sem zeros ("6"); **fase** = número sem zeros ("1").
   Sem animação nem piscar no HUD; nada muda com reduzir efeitos. O HUD só redesenha um
   campo quando o texto dele muda (no máximo 1 vez por segundo para o tempo).
5. **Resumo da fase concluída.** *Suposição:* a tabela do mockup (tela "Fase concluída"),
   com as 5 linhas **sempre**, mesmo com contagem 0 ("Voadores derrotados (0 × 200)" 0),
   para o jogador aprender o que vale ponto; a linha do bônus mostra os segundos usados e
   o alvo ("Bônus de tempo (0:32 de 0:45)"), com 0 quando passou do alvo; a última linha é
   o total. Fica só o botão "Jogar de novo" (foco inicial nele). O selo "Novo recorde!" e
   a linha "Recorde anterior… Melhor tempo…" são do 1i; "Próxima fase" e "Escolher fase",
   do 1j.
6. **Aviso de tentativa perdida.** *Suposição:* o painel curto do mockup (tela
   "Tentativa perdida"), no DOM, sem botão e sem tirar o foco, com `role="status"`: título
   por motivo, "Ops! Você caiu." (queda) ou "Ops! Acabaram os corações." (0 corações), e
   a linha "Recomeçando a fase 1…". Aparece quando o efeito de morte começa e some quando
   a tentativa nova começa, no lugar dos 1,5 s fixos do mockup: o recomeço já espera o
   efeito do anjinho (1d, decisão 14), que dura menos de 1 s com reduzir efeitos e até
   cerca de 2,8 s sem. Sem animação de entrada.
7. **Linha da pausa.** *Suposição:* "Fase 1 · 0:42,8 · 1.340 pontos" (mockup), com o
   tempo e os pontos da tentativa no momento da pausa (os mesmos do HUD, com décimos e
   separador de milhar). O plano 1c deixou essa linha para o 1f; os botões novos da pausa
   são do 1j.
8. **Tempo nos textos.** *Suposição:* `m:ss,d` com décimo **truncado**, não arredondado
   ("0:20,9" para 20 960 ms), para nunca mostrar um tempo menor que o que deu o bônus;
   minutos sem zero à esquerda; vírgula decimal do pt-BR. Segundos inteiros no bônus como
   `m:ss`.
9. **Recorde e total já como função pura.** *Suposição:* para os exemplos de pontuação
   do ADR 0006 passarem inteiros como teste agora, `score.ts` ganha `bestScore(anterior,
   tentativa)` e `totalScore(melhores)`, puras e sem uso no jogo; o 1i as liga ao save
   (ADR 0007). Nada é guardado neste item: fechar a aba perde tudo, como hoje.

## Objetivo

Durante a fase, o jogador vê no topo da tela os corações, as moedas, os pontos da
tentativa, o tempo e o número da fase. Ao tocar a bandeira, vê quanto ganhou e por quê
(inimigos, moedas, conclusão e bônus de tempo); ao perder a tentativa, vê um aviso curto
antes de a fase recomeçar, com os pontos zerados.

## Critérios de aceitação

- Dada a fase começando, quando o jogador olha o topo da tela, então vê 3 corações, 0
  moedas, 000000 pontos, o tempo 0:00 subindo e "FASE 1".
- Dado o jogador pegando uma moeda, então a contagem de moedas sobe 1 e os pontos sobem
  10; derrotando um andador, os pontos sobem 100; um voador, 200; pegando um coração, os
  pontos não mudam.
- Dado o jogo pausado, quando o jogador olha o painel, então vê a fase, o tempo com
  décimos e os pontos da tentativa ("Fase 1 · 0:42,8 · 1.340 pontos"); ao continuar, o
  tempo segue de onde parou, sem contar o tempo em pausa.
- Dada a aba escondida no meio da fase, quando o jogador volta, então o tempo não andou
  enquanto ela estava escondida.
- Dado o jogador tocando a bandeira, então o tempo para e aparece "Fase 1 concluída!" com
  a tabela: andadores, voadores e moedas (quantidade × pontos), "Fase concluída (500 + 10
  × 1)" 510, o bônus de tempo com os segundos usados e o alvo, e o total, com os números
  no formato pt-BR.
- Dada a fase 1 jogada à mão com 2 andadores, 1 voador e 4 moedas em 32,6 s, quando a
  tabela aparece, então mostra 200, 200, 40, 510, bônus 130 ("0:32 de 0:45") e total
  1.080.
- Dado o jogador caindo num buraco ou ficando sem corações, então aparece "Ops! Você caiu."
  ou "Ops! Acabaram os corações." com "Recomeçando a fase 1…"; quando a fase recomeça, o
  aviso some e o HUD volta a 3 corações, 0 moedas, 000000 pontos e 0:00.
- Dado "Jogar de novo" no resumo, quando a fase recomeça, então o HUD está zerado como
  na primeira tentativa.
- Dado só o teclado, quando o resumo aparece, então o foco está em "Jogar de novo" e
  Enter recomeça a fase; o leitor de tela anuncia o aviso de tentativa perdida.
- Dado "Reduzir efeitos" ligado, então o HUD, o resumo e o aviso aparecem iguais, sem
  animação.

## Fora de escopo

- Save, recorde da fase, "Novo recorde!", "Recorde anterior", melhor tempo, total na
  tela de recordes (1i e 1j); as funções puras de recorde e total entram (decisão 9),
  sem uso.
- "Próxima fase", "Escolher fase", "Recomeçar fase", "Sair da fase", configurações e tela
  de fim de jogo (1j); só a fase 1 existe até o 1g.
- Pontos flutuando no lugar do inimigo derrotado ou da moeda; contagem animada dos pontos
  no resumo; piscar ou destacar o HUD ao ganhar ponto.
- Tempo-alvo do bônus visível durante a fase (o HUD do mockup só mostra o tempo usado).
- Relógio que só começa no primeiro comando do jogador.
- Sons ao ganhar pontos (sons já em "Para depois").
- Combos e multiplicadores (não estão no ADR 0006).

Copiados para "Para depois" do `docs/ROADMAP.md`: pontos flutuando no lugar do inimigo ou
da moeda; tempo-alvo do bônus visível durante a fase. O resto já é item da Fase 1, já
estava na lista, ou é detalhe de implementação ou regra que não foi pedida.

## ADRs aplicáveis

0004, 0006, 0008, 0009, 0010.

## Modelo de dados

Sem save. Nenhuma mudança nos arquivos de fase: `targetTimeSeconds` já é gravado pelo
`levels:build` (1b) e só passa a ser lido pelo jogo. Em memória, `AttemptState` ganha
`events` e `elapsedMs` (Contratos).

## Contratos

- **`src/domain/attempt.ts`:**
  - `AttemptEvent = { type: "coin" } | { type: "enemyDefeated"; enemy: EnemyType } | {
    type: "completed" }`.
  - `AttemptState` ganha `events: readonly AttemptEvent[]` e `elapsedMs`;
    `initialAttempt()` → `[]` e 0.
  - `stepAttempt` soma `dtMs` a `elapsedMs` e acrescenta os eventos do passo, na ordem
    coleta → pisão → bandeira (decisão 1). Nada muda no resto do passo.
- **`src/domain/score.ts`** (novo; o nome já está no ADR 0006):
  - `POINTS = { walker: 100, flyer: 200, coin: 10 }`, `COMPLETION_BASE` 500,
    `COMPLETION_PER_LEVEL` 10, `TIME_BONUS_PER_SECOND` 10.
  - `usedSeconds(elapsedMs)` (decisão 2); `completionPoints(levelNumber)`;
    `timeBonus(targetTimeSeconds, elapsedMs)`.
  - `runningPoints(events)` → pontos de inimigos e moedas (HUD e pausa).
  - `scoreSummary(events, { levelNumber, targetTimeSeconds }, elapsedMs)` →
    `ScoreSummary = { walkers: { count, points }, flyers: { count, points }, coins: {
    count, points }, completion: { levelNumber, points }, timeBonus: { usedSeconds,
    targetSeconds, points }, elapsedMs, total }`; erro se a lista não tem `completed`
    (pontos só com a fase concluída, ADR 0006).
  - `bestScore(previous: number | null, attempt: number | null)` (`null` = sem recorde /
    tentativa não concluída) e `totalScore(bests: readonly number[])` (decisão 9).
- **`src/domain/hud.ts`** (novo): `clockParts(ms)` → `{ minutes, seconds, tenths }`
  (truncados, decisão 8); `hudFields(state, levelNumber)` → `{ hearts, coins: "6", points:
  "000430", clock: "0:42", level: "1" }` (decisão 4).
- **`src/domain/tiles.ts`:** `DIGIT_TILES` (o primeiro id da série de dígitos, decisão 4).
- **`src/domain/level.ts`:** `LevelInfo.targetTimeSeconds` (decisão 3).
- **`src/game/events.ts`:**
  - `paused: { levelNumber, elapsedMs, points }`;
  - `levelCompleted: { levelNumber, summary: ScoreSummary }`;
  - novo `attemptLost: { levelNumber, reason: "fell" | "hearts" }` (game → ui), no
    começo do efeito de morte;
  - novo `attemptStarted: { levelNumber, attempt }` (game → ui), quando a cena passa a
    `playing` (inclusive na primeira).
- **`src/game/hud.ts`** (novo): a faixa, os corações (tirados da cena), ícone de moeda e
  campos de dígitos; `update(fields)` redesenha só o campo que mudou. Sem número de pontos
  ou tempo calculado aqui.
- **`src/game/scenes/level-scene.ts`:** usa o `Hud`; emite os eventos acima;
  `levelCompleted` leva `scoreSummary` do estado final; `#die(fell)` emite `attemptLost`.
- **`src/game/create-game.ts`:** recebe a palavra "FASE" de `strings.ts` (junto com os
  rótulos que já recebe) e a repassa à cena.
- **`src/game/test-hooks.ts`:** `state()` ganha `elapsedMs`, `points` (`runningPoints`) e
  `events`; `hud()` → os `hudFields` mostrados; `lastSummary()` → o `ScoreSummary` do
  último `levelCompleted` ou `null`.
- **`src/ui/format.ts`** (novo): `formatPoints(n)` (`Intl.NumberFormat('pt-BR')`),
  `formatTime(ms)` (`m:ss,d`, decisão 8), `formatSeconds(s)` (`m:ss`).
- **`src/ui/level-complete-screen.ts`:** a tabela do resumo (decisão 5), `aria-label`
  "Pontos da fase".
- **`src/ui/attempt-lost-toast.ts`** (novo): o aviso da decisão 6.
- **`src/ui/pause-screen.ts`:** a linha da decisão 7.
- **`src/ui/strings.ts`:** "FASE", rótulos das 5 linhas e do total, "Pontos da fase",
  os dois títulos do aviso, "Recomeçando a fase N…", a linha da pausa.

## Regras e casos de borda

- Regra no `domain` (ADR 0004): a cena não soma ponto nem conta tempo; a `ui` só formata
  o que recebe no evento. Nenhum número de pontuação fora de `score.ts`.
- Pontos e tempo só da tentativa atual: morte e "Jogar de novo" começam com
  `initialAttempt()` (lista vazia, 0 ms).
- Pisar um inimigo e tocar a bandeira no mesmo passo → o inimigo entra no resumo (ADR
  0006).
- Tocar a bandeira no passo em que o relógio passa de 45 s → os segundos usados são os
  do passo da bandeira.
- Pausa logo depois da bandeira ou durante o efeito de morte: ignorada, como hoje.
- Aviso de tentativa perdida e resumo nunca aparecem juntos (a bandeira vence o dano no
  mesmo passo, ADR 0006).
- Texto do HUD sobre a faixa `--color-bg` a 80% (contraste do DESIGN.md); posições em
  pixel inteiro.

## Interface

Implementa do mockup: o HUD da tela "Jogo (teclado)", a tela "Fase concluída" sem o selo
e sem os botões do 1j, a tela "Tentativa perdida" e a linha da tela "Pausa". Divergências:
o aviso dura o efeito de morte, não 1,5 s fixos (decisão 6); o resumo tem só "Jogar de
novo" (decisão 5). Componentes base já existentes no `docs/DESIGN.md` (Painel, HUD, Botão
primário); a tabela do resumo usa `font-num` nos números e `success` no título. Nenhum
token novo. Textos novos em `strings.ts` (Contratos).

## Testes necessários

- **`src/domain/score.test.ts`** (casos-limite de pontuação do ADR 0006):
  - Fase 1, alvo 25, 30 000 ms, 2 andadores, 5 moedas → 200 + 50 + 510 + 0 = 760.
  - Mesma fase em 20 900 ms → bônus 50, total 810.
  - `bestScore(null, 760)` → 760; `bestScore(760, 810)` → 810 e `totalScore([810])` −
    `totalScore([760])` = 50; `bestScore(810, 700)` → 810, total igual.
  - 3 inimigos derrotados e queda (`bestScore(810, null)`) → 810; `scoreSummary` sem
    `completed` → erro.
  - Fase 100 concluída, alvo 10, 60 000 ms, sem eventos → 1500.
  - Bônus: 25 000 ms com alvo 25 → 0; 24 999 ms → 10; 0 ms → 250.
  - `usedSeconds` de 1200 passos de `STEP_MS` somados → 20 (tolerância, decisão 2).
  - `runningPoints` com 2 andadores, 1 voador e 3 moedas → 430; com `completed` → igual.
  - Fase 1 (alvo 45), 2 andadores, 1 voador, 4 moedas, 32 600 ms → 200, 200, 40, 510,
    130, total 1080 (critério da partida à mão).
- **`src/domain/attempt.test.ts`:**
  - Moeda, coração com 3 corações e pisão num andador no mesmo passo → eventos `[coin,
    enemyDefeated walker]`, sem evento do coração.
  - Pisão e bandeira no mesmo passo → `[enemyDefeated, completed]`.
  - 60 passos de `STEP_MS` → `elapsedMs` 1000 (±1e-6); `initialAttempt()` → `[]` e 0.
  - Contadores de moedas e inimigos = contagem dos eventos, em todos os casos do arquivo.
- **`src/domain/hud.test.ts`:** `clockParts(42 850)` → 0, 42, 8; `(65 300)` → 1, 5, 3;
  `(20 960)` → décimo 9; `hudFields` com 430 pontos → "000430", 6 moedas → "6", 42 850 ms
  → "0:42", 725 000 ms → "12:05", fase 13 → "13".
- **`src/domain/level.test.ts`:** fase 1 gerada → `targetTimeSeconds` 45; sem a
  propriedade → erro.
- **`src/ui/format.test.ts`:** `formatPoints(12340)` → "12.340"; `formatTime(42 850)` →
  "0:42,8"; `(65 300)` → "1:05,3"; `(20 960)` → "0:20,9"; `formatSeconds(32)` → "0:32".
- Cobertura do `domain` ≥ 95% (ADR 0010).
- **E2E (`e2e/score.spec.ts`, desktop, build `e2e`):**
  - HUD: ao começar, `hud()` → 3 corações, "0", "000000", "0:00", "1"; depois de
    `placePlayer` numa moeda → "1" e "000010"; pisão num andador (como no 1e) → "000110".
  - Pausa: `paused` mostra "Fase 1 · …" com os pontos de `state()` em pt-BR; 1,5 s em
    pausa → `elapsedMs` igual ao continuar.
  - Resumo: uma moeda, um pisão em andador, `goToFlag()` → a tabela mostra 100, 0, 10,
    510, o bônus e o total iguais a `lastSummary()`; total = soma das linhas; foco em
    "Jogar de novo"; Enter → HUD zerado e `attempt` 2.
  - Aviso: morte por queda (coluna do vão, como no 1d) → `role="status"` com "Ops! Você
    caiu." e "Recomeçando a fase 1…"; tentativa nova → aviso escondido, `points` 0,
    `elapsedMs` < 1000. Morte por corações → "Ops! Acabaram os corações.".
  - axe sem violações no resumo e com o aviso visível; nenhum `console.error`,
    `pageerror` ou violação de CSP.
- **E2E existentes:** `level.spec.ts` (fase concluída) passa com a tabela; os demais sem
  mudança.
- **À mão (`docs/ROTEIRO-TESTE.md`):** fase 1 até a bandeira anotando inimigos, moedas e
  tempo; o resumo bate com o que foi feito; HUD legível em 1920×1080 e 844×390; aviso nas
  duas mortes; pausa sem contar tempo.

## Tarefas por agente

1. **devops:** nada neste item (sem dependência nova, sem mudança de build ou CI).
2. **game** — domínio: eventos e relógio em `attempt.ts`, `score.ts`, `hud.ts`,
   `DIGIT_TILES` (confirmar a série de dígitos olhando a folha), `targetTimeSeconds` em
   `readLevelInfo`, com os testes de unidade.
3. **game** — cena: `src/game/hud.ts` no lugar da faixa do 1d, eventos novos e payloads
   em `events.ts`, emissão na cena, palavra "FASE" pelo `createGame`, atalho de teste
   estendido.
4. **game** — interface DOM: `format.ts` com teste, resumo em
   `level-complete-screen.ts`, `attempt-lost-toast.ts`, linha da pausa, textos em
   `strings.ts`, montagem em `main.ts`.
5. **qa** — testes da seção Testes necessários, ajuste do `level.spec.ts`, rodada à mão
   do roteiro com o registro na tabela.
6. **docs** — `docs/ROTEIRO-TESTE.md`, "O que fazer": linha do HUD, do resumo (conferir
   a conta com o que foi feito), do aviso nas duas mortes e do tempo na pausa.

Fora de `docs/`, para a sessão principal: nada no `CLAUDE.md`, em
`.claude/hooks/config.json` nem nos agentes.

## Riscos e alternativas descartadas

- **Erro de arredondamento no relógio:** somar 1000/60 ms dá 19 999,99… em 20 s e
  tiraria 10 pontos de bônus. Preso pelo teste de `usedSeconds` com tolerância.
- **Décimo arredondado mostrando tempo menor que o do bônus:** "0:21,0" com bônus de 20
  s. Por isso o truncamento (decisão 8).
- **HUD alocando a cada passo** (questão do 1g no STATUS): o HUD compara texto e só
  redesenha o campo que mudou; a lista de eventos cresce no máximo pelo número de
  inimigos e moedas da fase.
- **Dígitos do pack com largura diferente da prevista:** o avanço de 10 px é do mockup;
  o agente ajusta pela folha sem mudar o layout geral.
- Descartado: pontos somados na cena a cada evento (regra fora do `domain`); HUD em DOM
  sobre o canvas (ADR 0009 põe o HUD no canvas); separador de milhar no HUD com dígitos
  do pack (o mockup mostra zeros à esquerda e o pack não tem ponto; decisão 4);
  aviso de morte com tempo fixo de 1,5 s (a cena reiniciaria no meio do anjinho ou o
  aviso sumiria antes do recomeço); tabela do resumo sem as linhas zeradas (o jogador não
  aprende que voador vale ponto se não pisou em nenhum).
