# 0009. Interface, controles e acessibilidade

- Status: Aceito
- Data: 2026-11-18

## Contexto
O jogo é público: qualquer pessoa que abrir o site, num notebook (teclado) ou num
celular em paisagem (toque), sem conta nem instrução prévia. O canvas do jogo não é acessível a leitor de tela, mas os menus podem ser.
Pixel art borrado ou com pixels de tamanhos diferentes fica feio.

## Decisão

### Divisão entre DOM e canvas
- **Menus e telas** (título com "Jogar", seleção de fase, recordes, pausa,
  configurações com "Apagar progresso", fase concluída, fim de jogo, créditos, avisos;
  sem tela de perfis, ADR 0007) são **HTML no DOM** sobre o canvas,
  em `src/ui` (ADR 0004), sem framework (ADR 0003).
- **HUD** (corações, pontos, moedas, tempo) é desenhado no canvas.
- **Botões de toque** são elementos do DOM (eventos de ponteiro, vários toques ao mesmo
  tempo) e alimentam a mesma abstração de comandos do teclado (ADR 0004).

### Visual
- Um tema só, do jogo (não segue claro/escuro do sistema). Cores, fontes e
  espaçamentos são tokens do `docs/DESIGN.md`; o código usa só os tokens.
- **Resolução interna** 480×270 (16:9; 15 tiles de altura). Escala inteira quando a tela
  comporta 2× ou mais; abaixo disso, ajuste à tela com vizinho mais próximo. Sempre
  `pixelArt` (sem suavização) e câmera em pixel inteiro.
- **Fontes:** os menus usam a fonte do sistema (sem download), conforme o
  `docs/DESIGN.md`, legível em 16 px CSS no celular. O HUD usa os dígitos do pack Kenney
  (ADR 0008). Uma fonte pixel com licença OFL só nos títulos fica para depois; se
  entrar, segue o ADR 0008.

### Controles
- **Teclado:** setas ou A/D andam; Espaço, W ou seta para cima pulam (segurar pula mais
  alto); Esc ou P pausam; nos menus, Tab/setas, Enter e Esc.
- **Toque:** botões esquerda, direita (canto esquerdo) e pular (canto direito), pausa no
  topo. Aparecem em `touchControls: 'auto'` quando o aparelho tem `pointer: coarse` ou
  ao primeiro toque; a configuração força ligado ou desligado (ADR 0007). Alvo mínimo de
  48×48 px CSS.
- **Paisagem:** em retrato no celular, o jogo pausa e mostra "Gire o aparelho".
- **Tela cheia:** botão no título e na pausa, onde o navegador permitir.
- **Perda de foco** (troca de aba, app em segundo plano) → pausa automática.

### Acessibilidade (o que se aplica)
- Menus: WCAG 2.2 AA (contraste, foco visível, navegação só por teclado, rótulos,
  `lang="pt-BR"`); E2E com axe sem violações nas telas de menu (ADR 0010).
- HUD e textos no canvas com contraste AA contra o fundo (contorno ou faixa atrás).
- **Reduzir efeitos** (`reduceEffects`, ADR 0007): sem tremor de câmera, sem flash nem
  piscar rápido (invulnerabilidade vira transparência fixa). Liga sozinho na primeira
  execução se `prefers-reduced-motion: reduce`.
- Nenhum efeito pisca mais de 3 vezes por segundo, com ou sem a opção.
- O canvas tem `aria-label` com o nome da fase; WCAG completo não se aplica ao jogo em
  si.

### Idioma
- Interface em pt-BR, números com `Intl.NumberFormat('pt-BR')` (ex.: "12.340 pontos").
  Textos num arquivo só (ADR 0004); sem outro idioma no MVP.

## Casos-limite
- Janela 1920×1080 → escala 4 (1920×1080). 1366×768 → escala 2 (960×540) centralizada.
- Celular 844×390 em paisagem → menos de 2× → ajuste à tela (≈1,44×) sem suavização.
- Segurar esquerda e tocar em pular ao mesmo tempo → os dois comandos valem.
- Dedo arrastado de "esquerda" para "direita" sem soltar → troca o comando.
- Teclado e toque ao mesmo tempo → comandos somados; nenhum fica preso ao soltar.
- Aba escondida no meio da fase → pausa; o relógio do bônus (ADR 0014) não conta.
- Celular girado para retrato no meio do pulo → pausa e aviso; volta em pausa.

## Descartado
- **Menus desenhados no canvas:** sem foco, leitor de tela nem axe; mais código.
- **Tema claro e escuro:** o visual é o da arte do jogo.
- **Joystick virtual analógico:** botões digitais bastam para um jogo de plataforma.
