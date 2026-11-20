# 0012. Arquivos .tmj: autoria por agente e validade

- Status: Aceito
- Data: 2026-11-18

## Contexto
O ADR 0005 define as camadas e as propriedades de trechos e fases manuais, mas supunha
o dono desenhando no Tiled. O usuário decidiu que um agente escreve o JSON do Tiled
(`.tmj`) direto, para a fase 1 e para os trechos do 1h. Um agente não abre o Tiled nem
vê o que desenhou: sem regra, sai um arquivo que o Phaser lê mas o Tiled não abre, com
GID fora da folha ou com tipo de spawn escrito errado. Este ADR detalha o formato que o
ADR 0005 deixou aberto (tipos de spawn, início e bandeira) e como o arquivo é conferido;
não muda nenhuma decisão dele.

## Decisão

### Autoria
- Trechos (`levels/chunks/`) e fases manuais (`levels/manual/`) são escritos por um
  agente, em JSON do Tiled. O `.tmj` é a única fonte: script que o agente usar para
  produzir o arquivo é descartável e não vai para o git.
- O dono pode abrir e salvar no Tiled; o arquivo salvo pelo Tiled passa pelas mesmas
  regras (formatação e ordem das chaves não importam).
- Antes do commit, o agente confere o desenho pela prévia em PNG (`pnpm levels:preview`)
  e o arquivo pelo build de fases.

### Formato aceito (subconjunto do Tiled JSON)
- Mapa: `type: "map"`, `version` `"1.10"` ou posterior da linha 1 (o agente escreve
  `"1.10"` e `tiledversion: "1.10.2"`), `orientation: "orthogonal"`,
  `renderorder: "right-down"`, `infinite: false`, `tilewidth` e `tileheight` 18,
  `height` 15, `compressionlevel: -1`, `nextlayerid` e `nextobjectid` maiores que todo id
  usado. Largura de trecho conforme o ADR 0013; fase manual de 27 a 300 tiles.
- Camadas, nesta ordem e só estas: `terrain` e `decor` (`tilelayer`, `data` como lista
  de inteiros com `width × height` itens, sem `encoding` nem compressão) e `spawns`
  (`objectgroup`, `draworder: "topdown"`). Ids de camada e de objeto únicos.
- **Tileset:** um só, externo, `firstgid: 1`, `source` relativo ao arquivo apontando
  para `assets/kenney/Tiled/tileset-tiles.tsx`. GID 0 é vazio; os demais vão de 1 a
  `tilecount` do `.tsx` (180). Bits de espelhar e girar não são aceitos.
- **Spawns:** objetos ponto (`point: true`) com `type` numa lista fechada: `start`,
  `flag`, `walker`, `flyer`, `coin`, `heart`, `spring`. O ponto fica dentro do mapa; a
  célula do spawn é `floor(x / 18)`, `floor(y / 18)`. Propriedade opcional `minTier`
  (int, 1 a 10) só em `walker`, `flyer`, `coin`, `heart` e `spring`.
- **Spawn de inimigo:** a célula de um `walker` ou `flyer` não é sólida nem espinho, e a
  célula abaixo de um `walker` é sólida (espinho não conta). Vale para fases manuais e
  trechos.
- **Início e bandeira:** fase manual tem exatamente um `start` e um `flag`. Trecho só
  tem `start` se tiver a tag `start`, e só tem `flag` se tiver a tag `finish` (um de
  cada); os demais trechos não têm nenhum.
- Espinho é tile da camada `terrain`, reconhecido pela tabela de `src/domain/tiles.ts`
  (ADR 0008), não spawn.
- **Propriedades:** as do ADR 0013 para trecho; fase manual não tem nenhuma (o número
  vem do nome do arquivo). Propriedade, camada, tipo de spawn ou campo desconhecido é
  erro (pega erro de digitação).

### Conferência
- O leitor do `domain` valida o `.tmj` com schema e devolve erro com arquivo, camada e
  posição (coluna e linha); o build de fases falha no primeiro arquivo inválido.
- O `.tsx` referenciado é lido pelo build (atributos do `tileset` e da `image`) e
  precisa existir em `assets/kenney/`.

### Saída do build
- A fase em `levels/generated/NNN.json` segue o ADR 0013, com o tileset embutido:
  `name`, `tilewidth`, `tileheight`, `tilecount`, `columns`, `margin`, `spacing`,
  `imagewidth`, `imageheight` e `image` relativo à pasta de saída
  (`../../assets/kenney/Tilemap/tilemap_packed.png`), para a fase gerada também abrir
  no Tiled.
- Fase manual tem as propriedades `levelNumber`, `tier`, `targetTimeSeconds`
  (ADR 0006), `source` (caminho do `.tmj` relativo a `levels/`) e `contentHash`
  (ADR 0013); sem `seed`, `generatorVersion` nem lista de trechos.
- Serialização canônica: chaves em ordem fixa, propriedades em ordem de nome, uma linha
  do mapa por linha de texto em `data`, LF e quebra de linha no fim. O `contentHash` é
  calculado sobre essa serialização sem a propriedade `contentHash`.

## Casos-limite
- `.tmj` com GID 181 em `terrain` → build falha com arquivo, camada, coluna e linha.
- GID com bit de espelhar ligado → build falha.
- `data` com 1499 itens num mapa 100×15 → build falha.
- Spawn com `type: "coin "` ou `"Coin"` → build falha (tipo desconhecido).
- Fase manual sem `flag`, ou com dois `start` → build falha.
- `minTier: 11`, ou `minTier` num `start` → build falha.
- Ponto em `x: 1800` num mapa de 100 tiles (largura 1800 px) → fora do mapa, falha.
- O mesmo `.tmj` reformatado (outra indentação e ordem de chaves, como o Tiled salva)
  → mesma saída byte a byte e mesmo `contentHash`.
- `source` do tileset apontando para `tileset-characters.tsx` → build falha.
- `walker` com a célula de baixo vazia ou com espinho, ou `flyer` dentro de terreno →
  build falha com arquivo, camada, coluna e linha. `walker` sobre chão → aceito.

## Descartado
- **Dono desenhando no Tiled:** decisão do usuário.
- **Fonte em outro formato (texto ASCII, script de desenho) convertida para `.tmj`:**
  duas fontes para a mesma fase; o `.tmj` deixaria de ser editável no Tiled sem
  divergir da outra.
- **Tileset embutido no `.tmj` de origem:** o ADR 0013 pede o externo; embutir repete a
  folha em cada trecho.
- **Tiles de objeto (`gid` no objeto) nos spawns:** exigiriam o tileset de personagens
  no mapa; ponto com `type` basta e o jogo escolhe o sprite.
- **Abrir no Tiled como teste automático:** o CI não tem o Tiled; o schema do
  subconjunto e a prévia em PNG cobrem.
