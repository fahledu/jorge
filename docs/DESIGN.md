# Design system

Visual dos menus, do HUD e dos botões de toque do jogo (ADR 0009). A arte do jogo em si é
o pack Kenney Pixel Platformer (ADR 0008); este arquivo cobre o que fica em volta dela.

- **Token** é um nome com papel (`--color-primary`, `--space-4`...). Os nomes são iguais
  no mockup (`docs/mockup/index.html`) e no código. Nenhuma tela usa valor solto.
- **Tema único**, o do jogo: não segue claro/escuro do sistema (ADR 0009).
- Depois do item de fundação (1a), os valores moram no tema do código
  (`src/ui/tokens.css`) e este arquivo só aponta para lá.
- Suposição: sem referência visual da marca; a direção é "painel azul-noite sobre o céu
  do jogo, amarelo-moeda como destaque", tirada das cores do próprio pack.

## Cores

Contrastes calculados (WCAG 2.2). Texto ≥ 4,5:1; texto grande e bordas de controle ≥ 3:1.

| Token | Valor | Papel |
|---|---|---|
| `--color-bg` | `#141a33` | Fundo da página em volta do jogo e faixa do HUD |
| `--color-surface` | `#232c52` | Painel dos menus (sobre o jogo escurecido) |
| `--color-surface-2` | `#2e3966` | Item de lista, botão secundário, cartão dentro do painel |
| `--color-overlay` | `#141a33cc` | Véu sobre o jogo atrás do painel (pausa, fim de fase) |
| `--color-text` | `#f5f6fa` | Texto principal |
| `--color-muted` | `#b4bcd9` | Texto secundário, rótulos, ajuda |
| `--color-primary` | `#f7c948` | Botão principal, destaque, "Novo recorde!" |
| `--color-primary-hover` | `#ffd966` | Botão principal com o ponteiro em cima |
| `--color-on-primary` | `#1b1b1b` | Texto sobre `--color-primary` |
| `--color-danger` | `#c03a35` | Botão de perigo (apagar progresso) |
| `--color-danger-text` | `#ff8a80` | Texto e borda de erro sobre o painel |
| `--color-success` | `#6fdc8c` | Fase concluída, confirmação |
| `--color-border` | `#7a87b8` | Borda de campo, botão secundário e cartão |
| `--color-focus` | `#ffffff` | Anel de foco (com sombra `--color-bg` por fora) |
| `--color-sky` | `#5aa9e6` | Céu do jogo atrás do mapa (cor de fundo do canvas) |

| Par (texto / fundo) | Contraste | Mínimo |
|---|---|---|
| `text` / `bg` | 15,87 | 4,5 |
| `text` / `surface` | 12,52 | 4,5 |
| `text` / `surface-2` | 10,27 | 4,5 |
| `muted` / `surface` | 7,17 | 4,5 |
| `muted` / `surface-2` | 5,88 | 4,5 |
| `on-primary` / `primary` | 10,99 | 4,5 |
| `on-primary` / `primary-hover` | 12,61 | 4,5 |
| `primary` / `surface` (texto destaque) | 8,63 | 4,5 |
| branco / `danger` (botão) | 5,39 | 4,5 |
| `danger-text` / `surface` | 5,92 | 4,5 |
| `success` / `surface` | 7,91 | 4,5 |
| `border` / `surface` (controle) | 3,85 | 3 |
| `focus` / `surface` (anel) | 13,52 | 3 |

- Texto do HUD nunca vai direto sobre o céu (`text`/`sky` = 2,36): fica numa faixa
  `--color-bg` com 80% de opacidade ou com contorno de 1 px `--color-bg`.
- Sobre o céu, o anel de foco tem dois traços: `--color-focus` por dentro e
  `--color-bg` por fora, visível em qualquer fundo.

## Tipografia

Fonte do sistema (sem download, legível em 16 px no celular). Suposição: uma fonte pixel
com licença OFL pode entrar depois só em títulos (ADR 0008); o HUD usa os dígitos do
próprio pack Kenney.

| Token | Valor |
|---|---|
| `--font-ui` | `system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` |
| `--font-num` | `ui-monospace, "Cascadia Mono", "Consolas", monospace` (pontos e tempos, largura fixa) |

| Token | Tamanho / altura de linha | Peso | Uso |
|---|---|---|---|
| `--text-display` | 40 px / 1,1 | 800 | Nome do jogo na tela de título |
| `--text-title` | 28 px / 1,2 | 800 | Título de tela ("Pausa", "Fase 12 concluída!") |
| `--text-heading` | 20 px / 1,3 | 700 | Subtítulo, número da fase no cartão |
| `--text-body` | 16 px / 1,5 | 400 | Texto, botões (botões em 700) |
| `--text-small` | 14 px / 1,4 | 400 | Ajuda, rótulo secundário, créditos |

Texto grande para contraste = 24 px ou mais, ou 18,66 px em 700.

## Espaço e forma

| Token | Valor | Uso |
|---|---|---|
| `--space-1` | 4 px | Entre ícone e texto |
| `--space-2` | 8 px | Dentro de cartão pequeno, entre botões em linha |
| `--space-3` | 12 px | Padding vertical de botão |
| `--space-4` | 16 px | Padding de cartão, entre itens de lista |
| `--space-6` | 24 px | Padding do painel, entre grupos |
| `--space-8` | 32 px | Margem do painel até a borda da tela |
| `--radius-sm` | 4 px | Cartão de fase, campo |
| `--radius-md` | 8 px | Botão, painel |
| `--border-w` | 2 px | Bordas (pixel art pede borda grossa) |
| `--shadow-panel` | `0 4px 0 #0b0f20` | Painel e botão: sombra dura, sem desfoque (estilo pixel) |
| `--panel-max` | 560 px | Largura máxima do painel de menu |
| `--touch-size` | 64 px | Botão de toque (mínimo 48 px, ADR 0009) |
| `--game-w` / `--game-h` | 480 / 270 px | Resolução interna, escalada inteira (ADR 0009) |

Pontos de quebra: o jogo ocupa a tela toda em 16:9 com faixas `--color-bg`. Menus:
abaixo de 600 px de altura (celular em paisagem) o painel ocupa a altura toda com rolagem
e os botões ficam em duas colunas.

## Componentes base

| Componente | Quando usar | Tokens |
|---|---|---|
| **Botão primário** | A ação principal da tela (uma só): "Jogar", "Próxima fase" | `primary`, `on-primary`, `primary-hover`, `radius-md`, `shadow-panel`, `text-body` 700 |
| **Botão secundário** | Demais ações: "Recordes", "Voltar", "Jogar de novo" | `surface-2`, `text`, `border`, `radius-md` |
| **Botão de perigo** | Ação destrutiva: "Apagar progresso" | `danger`, branco, `danger-text` (borda) |
| Estados do botão | Normal; foco (anel `focus` 3 px + `bg` 2 px por fora); desabilitado (`opacity: .5`, `cursor: not-allowed`, `aria-disabled`); carregando (texto "Carregando…" e `aria-busy`); pressionado (desce 2 px e perde a sombra) | |
| **Interruptor** (switch) | Configuração liga/desliga ("Reduzir efeitos") | `surface-2`, `border`, `primary` (ligado), `focus`; `role="switch"` |
| **Grupo de opções** | Escolha única ("Botões de toque: Automático, Ligado, Desligado") | `surface-2`, `border`, `primary` |
| **Cartão de fase** | Grade da seleção de fase: número, estado (bloqueada, liberada, concluída) e estrelas não; mostra o recorde se concluída | `surface-2`, `border`, `success` (concluída), `muted` (bloqueada, com cadeado) |
| **Linha de recorde** | Tabela de recordes: fase, pontos, tempo, inimigos, moedas | `surface`, `surface-2` (linhas alternadas), `font-num` |
| **Painel** | Todo menu sobre o jogo | `surface`, `overlay` atrás, `radius-md`, `shadow-panel`, `space-6`, `panel-max` |
| **Aviso** | Informação ou erro dentro de um painel ("O progresso salvo estava corrompido…") | `surface-2`, borda esquerda `danger-text` (erro) ou `primary` (info), `text-small` |
| **Selo "Novo recorde!"** | Fim de fase quando bateu o recorde | `primary`, `on-primary`, `text-heading` |
| **HUD** | No canvas: corações, moedas, pontos, tempo, fase | Faixa `bg` a 80%, dígitos do pack, sprites de coração e moeda |
| **Botão de toque** | Esquerda, direita, pular, pausa | Círculo `bg` a 60%, borda `text` a 70%, `touch-size`; pressionado: `primary` a 60% |
| **Estado vazio** | Recordes sem nenhuma fase concluída | Ícone do pack, `text-heading`, `muted`, botão primário "Jogar" |
| **Carregando** | Antes dos assets carregarem | Barra de progresso `primary` sobre `surface-2`, texto "Carregando…" |
| **Erro de tela** | O jogo não abre (navegador sem suporte, falha ao carregar) | Painel, título, explicação, botão "Tentar de novo" |
| **Diálogo de confirmação** | Apagar progresso (duas etapas, ADR 0007) | Painel, botão de perigo e secundário "Cancelar" (foco inicial em "Cancelar") |

## Textos da interface

- **Tom:** leve e direto, de jogo, sem infantilizar. Frases curtas.
- **Tratamento:** "você" (ou implícito: "Fase concluída!").
- **Botão:** verbo no infinitivo ("Jogar", "Continuar", "Apagar progresso", "Voltar").
  Exceção consagrada: "Próxima fase".
- **Erro:** o que aconteceu e o que fazer, sem culpar o jogador nem jargão. Ex.: "Não foi
  possível carregar o jogo. Confira a conexão e tente de novo."
- **Confirmação destrutiva:** diz o que se perde e que não volta. Ex.: "Apagar todo o
  progresso? As fases liberadas e os recordes deste navegador serão perdidos. Isso não
  pode ser desfeito."
- **Números:** `Intl.NumberFormat('pt-BR')` ("12.340 pontos"); tempo como "1:05,3".
- **Nome do jogo:** provisório até a questão em aberto ser resolvida (`docs/STATUS.md`).
