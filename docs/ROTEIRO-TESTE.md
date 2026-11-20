# Roteiro de teste à mão

Antes de fechar um item que mexe em física, trechos ou controles (ADR 0010). Usado a
partir do item 1c: antes dele não há fase jogável. Anote o resultado no fim deste arquivo
ou na mensagem do commit.

## Preparação

1. `pnpm install` e `pnpm build` (o build tem de passar).
2. **Notebook:** `pnpm dev` e abra `http://localhost:5190` no Chrome.
3. **Celular na mesma rede Wi-Fi:** `pnpm dev --host` e abra no celular o endereço
   `Network:` que o Vite mostra (porta 5190). Segure o celular deitado (paisagem).
4. **Firefox e WebKit** (o E2E só roda Chromium): repita o passo 2 no Firefox e, se tiver
   acesso a um Mac ou iPhone, no Safari.
5. Contador de fps: aparece só no `pnpm dev`, no canto superior direito do jogo, com o fps
   atual e a média dos últimos 30 s (atualiza 2 vezes por segundo). No build de produção
   ele não existe.
6. Outra fase: só no `pnpm dev`, `http://localhost:5190/?fase=N` (1 a 100) abre a fase N ao
   clicar em "Jogar"; valor inválido abre a 1. No jogo publicado abre sempre a 1 até a
   seleção de fases (1i e 1j).

## O que fazer

Para cada fase **1, 10, 50 e 100**, no notebook (teclado) e no celular (toque):

- Jogue do início até a bandeira. Anote se conseguiu, quantas tentativas e qualquer trecho
  impossível ou injusto.
- Controles: andar, pular baixo (toque curto) e alto (segurado), pausar (Esc/P no teclado,
  botão no celular), voltar do jogo depois de trocar de aba.
- Perigos e coletáveis: o espinho tira 1 coração do topo, empurra e faz piscar; tocar
  outro espinho piscando não tira coração; com 0 corações (ou caindo num buraco) o
  personagem vira anjinho e sobe até sair da tela, e a fase recomeça com tudo de volta;
  a mola leva até a plataforma alta das moedas; moedas e coração somem ao serem pegos.
  Com "Reduzir efeitos" do sistema ligado: transparência fixa em vez de piscar, e o
  anjinho some parado no lugar.
- Inimigos: o andador vai e volta, virando na parede e na beira da mesa; o voador vai e
  volta no ar. Cair em cima derrota (vira de cabeça para baixo e cai para fora da tela) e
  faz quicar, nos dois; encostar de lado ou bater por baixo tira 1 coração e empurra;
  piscando, encostar não fere, mas o pisão vale; o derrotado não volta até a fase
  recomeçar. Com "Reduzir efeitos": o derrotado some parado, de cabeça para baixo.
- HUD (topo): corações, moedas, pontos com 6 dígitos, tempo subindo e "FASE 1", legível
  em 1920×1080 e no celular. Moeda soma 10, andador 100, voador 200, coração 0.
- Resumo da bandeira: anote inimigos, moedas e o tempo da partida e confira a tabela
  (quantidade × pontos, 510 da fase 1, bônus de 10 por segundo abaixo de 0:45, total).
  O foco fica em "Jogar de novo", e Enter recomeça com o HUD zerado.
- Aviso de tentativa perdida: "Ops! Você caiu." no buraco e "Ops! Acabaram os corações."
  sem corações, com "Recomeçando a fase 1…"; some quando a fase recomeça, com tudo zerado.
- Pausa: a linha mostra fase, tempo com décimos e pontos; espere alguns segundos pausado
  e confira que o tempo continua de onde parou.
- Fase 1: aparecem um de cada vez, nesta ordem, o pulo, o vão, a moeda, o espinho, a mola,
  o coração, o andador e o voador. Anote se a fase ainda parece curta.
- Imagem: pixels nítidos (sem borrão), sem faixas pretas fora do lugar, sem tremor da
  câmera com "Reduzir efeitos" ligado.
- Fases geradas (2 a 100, com `?fase=N`): os morros do fundo ficam logo acima do chão do
  início; nas junções dos trechos, grama e terra têm a borda certa (sem degrau cortado no
  meio do tile); a bandeira é alcançável só pulando. Anote a fase e a coluna de qualquer
  junção estranha (`pnpm levels:preview levels/generated/NNN.json` mostra a fase em PNG).
- **Fps:** com o contador, fique 30 s numa parte movimentada da fase e anote a média.
  Meta: 60. Mínimo aceitável: 55 de média. Abaixo disso, o item não fecha.

## Registro

| Data | Item | Aparelho e navegador | Fase | Concluiu? | Fps médio (30 s) | Observações |
|---|---|---|---|---|---|---|
| 2026-11-18 | 1c | Notebook, Edge (Chromium), monitor de 120 Hz | 1 | sim | 115 | Plataforma da linha 7 fora do pulo, como previsto (mola, 1d). Fase curta demais: alongar no 1e. |
| 2026-11-19 | 1d | Notebook, Edge (Chromium), monitor de 120 Hz | 1 | sim | 120 | Morte em todos os buracos e por 0 corações no espinho; piscando, o espinho não fere; coração da plataforma recuperou 1; moedas coletadas; pausa com Esc e P. "Reduzir efeitos" sem efeito (lido só ao abrir; agora acompanha o sistema) e personagem olhando para o lado oposto ao andar: corrigidos depois e conferidos à mão no mesmo dia. |
| 2026-11-19 | 1e | Notebook, Edge (Chromium), monitor de 120 Hz | 1 (180 tiles) | sim, cerca de 4 vezes | 118 | Pisão e morte testados em todos os inimigos (mortes forçadas de propósito). Tamanho da fase 1 melhor. |
| 2026-11-20 | 1g | Notebook (navegador não anotado) | 2, 10, 50, 70 e 100 | 2, 10 e 50 sim; 70 não | 117 na fase 100 (119 em 30 s) | Todas as fases com a mesma cara (fundo, terreno, inimigos, espinhos): variedade pedida ao roadmap. Pedido também: limite de vidas com game over e vida extra persistente. |
