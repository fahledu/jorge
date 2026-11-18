# Formato de trecho e fase manual

- Item do roadmap: 1b
- Status: Aprovado

## Decisões pendentes

Todas resolvidas em 2026-11-18: o usuário aceitou o ADR 0012 e as suposições 2 a 6 como
estão.

1. **ADR 0012 (Aceito): arquivos `.tmj`, autoria por agente e validade.** Registra a
   decisão do usuário (um agente escreve o JSON do Tiled da fase 1 e dos trechos do 1h,
   não o dono no Tiled) e o que o ADR 0005 deixou aberto: o subconjunto do Tiled JSON
   aceito, a versão do formato, o tileset externo na origem e embutido na saída, a faixa
   de GIDs, a lista fechada de tipos de spawn (com `start` e `flag`), as propriedades da
   fase manual e a serialização canônica. Aceito; as tarefas abaixo seguem o texto.

Ambiguidades que mudam o que se faz, cada uma com a suposição adotada (aceitas):

2. **Como o build roda TypeScript no Node.** O `scripts/build-levels.ts` precisa
   importar o `src/domain`. *Suposição:* Node 24 com remoção de tipos nativa
   (`node scripts/build-levels.ts`), sem dependência nova; para isso o `tsconfig` ganha
   `allowImportingTsExtensions` e `erasableSyntaxOnly`, e os imports relativos de
   `src/domain` e `scripts/` passam a ter a extensão `.ts`. Se a versão instalada do Node
   recusar algo, a alternativa é `tsx` como dependência de dev (ADR 0003 muda, com a
   checagem de idade e autor).
3. **Onde fica o fundo.** O ADR 0005 não tem camada de fundo. *Suposição:* o fundo não
   está no `.tmj`; a cena desenha um fundo único para todas as fases, repetido na
   horizontal a partir de `tilemap-backgrounds_packed.png`, com rolagem mais lenta que o
   terreno (fator 0,5). Fundo por fase ou por tier fica para depois.
4. **O que a fase 1 contém.** Os itens 1d e 1e conferem espinhos, molas, corações e os
   dois inimigos *na fase 1*. *Suposição:* a fase 1 já nasce com tudo isso, cada coisa
   apresentada sozinha, em chão plano antes: 100 tiles de largura (`targetTimeSeconds`
   25, como no exemplo do ADR 0006), chão na linha 12, 2 `walker`, 1 `flyer`, 5 `coin`,
   1 `heart`, 1 `spring`, um grupo de 2 espinhos, vãos de no máximo 3 tiles e degraus de
   no máximo 3 (limites do validador, ADR 0005), `start` na coluna 2 e `flag` na coluna
   97. No 1b só terreno e decoração aparecem; os spawns são lidos e normalizados, não
   desenhados. Até o 1d, o espinho é um tile sólido como os outros.
5. **O que é a câmera "seguindo um ponto".** *Suposição:* um ponto invisível anda
   sozinho do `start` até o `flag` a 60 px/s e volta, sem parar; a câmera o segue com
   limites no mapa e posição em pixel inteiro. Some no 1c, quando o jogador entra.
6. **Paleta de tiles para o agente.** Um agente não reconhece de cabeça que id da folha é
   grama. *Suposição:* `pnpm levels:preview --sheet` gera a folha ampliada com o id local
   e o GID de cada tile; o agente monta `levels/README.md` com a paleta usada (grama,
   terra; neve e areia entram no 1h) e a confere na prévia. Nada disso vira código: os
   ids com papel no jogo de `src/domain/tiles.ts` (ADR 0008) nascem quando o papel nasce
   (espinho, mola e afins no 1d).

**Questão do `docs/STATUS.md`:** "Quem desenha os trechos do item 1h" está resolvida
(decisão do usuário, registrada aqui e no ADR 0012, já aceito). A sessão principal deve
apagar a linha.

## Objetivo

Ao clicar em "Jogar", a fase 1 aparece no lugar da cena vazia: fundo, terreno e
decoração do tutorial, na escala do ADR 0009, com a câmera percorrendo a fase de ponta a
ponta. A fase é escrita por um agente em `.tmj`, conferida e normalizada por
`pnpm levels:build` para `levels/generated/001.json`, e baixada só quando o jogo começa.

## Critérios de aceitação

- Dado o título, quando aperta "Jogar", então a fase 1 aparece com fundo, chão de grama
  e terra, vãos e plataformas, e a câmera anda sozinha do início até a bandeira e volta.
- Dada a janela em 1920×1080, quando a fase 1 está na tela, então o jogo ocupa
  1920×1080 (escala 4), com os tiles nítidos e do mesmo tamanho.
- Dada a janela em 844×390, quando a fase 1 está na tela, então o jogo ocupa 693×390
  centralizado, sem suavização.
- Dada a câmera em movimento, então o terreno não treme nem mostra frestas entre tiles,
  e a câmera não mostra nada além das bordas da fase.
- Dado o título aberto, então os dados da fase ainda não foram baixados; quando aperta
  "Jogar", eles são baixados.
- Dada a fase 1 na tela, então o canvas tem o rótulo "Fase 1" (ADR 0009).
- Dado o mesmo `levels/manual/001.tmj`, quando roda `pnpm levels:build` duas vezes,
  então `levels/generated/001.json` sai idêntico byte a byte, com o mesmo `contentHash`.
- Dado o `001.tmj` aberto e salvo no Tiled (outra formatação e ordem de chaves), quando
  roda o build, então `001.json` não muda.
- Dado um `.tmj` com erro (GID fora da folha, tipo de spawn desconhecido, fase sem
  bandeira, camada faltando), quando roda o build, então ele falha e diz o arquivo, a
  camada e a coluna e linha do problema.
- Dado `levels/manual/001.tmj` e `levels/generated/001.json`, quando o dono os abre no
  Tiled, então os dois abrem sem aviso e mostram o mesmo desenho do jogo (conferência
  à mão, se o dono tiver o Tiled).
- Dado o build de produção com a CSP, quando a fase 1 abre, então não há erro no console
  nem violação de CSP, no perfil de desktop e no de celular.

## Fora de escopo

- Jogador, física, colisão, entrada por comandos, `physics.ts` (1c).
- Desenhar spawns: moedas, corações, molas, inimigos e a bandeira (1c a 1e); o papel
  do espinho (1d).
- Gerador, trechos, validador de alcance e `levels:check` (1g); o 1b não valida alcance,
  mas a fase 1 já respeita os limites do ADR 0005.
- Ids com papel no jogo em `src/domain/tiles.ts` (nascem com o papel, 1d em diante).
- Telas "Carregando" e "Erro de tela" (1j): no 1b, falha ao carregar a fase vai para o
  console.
- Seleção de fase e atalho de teste em `window` (1j e 1g).
- Fundo por fase ou por tier, e paralaxe com várias camadas.

Para "Para depois" do roadmap: "Fundo diferente por fase ou por tier". O resto já tem
item na Fase 1.

## ADRs aplicáveis

0003, 0004, 0005, 0006, 0008, 0009, 0010, 0011, 0012.

## Modelo de dados

Sem save. Arquivos:

- **`levels/manual/001.tmj`** (fonte, escrito pelo agente): formato do ADR 0012, com o
  tileset externo `../../assets/kenney/Tiled/tileset-tiles.tsx`. `data` escrito com uma
  linha do mapa por linha de texto, para o diff ser legível.
- **`levels/generated/001.json`** (saída do build): ADR 0005 e ADR 0012, com o tileset
  embutido e as propriedades da fase manual.
- **`levels/README.md`**: como escrever um `.tmj` (aponta para o ADR 0012, sem copiar),
  a paleta de tiles usada (id local e GID) e os comandos de build e prévia.
- **`.preview/`** (fora do git): PNGs da prévia.

## Contratos

- **`src/domain/tsx.ts`:** `parseTsx(xml: string)` → `{ name, tilewidth, tileheight,
  tilecount, columns, margin, spacing, image, imagewidth, imageheight }`. Lê só os
  atributos do elemento `tileset` e da `image`; falta de atributo, `<tile>` filho ou
  `margin`/`spacing` diferente de 0 → erro.
- **`src/domain/tmj.ts`:** `parseTmj(json: unknown, opts: { kind: "manual" | "chunk",
  file: string, tileset: TilesetInfo })` → `{ ok: true, map: TmjMap } | { ok: false,
  errors: TmjError[] }`, com `TmjError = { file, layer?, col?, row?, message }`. Schema
  em `zod/mini` mais as conferências do ADR 0012 (GIDs, contagem de `data`, ids,
  spawns, propriedades). `TmjMap` tem `width`, `height`, `terrain` e `decor` (listas de
  GID), `spawns` (`{ id, type, x, y, col, row, minTier? }`) e `properties`. As
  propriedades de trecho do ADR 0005 já são lidas; o 1b só usa `kind: "manual"`, mas os
  testes cobrem os dois.
- **`src/domain/level.ts`:** `buildManualLevel({ levelNumber, source, map, tileset,
  imagePath, sha256 })` → `{ json: string, contentHash: string }`. `sha256: (text:
  string) => string` é injetado (o `domain` não importa `node:crypto`). Calcula `tier`
  (`ceil(n / 10)`, ADR 0005) e `targetTimeSeconds` (ADR 0006); serializa na forma
  canônica do ADR 0012; `contentHash` = 16 primeiros hex do SHA-256 da serialização sem
  ele (ADR 0005).
- **`scripts/build-levels.ts`** (`pnpm levels:build`): lê `levels/manual/NNN.tmj`, o
  `.tsx` referenciado, chama o `domain`, grava `levels/generated/NNN.json` e apaga ali os
  `.json` que nenhuma fonte produziu. Erros vão para o stderr, um por linha; código de
  saída 1. Exporta a função principal com as pastas por parâmetro, para o teste.
- **`scripts/level-preview.ts`** (`pnpm levels:preview <arquivo.tmj | NNN.json>` e
  `pnpm levels:preview --sheet`): lê e valida pelo mesmo `domain`, abre o Chromium do
  Playwright sem servidor, desenha `decor` e `terrain` num canvas 2D a 2× sobre a cor do
  céu, com marcadores de spawn (letra e cor por tipo) e régua de coluna a cada 5 tiles,
  e grava `.preview/<nome>.png`. `--sheet` grava a folha a 3× com id local e GID em cada
  tile.
- **`src/game/levels.ts`:** `loadLevel(n: number): Promise<LevelData>` com
  `import.meta.glob("/levels/generated/*.json")` sem `eager` (um chunk com hash por fase,
  ADR 0005); fase inexistente → rejeita com erro que diz o número.
- **`src/game/scenes/level-scene.ts`:** recebe os dados da fase; registra no cache de
  tilemaps do Phaser, liga o tileset embutido pelo nome à imagem importada pelo Vite,
  cria `terrain` e `decor`, o fundo e a câmera (ADR 0009). Substitui a `EmptyScene`.
- **`src/ui/strings.ts`:** `levelLabel(n)` → "Fase 1"; o canvas passa a usar esse
  rótulo ao entrar na fase.

## Regras e casos de borda

- O jogo só lê `levels/generated/` (ADR 0004): nada de `.tmj` no bundle.
- O `image` do tileset embutido serve ao Tiled; o jogo usa a URL com hash do Vite.
- Câmera com limites `0..largura × 18` e `0..270`; mapa de 15 linhas exatas, sem rolagem
  vertical. Posição da câmera arredondada (ADR 0009).
- Fundo com cor do token do céu atrás (ADR 0009) e sem piscar.
- Fase 1 com vão aberto até a linha 14 (queda abaixo do mapa, ADR 0006), nunca com chão
  falso.
- `levels:build` com `levels/manual/` vazio → grava nada e apaga os `.json` antigos; com
  `levels/manual/1.tmj` ou `abc.tmj` (nome fora de `NNN`) → erro; `000.tmj` ou `101.tmj`
  → erro (fases 1 a 100).

## Interface

Nenhuma tela de menu nova. O canvas mostra a fase em vez do personagem parado da cena
vazia do 1a; o título continua igual. Nenhum token novo; a cor do céu continua no token
`--color-sky`. Texto novo em `src/ui/strings.ts`: "Fase {n}".

## Testes necessários

- **`src/domain/tsx.test.ts`:** o texto real de `tileset-tiles.tsx` → `tilewidth` 18,
  `tileheight` 18, `tilecount` 180, `columns` 20, `imagewidth` 360, `imageheight` 162,
  `image` `../Tilemap/tilemap_packed.png`; sem `tilecount` → erro; com `spacing="1"` →
  erro.
- **`src/domain/tmj.test.ts`** (fixtures pequenas, 27×15 para manual e 16×15 para
  trecho): os casos-limite do ADR 0012 com os valores dele (GID 181, bit de espelhar
  `0x80000001`, `data` com 1499 itens num 100×15, `"coin "` e `"Coin"`, sem `flag`, dois
  `start`, `minTier` 11 e `minTier` num `start`, ponto em `x` 1800 num mapa de 100
  tiles, tileset de personagens); camada `decor` faltando ou camada extra → erro;
  `height` 14 → erro; trecho com largura 15 e 49 → erro, 16 e 48 → aceita (ADR 0005);
  manual com largura 26 → erro, 27 e 300 → aceita; trecho com `start` sem a tag `start`
  → erro; spawn em `x` 9, `y` 225 → coluna 0, linha 12.
- **`src/domain/level.test.ts`:** `targetTimeSeconds` 25 para larguras 97 e 100, 26 para
  101; `tier` 1 na fase 1, 10 na 100; duas chamadas com a mesma entrada → mesma string;
  entrada com chaves em outra ordem → mesma string; `contentHash` igual aos 16
  primeiros hex do SHA-256 da serialização sem ele (com `node:crypto` injetado no
  teste); trocar um GID → `contentHash` muda; saída termina em `\n` e não tem `\r`.
- **`scripts/build-levels.test.ts`:** build duas vezes em pastas temporárias → bytes
  iguais; o `001.tmj` real passa; `.json` sem fonte é apagado; `.tmj` com erro → código
  1 e mensagem com arquivo e posição; o `001.json` versionado é igual ao que o build
  produz agora (até o `levels:check` do 1g, este teste é a garantia).
- **E2E (`e2e/level.spec.ts`)**, nos dois projetos: antes de "Jogar", nenhuma requisição
  do chunk da fase; depois, a requisição acontece e o canvas tem o rótulo "Fase 1";
  viewport 1920×1080 → canvas 1920×1080; 844×390 → 693×390; nenhum `console.error`,
  `pageerror` ou violação de CSP. A fumaça do 1a continua passando (ajustada se ela
  esperava a cena vazia).
- **Conferência à mão:** prévia de `001.tmj` revisada pelo agente e pelo dono; a fase
  vista em 1920×1080 e 844×390 sem tremor nem fresta; os dois arquivos abertos no Tiled,
  se o dono o tiver.
- Cobertura do `domain` continua ≥ 95% (ADR 0010).

## Tarefas por agente

1. **devops** — configuração:
   - `tsconfig.json` com `allowImportingTsExtensions` e `erasableSyntaxOnly` (decisão
     pendente 2), conferindo que Vite, Vitest e `tsc` aceitam; extensão `.ts` nos imports
     relativos existentes de `src/domain` e `scripts/`; se o Biome da versão instalada
     tiver regra de extensão de import, ligá-la para essas pastas.
   - Scripts `levels:build` (`node scripts/build-levels.ts`) e `levels:preview` no
     `package.json`; conferir no Node 24 instalado que roda sem flag.
   - `.gitignore` e `biome.json` com `.preview/`; `levels/generated/` já ignorado pelo
     Biome.
   - Conferir que o build do Vite gera um chunk com hash por fase e que a fase não entra
     no chunk principal.
2. **game** — formato, build e prévia:
   - `src/domain/tsx.ts`, `src/domain/tmj.ts`, `src/domain/level.ts` (Contratos).
   - `scripts/build-levels.ts` e `scripts/level-preview.ts` (Contratos).
3. **game** — a fase 1:
   - `pnpm levels:preview --sheet`; escolher a paleta de grama, terra e decoração e
     escrever `levels/README.md`.
   - Escrever `levels/manual/001.tmj` (decisão pendente 4) direto em JSON, com script
     descartável no diretório temporário, se ajudar; conferir pela prévia, ajustar até
     o desenho ficar coerente (bordas de grama nos cantos, sem tile solto) e rodar
     `pnpm levels:build`. Mostrar a prévia ao dono antes do commit.
4. **game** — cena:
   - `src/game/levels.ts`, `src/game/scenes/level-scene.ts` (fundo, camadas, ponto que a
     câmera segue), troca da `EmptyScene` pela fase 1 ao "Jogar", rótulo do canvas, texto
     em `src/ui/strings.ts`. Conferir na doc e nos tipos do Phaser instalado a carga de
     tilemap a partir de objeto já em memória e o `addTilesetImage` com tileset embutido.
5. **qa** — testes da seção Testes necessários, ajuste da fumaça do 1a e a conferência
   à mão em 1920×1080 e 844×390.

Fora de `docs/`, para a sessão principal:

- `CLAUDE.md`: em Comandos, `levels:build` passa a "(nasce no 1b; gerador no 1g)" e entra
  `pnpm levels:preview <arquivo>  # prévia em PNG em .preview/ (nasce no 1b)`; na
  Estrutura, `levels/README.md` e `.preview/`; quando o ADR 0012 for aceito, uma linha
  nas regras: "Trechos e fases manuais escritos por agente no subconjunto do Tiled
  conferido pelo build. (ADR 0012)".
- `.claude/agents/game.md`: incluir o ADR 0012 entre os que lê ao mexer em `levels/`.
- `.claude/hooks/config.json`: nada (`levels/` já é do `game`; `.preview/` é saída local).
- `docs/STATUS.md`: a questão de quem desenha os trechos (seção Decisões pendentes).

## Riscos e alternativas descartadas

- **Desenho feio ou incoerente feito às cegas:** a prévia em PNG e a folha numerada são
  a forma de o agente ver; o dono aprova a prévia antes do commit.
- **Phaser não ler algum campo do tileset embutido:** a cena do E2E acusa; o campo
  extra sai da saída (mudança no ADR 0012).
- **Remoção de tipos do Node recusar sintaxe** (enum, `namespace`): `erasableSyntaxOnly`
  faz o `tsc` acusar antes; alternativa `tsx`, com mudança no ADR 0003.
- **Arquivo salvo pelo Tiled com versão de formato mais nova** (ex.: `"1.11"`): o ADR
  0012 aceita a linha 1; campo novo desconhecido falha o build com mensagem clara.
- Descartado: `load.tilemapTiledJSON` com o `.tmj` cru (o Phaser não resolve tileset
  externo, e o ADR 0004 proíbe); `import.meta.glob` com `eager` (baixaria as 100 fases
  na página inicial); prévia por servidor do Vite e página de desenvolvimento (mais
  peças que um script com Playwright); biblioteca de PNG no Node (dependência nova sem
  necessidade); parser de XML para o `.tsx` (dois arquivos fixos e conferidos por hash).
