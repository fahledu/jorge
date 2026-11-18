# Fases e trechos

- `manual/NNN.tmj`: fases feitas à mão (no MVP, só a 001, o tutorial).
- `chunks/`: trechos do gerador (item 1h).
- `generated/NNN.json`: saída do build, versionada; o jogo só lê esta pasta. Não edite à mão.

O formato aceito, quem escreve e como o arquivo é conferido estão no ADR 0012 (camadas e
propriedades no ADR 0005). Os arquivos são escritos por um agente direto em JSON do Tiled
e podem ser abertos e salvos no Tiled.

## Comandos

```bash
pnpm levels:build                         # confere e normaliza manual/ em generated/
pnpm levels:preview levels/manual/001.tmj # PNG em .preview/001.png (régua a cada 5 colunas)
pnpm levels:preview --sheet               # folha de tiles numerada (id local/GID)
```

Na prévia, os spawns aparecem como letras: S início, F bandeira, W andador, V voador,
C moeda, H coração, M mola.

## Paleta de tiles (GID = id local + 1)

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
aberto até a última linha (queda, ADR 0006). Neve e areia entram com os trechos do 1h.
