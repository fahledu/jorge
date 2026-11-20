# 0013. Fases: gerador, curva e validador (substitui o 0005)

- Status: Aceito
- Data: 2026-11-20
- Correção: 2026-11-20, o pulo confere as linhas `r − folga` até `r − 1` em todas as
  colunas (antes ia até `min(r, r') − 1` e deixava atravessar um teto ao subir); sem
  mudar números.

## Contexto
O ADR 0005 decidiu gerar as 100 fases no build a partir de trechos do Tiled, com semente
fixa, curva por grupos de 10 e um validador de alcance. Ao planejar o gerador (plano 1g)
apareceram lacunas que mudam a saída e que os trechos do 1h precisam respeitar: hash da
semente, pesos do sorteio, trechos de início e de chegada, nova tentativa, arredondamento
da densidade, bordas na junção, o modelo exato do validador e as propriedades da fase
gerada. Apareceram também duas contradições: "a primeira fase do bloco seguinte alivia"
não sai de nenhum número do ADR (a janela sobe com o tier e o peso maior é o do tier), e
"não repetir o trecho seguido" faz falhar toda janela com um só trecho (inclusive o caso
"o tier 10 sorteia 8" com um trecho só de dificuldade 8). Como já há código, o 0005 não é
editado: este ADR o substitui por inteiro. O que não está marcado como novo repete o 0005.

## Decisão

### Gerar no build, versionar a saída
- As 100 fases são geradas por `pnpm levels:build` (script Node que roda o `src/domain`)
  e gravadas em `levels/generated/NNN.json` (001 a 100), **versionadas no git**. O jogo
  só lê esses arquivos (ADR 0004).
- `pnpm levels:check` (no CI) gera de novo em memória e falha se o resultado diferir dos
  arquivos versionados (arquivo diferente, faltando ou sobrando), ou se alguma fase falhar
  no validador. Mudança de trecho, de curva ou do gerador aparece no diff das fases.
- Cada fase é carregada sob demanda (import dinâmico com hash no nome pelo Vite): a
  página inicial não baixa as 100.

### Formato
- **Trecho** (`levels/chunks/<nome>.tmj`, JSON do Tiled, tileset externo
  `assets/kenney/Tiled/tileset-tiles.tsx`; subconjunto e conferência no ADR 0012): camada
  `terrain` (colide), `decor` (não colide), `spawns` (pontos de inimigo, moeda, coração,
  mola, com `minTier` opcional). Propriedades do mapa: `difficulty` (1 a 10), `entryRow` e
  `exitRow` (linha do chão na primeira e na última coluna), `tags` (opcional). Altura 15,
  largura de 16 a 48 tiles. *Novo:* nome do arquivo só com `[a-z0-9-]`, terminado em
  `.tmj` (o nome entra na lista de trechos da fase); outro nome falha o build.
- **Tags** (*novo*): `start` marca trecho de início (tem o `start`), `finish` trecho de
  chegada (tem o `flag`); trecho com as duas falha o build. Trecho sem nenhuma das duas é
  trecho do meio.
- **Fase gerada:** JSON no formato Tiled com tileset embutido (ADR 0012, "Saída do
  build"), com as propriedades, em ordem de nome: `chunks` (string, nomes dos trechos em
  ordem, separados por vírgula), `contentHash`, `generatorVersion` (int), `levelNumber`,
  `seed` (int), `targetTimeSeconds` (ADR 0006), `tier`. `contentHash` = 16 primeiros
  caracteres hex do SHA-256 da serialização canônica sem o próprio `contentHash`. O save
  grava esse valor em cada recorde (ADR 0007).
- *Novo:* na fase gerada, os spawns desligados não são gravados; os ativos levam `x`
  somado ao deslocamento do trecho, ids de 1 a N na ordem dos trechos (e, dentro do
  trecho, na ordem do id de origem), sem `minTier`.
- **Fase manual** (`levels/manual/NNN.tmj`): substitui a gerada daquele número, passa pelo
  mesmo build e pelo validador. No MVP só a fase 1 (tutorial) é manual.

### Gerador
- **Semente** (*novo no detalhe*): `seed(n)` = FNV-1a de 32 bits do texto ASCII
  `` `${SEED_BASE}:${n}` ``, com `SEED_BASE = "jorge"`. **PRNG:** mulberry32 sobre essa
  semente, valores em [0, 1). Nada de `Math.random` (ADR 0004).
- **Ordem do sorteio** (*novo*): uma sequência por fase, consumida nesta ordem: trecho de
  início, trechos do meio um a um, trecho de chegada, escolha dos inimigos ativos. Cada
  sorteio de trecho consome um valor, mesmo com um candidato só. Os candidatos ficam em
  ordem de nome do arquivo.
- **Curva:** `tier(n) = ceil(n / 10)` (1 a 10).
  - Trechos do meio com `difficulty` em `[max(1, tier − 2), tier]`. *Novo:* peso 3 para
    `difficulty = tier`, 2 para `tier − 1`, 1 para `tier − 2`; sorteio pela soma
    acumulada dos pesos dos candidatos.
  - Número de trechos do meio: `3 + floor((n − 1) / 15)` (3 na fase 1, 9 na fase 100),
    mais o de início e o de chegada.
  - Densidade de inimigos: `0,3 + 0,6 × (n − 1) / 99`.
  - Andador liberado desde o tier 1, voador desde o 3.
  - *Muda o 0005:* dentro do bloco a dificuldade sobe pela densidade (contínua) e pelo
    número de trechos; não há alívio no começo do bloco seguinte. O ajuste fino da curva
    é do item 1h, pelo teste à mão, e muda este ADR.
- **Início e chegada** (*novo*): sorteados com peso igual entre os trechos da tag, sem
  janela de dificuldade; a chegada precisa encaixar no último trecho do meio.
- **Encaixe:** trecho seguinte só se `entryRow ≥ exitRow anterior − 2` (sobe no máximo 2
  linhas, desce qualquer valor). Um mesmo trecho não aparece duas vezes seguidas.
  *Novo:* os candidatos de cada posição são os da janela que encaixam e não repetem o
  anterior; posição sem candidato recomeça a fase inteira, continuando a mesma sequência,
  até 20 vezes; esgotado, o build falha com a fase, o tier, a posição e o `exitRow`.
  Janela sem nenhum trecho (antes do encaixe) falha na hora, com a fase e o tier.
  Consequência: cada janela precisa de pelo menos 2 trechos do meio distintos.
- **Bordas na junção** (*novo*): nas duas colunas de cada junção, os tiles das famílias de
  borda da tabela de `src/domain/tiles.ts` (grama do topo, terra, plataforma; a paleta está
  em `levels/README.md`) são trocados pela variante que a vizinhança na mesma linha pede:
  vazio dos dois lados → sozinho; só à esquerda → borda esquerda; só à direita → borda
  direita; nenhum → meio. Tile de fora das famílias fica como está.
- **Spawns** (*novo no detalhe*): spawn com `minTier` acima do tier fica desligado;
  voador antes do tier 3 também. Moedas, corações e molas restantes ficam todos ativos.
  Dos inimigos restantes da fase (E), ficam ativos `round(densidade × E)` (meio para
  cima), escolhidos por Fisher–Yates parcial com o PRNG sobre a lista na ordem da fase.
- `generatorVersion` começa em 1 e sobe a cada mudança que altere a saída; o save não
  depende dela (usa o `contentHash`, ADR 0007).

### Validador de alcançabilidade
- Toda fase (gerada ou manual) passa por um validador no `domain`; fase em que a bandeira
  não é alcançável do início falha o build, com a fase, os trechos e a coluna mais à
  direita alcançada. Fase gerada que falha não é sorteada de novo.
- **Limites** derivados de `physics.ts` (ADR 0004), abaixo do alcance real: subida
  `floor(jumpReach().heightTiles) − 1` = 3 linhas; vão `floor(jumpReach().gapTiles) − 1` =
  3 tiles; *novo:* folga acima da cabeça `ceil(heightTiles + altura do corpo / 18) − 1` =
  5 linhas acima da linha dos pés.
- **Modelo** (*novo*): célula sólida = tile que não é espinho; espinho não é chão nem
  passagem; esquerda, direita e cima do mapa são parede (como os limites do mundo); abaixo
  do mapa é queda. Posição em pé `(c, r)`: `(c, r)` e `(c, r − 1)` livres (nem sólidas
  nem espinho) e `(c, r + 1)` sólida. Movimentos a partir de `(c, r)`:
  - andar para `(c ± 1, r)` em pé;
  - sair da borda: `(c ± 1, r)` e `(c ± 1, r − 1)` livres sem chão → cai reto na coluna
    até a primeira posição em pé; espinho no caminho ou fim do mapa → nada;
  - pular para `(c', r')` em pé com `|c' − c| ≤ vão + 1` e `r − r' ≤ subida` (descer,
    qualquer valor), se estão livres as células das colunas de `c` a `c'`, das linhas
    `r − folga` até `r − 1`, e as da coluna `c'` da linha `r − folga` até `r'`.
- Início: da célula do `start`, cai reto até a primeira posição em pé. Bandeira alcançada:
  posição em pé na coluna do `flag`, na linha dele ou uma acima.
- Inimigos ignorados (podem ser pisados ou evitados); molas ignoradas (a bandeira tem de
  ser alcançável só com o pulo).

## Casos-limite
- Rodar `levels:build` duas vezes → arquivos idênticos byte a byte, mesmos `contentHash`.
- Trocar um tile (ou um spawn) de um trecho → só mudam as fases cujo `chunks` o contém.
- Fase 1 → tutorial manual; fase 10 → tier 1, 3 trechos do meio; fase 11 → tier 2;
  fase 100 → tier 10, 9 trechos do meio, densidade 0,9.
- Vão de 4 tiles entre dois chãos na mesma altura → rejeita; vão de 3 → aceita.
- Degrau de 3 para cima → aceita; de 4 → rejeita. Degrau de 3 com vão de 3 → aceita.
- Chão na linha 12 (pés na 11), vão de 3 com teto sólido na linha 6 → rejeita; teto na
  linha 5 → aceita.
- Laje sólida duas linhas acima dos pés, sem outra saída → o pulo não a atravessa; rejeita.
- Um espinho no chão entre dois trechos de chão → aceita (pulo por cima); 4 espinhos
  seguidos sem chão livre → rejeita; 3 → aceita.
- Bandeira numa plataforma alcançável só pela mola → rejeita.
- `start` sobre um vão aberto até o fundo → rejeita.
- Biblioteca sem trecho de dificuldade 9 ou 10 e com dois de 8 → o tier 10 sorteia só os
  de 8, alternando; com um só de 8 → o build falha no segundo trecho do meio, com a fase,
  o tier e a posição; sem nenhum trecho de 8 a 10 → falha com a fase e o tier.
- `exitRow` 12 seguido de `entryRow` 9 → recusado; `entryRow` 10 ou 14 → aceito.
- Trecho com as tags `start` e `finish` → build falha. Biblioteca sem trecho `finish` →
  build falha na fase 2.
- Fase 2 com 5 andadores elegíveis (densidade 0,306…) → 2 ativos; fase 100 com 10 → 9.
- Voador na fase 20 (tier 2) → desligado; na 21 → elegível. Moeda com `minTier` 4 na
  fase 30 → desligada; na 31 → ativa.
- Fase manual `levels/manual/007.tmj` com bandeira inalcançável → build falha.
- Arquivo de fase gerada editado à mão (um byte) → `levels:check` falha nomeando o arquivo.

## Descartado
- **Gerar em tempo de execução com semente fixa:** a fase muda sem aparecer no diff; o
  bundle leva o gerador e os trechos; não dá para revisar nem abrir a fase no Tiled.
- **100 fases feitas à mão:** custo fora do MVP; fica o mecanismo de fase manual.
- **Geração procedural sem trechos:** difícil garantir fases bonitas e justas.
- **Bot que joga a fase como validador:** caro e frágil; o validador conservador e o
  teste à mão em fases de amostra bastam no MVP.
- **Rampa de pesos dentro do bloco (alívio no começo):** para aliviar, o tier teria de
  perder o peso maior no começo do bloco, contra a regra da janela; o 1h decide pelo
  teste à mão se precisa.
- **Permitir o mesmo trecho seguido quando a janela só tem um:** fase repetida é o que a
  hipótese do MVP quer evitar; melhor exigir 2 por janela.
- **Sortear de novo a fase que falha no validador:** esconderia um trecho ruim.
- **Mola como salto no validador:** cada trecho teria de garantir o pouso; fica fora até
  um trecho do 1h precisar.
