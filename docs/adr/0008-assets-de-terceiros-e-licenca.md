# 0008. Assets de terceiros e licença

- Status: Aceito
- Data: 2026-11-18

## Contexto
Os gráficos vêm do pack Pixel Platformer 1.2 da Kenney (CC0, crédito opcional), hoje na
pasta `kenney_pixel-platformer/` da raiz: PNGs avulsos, folhas (normal e `_packed`),
tilesets do Tiled e um projeto do Construct 3. O jogo usa só as folhas e os tilesets.
Pack inteiro no git pesa e mistura o que se usa com o que não se usa.

## Decisão
- **Cópia do que se usa em `assets/kenney/`, versionada**, com a mesma estrutura de
  pastas do pack para os caminhos relativos dos `.tsx` continuarem valendo:
  - `Tilemap/tilemap_packed.png`, `Tilemap/tilemap-characters_packed.png`,
    `Tilemap/tilemap-backgrounds_packed.png` (folhas sem espaçamento);
  - `Tiled/tileset-tiles.tsx`, `Tiled/tileset-characters.tsx`;
  - `License.txt` do pack, sem alteração.
- `assets/kenney/SOURCE.md` registra: nome e versão do pack, URL de origem, data da
  cópia e o SHA-256 de cada arquivo copiado. Um teste confere os hashes.
- **Arquivos do pack não são editados.** Recorte, recoloração ou animação derivada vai
  para `assets/own/` com a origem anotada no `SOURCE.md` dela.
- **A pasta `kenney_pixel-platformer/` da raiz sai do git** (`.gitignore`); fica só como
  fonte local para copiar arquivo novo quando um trecho precisar.
- **Atualizar o pack** (versão nova da Kenney): cópia nova, hashes novos, `levels:check`
  (ADR 0005) e o jogo testado à mão; ids de tile mudados quebram trechos e precisam de
  plano.
- **Crédito:** a tela de créditos diz "Gráficos: Kenney (kenney.nl), licença CC0".
- **Fontes (se alguma entrar; hoje os menus usam a do sistema, ADR 0009), sons e
  outros packs** seguem a mesma regra: só licença CC0 ou OFL,
  arquivo de licença copiado, servidos pelo próprio jogo (sem CDN, ADR 0011).
- **Ids de tile com papel no jogo** (moeda, coração, mola, espinho, bandeira,
  inimigos) ficam numa tabela única em `src/domain/tiles.ts`, usada pelo gerador, pelo
  validador e pela engine.

## Casos-limite
- Arquivo em `assets/kenney/` com hash diferente do `SOURCE.md` → teste falha.
- Trecho que usa tile de `Tilemap/tilemap.png` (com espaçamento) → fora da regra; os
  `.tsx` apontam para a versão `_packed`.
- Sprite novo do pack preciso para uma feature → copiado da pasta local e registrado no
  `SOURCE.md` no mesmo commit.

## Descartado
- **Pack inteiro no git:** inclui o projeto do Construct 3 e 180 PNGs avulsos que o jogo
  não usa.
- **Pack fora do git, baixado no build:** depende do site da Kenney no ar e de um link
  que muda entre versões.
- **Git LFS:** os arquivos usados têm poucas dezenas de KB.
