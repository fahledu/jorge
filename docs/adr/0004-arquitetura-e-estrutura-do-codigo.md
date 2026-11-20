# 0004. Arquitetura e estrutura do código

- Status: Aceito
- Data: 2026-11-18

## Contexto
As regras que precisam estar certas (gerador de fases, curva de dificuldade,
pontuação, save e migração, recordes) são lógica determinística e testável sem
navegador. A física, o desenho e a entrada são da engine (ADR 0003) e difíceis de testar
por unidade. Misturar as duas deixa as regras presas a cenas do Phaser.

## Decisão
- **Um pacote só**, sem workspaces. Estrutura:

  ```
  src/
    domain/        # regras puras: PRNG, curva, gerador, validador, pontuação, save, recordes
    game/          # Phaser: cenas, entidades, câmera, animações, leitura de entrada
    ui/            # DOM: menus, telas, controles de toque, textos pt-BR
    storage/       # adaptador do localStorage (única parte que toca o armazenamento)
    main.ts        # monta UI e jogo, injeta storage
  levels/
    chunks/        # trechos do Tiled (.tmj), fonte editada à mão
    manual/        # fases inteiras feitas à mão (NNN.tmj)
    generated/     # 100 fases geradas (saída do build de fases, versionada; ADR 0013)
  scripts/         # build e checagem de fases (rodam o domain com Node)
  assets/kenney/   # cópia dos arquivos usados do pack (ADR 0008)
  e2e/             # Playwright
  infra/           # Dockerfile, compose, Caddyfile, <projeto>.caddy, deploy (ADR 0011)
  ```

- **`src/domain` é puro:** não importa `phaser`, `src/game`, `src/ui`, `src/storage`,
  DOM nem `Math.random`/`Date.now` (tempo e aleatoriedade entram por parâmetro). Biome
  (`noRestrictedImports`) e um teste de importações garantem.
- **Dependências só para dentro:** `game` e `ui` usam `domain`; `storage` usa
  `domain` (schema e migração do save); `domain` não usa ninguém. `game` não importa
  `ui` nem o contrário: falam por um barramento de eventos tipado definido em
  `src/game/events.ts` (ex.: `levelCompleted`, `pauseRequested`).
- **Constantes de física** (gravidade, velocidade, impulso do pulo) moram em
  `src/domain/physics.ts`: a engine as usa e o validador de fases (ADR 0013) deriva
  delas o alcance do pulo. Mudar uma constante roda de novo a checagem das 100 fases.
- **Entrada abstraída:** teclado e toque produzem o mesmo estado de comandos
  (`left`, `right`, `jump`, `pause`) lido pela cena; a cena não sabe a origem
  (ADR 0009).
- **Fase em tempo de execução** vem só de `levels/generated/` (inclusive as manuais,
  que o build de fases normaliza para o mesmo formato); o jogo não carrega `.tmj` cru
  nem roda o gerador.
- Código, nomes e commits em inglês; textos da interface em pt-BR num arquivo só
  (`src/ui/strings.ts`).

## Casos-limite
- `import Phaser from 'phaser'` em `src/domain/score.ts` → lint e teste de importações
  falham.
- `Math.random()` no gerador → teste de importações falha (determinismo, ADR 0013).
- Cena chamando `localStorage` direto → fora da regra; passa pelo `storage`.

## Descartado
- **Monorepo com `packages/domain`:** um app só; a fronteira por pasta com lint basta.
- **ECS (bitecs e afins):** poucas entidades por fase; as classes do Phaser bastam.
- **Lógica de pontuação dentro das cenas:** não testável sem navegador.
