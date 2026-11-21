# Fases e trechos

- `manual/NNN.tmj`: fases feitas à mão (no MVP, só a 001, o tutorial).
- `chunks/`: trechos do gerador. No 1g são 10 provisórios (abaixo); a biblioteca real vem
  no 1h.
- `generated/NNN.json`: saída do build, versionada; o jogo só lê esta pasta. Não edite à
  mão: o `levels:check` (no CI) falha com qualquer diferença.

O formato aceito, quem escreve e como o arquivo é conferido estão no ADR 0012 (camadas e
propriedades no ADR 0013). Os arquivos são escritos por um agente direto em JSON do Tiled
e podem ser abertos e salvos no Tiled.

## Comandos

```bash
pnpm levels:build                         # gera as 100 fases (manuais e geradas) em generated/
pnpm levels:check                         # gera em memória e compara com generated/
pnpm levels:preview levels/manual/001.tmj # PNG em .preview/001.png (régua a cada 5 colunas)
pnpm levels:preview levels/generated/050.json # prévia de uma fase gerada
pnpm levels:preview --sheet               # folha de tiles numerada (id local/GID)
pnpm levels:preview --sheet characters    # folha dos personagens (quadros de 24 px)
pnpm levels:preview --sheet backgrounds   # folha das faixas de fundo
```

Na prévia, os spawns aparecem como letras: S início, F bandeira, W andador, V voador,
C moeda, H coração, M mola, K espinhoso, U voador vertical, G item secreto.

## Paleta de tiles (GID = id local + 1)

Trechos e fases manuais usam só esta paleta, a do campo; qualquer outro GID (areia, neve...)
falha o build com "outside the base palette". O build troca os tiles pelos do tema do bloco
de fases (tabelas em `src/domain/tiles.ts`, `THEME_TILES`; ADR 0015), então a geometria é a
mesma em todos os temas.

| Uso | GID |
|---|---|
| Grama no topo do chão: coluna sozinha, borda esquerda, meio, borda direita | 21, 22, 23, 24 |
| Terra abaixo da grama: coluna sozinha, borda esquerda, meio, borda direita | 121, 122, 123, 124 |
| Plataforma de uma linha: bloco sozinho, borda esquerda, meio, borda direita | 1, 2, 3, 4 |
| Espinho (camada `terrain`) | 69 |
| Decoração: broto, planta alta, pinheiro, cogumelo | 125, 126, 127, 129 |
| Decoração: placa com seta | 86 |

Bordas: a coluna com vazio à esquerda (vão ou chão mais baixo) leva a borda esquerda; com
vazio à direita, a borda direita. A borda do mapa conta como chão que continua. Vão fica
aberto até a última linha (queda, ADR 0006). Espinhoso (`spiky`) fica no chão, como o andador; voador vertical (`flyer-v`) no ar, em
célula livre; `secret` é o item secreto (no máximo um por fase; o gerador sorteia um entre os
dos trechos). `minTier` vale também nesses três.

## Fase gerada

Do número da fase saem a semente e o tier; a fase é o trecho de início, os trechos do
meio sorteados pela curva e o trecho de chegada, lado a lado, nesta ordem. A lista fica na
propriedade `chunks` da fase. Regras do sorteio, do encaixe e do validador: ADR 0013. Cada
faixa de dificuldade precisa de 2 trechos do meio diferentes, ou a fase não fecha.

Nome do trecho: só `a-z`, `0-9` e `-`. `tags`: `start` (tem o `S`) ou `finish` (tem o
`F`); sem tag é trecho do meio. `entryRow` e `exitRow` são a linha da grama na primeira e
na última coluna.

## Trechos provisórios (1g)

| Trecho | Dificuldade | Entrada → saída | O que tem |
|---|---|---|---|
| `start` | início | 12 → 12 | chão plano, `S` |
| `finish` | chegada | 12 → 12 | chão plano, moedas, `F` |
| `meadow` | 1 | 12 → 12 | chão plano, moedas, andador |
| `hop` | 1 | 12 → 12 | vão de 2, bloco de 2 linhas |
| `gaps` | 3 | 12 → 12 | dois vãos de 3, plataforma; voador vertical, item secreto |
| `climb` | 4 | 12 → 10 | vão de 2 e dois degraus; andador com `minTier` 5; espinhoso |
| `spikes` | 6 | 12 → 12 | espinhos, vão de 3, plataformas, voador, espinhoso, item secreto |
| `ledge` | 7 | 12 → 10 | pilar entre vãos, voador, item secreto |
| `tower` | 9 | 9 → 12 | começa alto (só encaixa depois de saída 10 ou 11), espinhos |
| `summit` | 10 | 12 → 10 | vãos, espinhos, pilar, voador, voador vertical, item secreto |
