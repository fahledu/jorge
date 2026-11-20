# 0015. Temas visuais por bloco de fases

- Status: Aceito
- Data: 2026-11-20

## Contexto
Jogando as fases do 1g, o usuário achou que todas têm a mesma cara: mesmo fundo, mesmo
terreno, mesmos inimigos e espinhos. O 1h previa terreno variado nos próprios trechos
(grama, terra, neve, areia), mas uma fase que junta trechos de terrenos diferentes fica
remendada, e o fundo por fase ou tier estava em "Para depois". O pack (ADR 0008) já tem o
que falta: três fundos na folha `tilemap-backgrounds_packed` (verde, laranja, azul claro),
variantes de terreno (grama, areia, neve) e de decoração na `tilemap_packed`, e variantes
de cor dos inimigos na `tilemap-characters_packed`.

## Decisão
- **Tema por bloco de tiers:** `theme(tier)` puro no `domain`: tiers 1 a 3 → `meadow`
  (campo), 4 a 6 → `desert` (deserto), 7 a 10 → `snow` (neve). O tema sai do `tier` já
  gravado na fase (ADR 0013); a fase não ganha propriedade nova.
- **Paleta base:** trechos (e a fase 1 manual) são desenhados só na paleta do campo
  (`levels/README.md`). O gerador, depois do encaixe e das bordas na junção (ADR 0013),
  troca cada tile da paleta base pelo equivalente do tema por uma tabela em
  `src/domain/tiles.ts`. A troca preserva o papel do tile: sólido continua sólido, espinho
  continua espinho, decoração continua decoração; tile sem equivalente fica como está
  (decoração sem equivalente sai). O validador roda depois da troca. A mudança sobe o
  `generatorVersion`.
- **Fundo:** a cena desenha o fundo do tema (um dos três da folha de fundos).
- **Inimigos:** cada tema tem as suas variantes de sprite para os tipos de inimigo do
  ADR 0014; o comportamento e os pontos não mudam com o tema.
- **Só assets do pack** (ADR 0008); arquivo novo copiado para `assets/kenney/` e
  registrado no `SOURCE.md`. A tabela de GIDs por tema sai no plano, pela folha numerada
  (`pnpm levels:preview --sheet`), e passa a ser a única em `tiles.ts`.

## Casos-limite
- Fase 30 → campo; 31 → deserto; 61 → neve; 100 → neve.
- Trecho com tile de areia desenhado direto → o build falha (fora da paleta base).
- Mesmo trecho nas fases 25 e 45 → mesma geometria, tiles diferentes; as duas passam no
  validador com o mesmo resultado.
- Trocar a tabela do tema deserto → só mudam as fases 31 a 60.

## Descartado
- **Um tema por tier em rodízio (muda a cada 10 fases, repete):** repete cedo; os blocos
  dão sensação de avanço.
- **Quarto tema no MVP (noite ou caverna, recolorindo um fundo):** fica para depois.
- **Terreno escolhido por trecho:** fase remendada, e cada trecho teria de existir em
  cada terreno para não limitar o sorteio.
- **Tema como propriedade gravada na fase:** redundante com o `tier`.
- **Tema sorteado por fase:** a dificuldade sobe sem a cara acompanhar; o pedido é que a
  cara mude conforme avança.
