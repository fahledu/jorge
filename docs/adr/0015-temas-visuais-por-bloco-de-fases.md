# 0015. Temas visuais por bloco de fases

- Status: Aceito
- Data: 2026-11-20
- Revisado: 2026-11-20 (tema a cada 10 fases, 10 temas, expansões da Kenney, céu por
  tema). Editado direto, sem ADR novo: nenhum código implementava a versão anterior.

## Contexto
Jogando as fases do 1g, o usuário achou que todas têm a mesma cara: mesmo fundo, mesmo
terreno, mesmos inimigos e espinhos. O 1h previa terreno variado nos próprios trechos,
mas uma fase que junta trechos de terrenos diferentes fica remendada. A primeira versão
deste ADR tinha 3 temas (campo, deserto, neve) por blocos de 30 a 40 fases; o usuário
preferiu que a cara mude a cada 10 fases e aprovou usar também as expansões CC0 da
Kenney (ADR 0008). As expansões trazem terreno e decoração, mas nenhum fundo nem
personagem; o pack base tem 4 faixas de fundo (2 claras, laranja, verde).

## Decisão
- **Tema por bloco de 10 fases:** `theme(tier)` puro no `domain`; cada tier (ADR 0013,
  `tier(n) = ceil(n / 10)`) tem o seu tema, sem repetir. O tema sai do `tier` já gravado
  na fase; a fase não ganha propriedade nova.
- **Os 10 temas, na ordem dos tiers:**

  | Tier | Fases | Tema | Id | Terreno e decoração de |
  |---|---|---|---|---|
  | 1 | 1–10 | campo | `meadow` | pack base (grama) |
  | 2 | 11–20 | floresta | `forest` | pack base (grama, decoração de mata) |
  | 3 | 21–30 | fazenda | `farm` | expansão farm |
  | 4 | 31–40 | deserto | `desert` | pack base (areia) |
  | 5 | 41–50 | caverna | `cave` | pack base (terra sem cobertura) |
  | 6 | 51–60 | fábrica | `factory` | expansão industrial |
  | 7 | 61–70 | templo | `temple` | expansão blocks |
  | 8 | 71–80 | neve | `snow` | pack base (neve) |
  | 9 | 81–90 | doces | `candy` | expansão food |
  | 10 | 91–100 | castelo | `castle` | expansão blocks |

- **Paleta base:** trechos (e as fases manuais) são desenhados só na paleta do campo
  (`levels/README.md`). O gerador, depois do encaixe e das bordas na junção (ADR 0013),
  troca cada tile da paleta base pelo equivalente do tema por uma tabela única em
  `src/domain/tiles.ts`. A troca preserva o papel do tile: sólido continua sólido,
  decoração continua decoração; tile sem equivalente fica como está (decoração sem
  equivalente sai). O validador roda depois da troca. A mudança sobe o
  `generatorVersion`. O build aplica a mesma troca às fases manuais, pelo tier delas.
- **Só terreno e decoração mudam com o tema.** Tiles com papel no jogo (espinho, mola,
  moeda, coração, bandeira, item secreto) têm o mesmo sprite em todos os temas, para o
  jogador reconhecer o perigo e o que se pega.
- **Fundo:** sempre uma das 4 faixas da folha de fundos do pack base, sobre um céu de
  cor lisa. Cada tema define a faixa, a cor do céu e, se preciso, um tom (tint) sobre a
  faixa. Esses valores são visuais, não regra do jogo: moram numa tabela única do `game`
  e mudá-los não muda nenhuma fase gerada.
- **Legibilidade:** em cada tema, jogador, inimigos, espinhos, moedas e item se
  distinguem do fundo e do terreno; conferido à mão no jogo antes de o tema entrar.
- **Inimigos:** sprites do pack base em todos os temas (as expansões não têm
  personagens). Cada tema escolhe uma variante de cor por tipo de inimigo do ADR 0014;
  variantes repetem entre temas; nada de recolorir. O comportamento e os pontos não
  mudam com o tema.
- **Só assets do pack base e das expansões aceitas no ADR 0008**, copiados para
  `assets/kenney/` e registrados no `SOURCE.md`. A tabela de GIDs por tema sai do plano
  de cada item, pela folha numerada (`pnpm levels:preview --sheet`), e passa a ser a
  única em `tiles.ts`. Fase com tile de expansão precisa de mais de um tileset
  embutido: o formato é uma adição ao ADR 0012, feita no plano do item das expansões.

## Casos-limite
- Fase 10 → campo; 11 → floresta; 30 → fazenda; 31 → deserto; 41 → caverna; 51 →
  fábrica; 61 → templo; 71 → neve; 90 → doces; 91 → castelo; 100 → castelo.
- Fase manual 001 (tier 1, campo) → a troca não muda nenhum tile.
- Trecho com tile de areia desenhado direto → o build falha (fora da paleta base).
- Mesmo trecho nas fases 5 e 35 → mesma geometria, tiles diferentes; as duas passam no
  validador com o mesmo resultado.
- Trocar a tabela de tiles do deserto → só mudam as fases do deserto (31 a 40) e as dos temas que o emprestam provisoriamente (hoje o templo, 61 a 70, até o item 1g3).
- Trocar só a cor do céu ou o tom de um tema → nenhum arquivo de fase muda.
- Espinho da fase 95 → mesmo sprite do espinho da fase 5.

## Descartado
- **3 temas em blocos de tiers (1–30, 31–60, 61–100):** primeira versão deste ADR; 40
  fases seguidas com a mesma cara, e o usuário pediu troca a cada 10.
- **Fundo próprio por tema** (desenhado ou de outro pack): as expansões não têm fundo, e
  desenhar sai do CC0 da Kenney; céu e tom por tema já distinguem.
- **Recolorir inimigos por tema** (arquivo em `assets/own/`): custo sem pedido.
- **Espinho e coletáveis com visual por tema:** o jogador teria de reaprender o que fere.
- **Terreno escolhido por trecho:** fase remendada, e cada trecho teria de existir em
  cada terreno para não limitar o sorteio.
- **Tema como propriedade gravada na fase:** redundante com o `tier`.
- **Tema sorteado por fase:** a dificuldade sobe sem a cara acompanhar; o pedido é que a
  cara mude conforme avança.
