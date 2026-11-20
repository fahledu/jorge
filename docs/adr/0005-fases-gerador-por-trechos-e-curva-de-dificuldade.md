# 0005. Fases: gerador por trechos e curva de dificuldade

- Status: Substituído por 0013
- Data: 2026-11-18

> Substituído pelo [ADR 0013](0013-fases-gerador-curva-e-validador.md) em 2026-11-20. O
> texto abaixo fica como histórico; a regra vigente está no 0013.

## Contexto
O jogo tem 100 fases de dificuldade crescente. Desenhar 100 fases à mão não cabe no
MVP; geração aleatória pura sai sem graça ou impossível. A escolha do usuário: trechos
desenhados à mão no Tiled, combinados por um gerador com semente fixa e curva de
dificuldade; as fases são determinísticas e versionadas, e algumas podem ser feitas à
mão.

## Decisão

### Gerar no build, versionar a saída
- As 100 fases são geradas por `pnpm levels:build` (script Node que roda o
  `src/domain`) e gravadas em `levels/generated/NNN.json` (001 a 100), **versionadas no
  git**. O jogo só lê esses arquivos (ADR 0004).
- `pnpm levels:check` (no CI) gera de novo em memória e falha se o resultado diferir dos
  arquivos versionados, ou se alguma fase falhar no validador. Mudança de trecho, de
  curva ou do gerador aparece no diff das fases e é revisada.
- Cada fase é carregada sob demanda (import dinâmico com hash no nome pelo Vite): a
  página inicial não baixa as 100.

### Formato
- **Trecho** (`levels/chunks/<nome>.tmj`, JSON do Tiled, tileset externo
  `assets/kenney/Tiled/tileset-tiles.tsx`): camada de tiles `terrain` (colide), camada
  `decor` (não colide), camada de objetos `spawns` (pontos de inimigo, moeda, coração,
  mola, com `minTier` opcional). Propriedades do mapa: `difficulty` (1 a 10),
  `entryRow` e `exitRow` (linha do chão na primeira e na última coluna), `tags`
  (opcional). Altura fixa de 15 tiles; largura livre de 16 a 48 tiles.
- **Fase gerada:** JSON no formato Tiled com tileset embutido (o que o loader do Phaser
  aceita), mais propriedades `levelNumber`, `seed`, `generatorVersion`, `tier`,
  `targetTimeSeconds` (ADR 0006), a lista de trechos usados e `contentHash`: os 16
  primeiros caracteres hex do SHA-256 do JSON da fase sem o próprio `contentHash`,
  calculado pelo build. Identifica a versão da fase; o save grava esse valor em cada
  recorde (ADR 0007).
- **Fase manual** (`levels/manual/NNN.tmj`): substitui a gerada daquele número, passa
  pelo mesmo build (normalização, validador) e pelas mesmas regras. No MVP só a fase 1
  (tutorial) é manual.

### Gerador
- PRNG próprio no `domain` (ex.: mulberry32), semente da fase =
  hash(`SEED_BASE`, número da fase). Nada de `Math.random` (ADR 0004).
- **Curva:** `tier(n) = ceil(n / 10)` (1 a 10); dentro do bloco de 10 a dificuldade
  sobe e a primeira fase do bloco seguinte alivia.
  - Trechos sorteados com `difficulty` em `[max(1, tier − 2), tier]`, peso maior para
    `tier`.
  - Número de trechos do meio: `3 + floor((n − 1) / 15)` (3 na fase 1, 9 na fase 100),
    mais o trecho de início e o de chegada (bandeira).
  - Densidade de inimigos: fração dos `spawns` de inimigo ativados = `0,3 + 0,6 ×
    (n − 1) / 99`; spawns com `minTier` acima do tier ficam desligados.
  - Tipos de inimigo liberados por tier: andador desde o 1, voador desde o 3.
- **Encaixe:** trecho seguinte só se `entryRow` dele difere do `exitRow` anterior em no
  máximo 2 linhas para cima ou qualquer valor para baixo; sem candidato, tenta outro
  sorteio da mesma sequência (determinístico) e, esgotado, falha o build.
- Um mesmo trecho não aparece duas vezes seguidas na fase.
- `generatorVersion` sobe a cada mudança que altere a saída; o save não depende dela
  (usa o `contentHash` de cada fase, ADR 0007).

### Validador de alcançabilidade
- Toda fase (gerada ou manual) passa por um validador no `domain`: busca em largura
  sobre as posições em pé, com saltos limitados por constantes **conservadoras**
  derivadas de `physics.ts` (ADR 0004): altura máxima de 3 tiles e vão máximo de
  3 tiles, abaixo do alcance real (4). Espinhos não servem de chão; inimigos são
  ignorados (podem ser pisados ou evitados).
- Fase em que a bandeira não é alcançável do início falha o build.

## Casos-limite
- Rodar `levels:build` duas vezes → arquivos idênticos byte a byte, mesmos
  `contentHash`.
- Trocar um tile de um trecho usado só na fase 37 → só o `contentHash` da 37 muda.
- Fase 1 → tutorial manual; fase 10 → tier 1, 3 trechos do meio; fase 11 → tier 2;
  fase 100 → tier 10, 9 trechos do meio, densidade 0,9.
- Vão de 4 tiles entre dois chãos na mesma altura → validador rejeita; vão de 3 → aceita.
- Degrau de 3 tiles para cima → aceita; de 4 → rejeita.
- Biblioteca sem trecho de dificuldade 9 ou 10 → o tier 10 usa 8 a 10 e sorteia 8;
  se não houver nenhum trecho na janela, o build falha com a fase e o tier.
- `exitRow` 12 seguido de trecho com `entryRow` 9 (sobe 3) → encaixe recusado.
- Fase manual `levels/manual/007.tmj` com bandeira inalcançável → build falha.
- Arquivo de fase gerada editado à mão → `levels:check` falha no CI.

## Descartado
- **Gerar em tempo de execução com semente fixa:** a fase muda sem aparecer no diff a
  cada ajuste do gerador; o bundle leva o gerador e os trechos; não dá para revisar nem
  abrir a fase gerada no Tiled.
- **100 fases feitas à mão:** custo fora do MVP; fica o mecanismo de fase manual.
- **Geração procedural sem trechos:** difícil garantir fases bonitas e justas.
- **Bot que joga a fase de verdade como validador:** caro e frágil; o validador
  conservador, mais o jogo testado à mão em fases de amostra, basta no MVP.
