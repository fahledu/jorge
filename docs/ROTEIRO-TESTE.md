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

## O que fazer

Para cada fase **1, 10, 50 e 100**, no notebook (teclado) e no celular (toque):

- Jogue do início até a bandeira. Anote se conseguiu, quantas tentativas e qualquer trecho
  impossível ou injusto.
- Controles: andar, pular baixo (toque curto) e alto (segurado), pausar (Esc/P no teclado,
  botão no celular), voltar do jogo depois de trocar de aba.
- Perigos e coletáveis: o espinho tira 1 coração do topo, empurra e faz piscar; tocar
  outro espinho piscando não tira coração; com 0 corações (ou caindo num buraco) o
  personagem vira anjinho e sobe até sair da tela, e a fase recomeça com tudo de volta;
  a mola leva até o coração da plataforma alta; moedas e coração somem ao serem pegos.
  Com "Reduzir efeitos" do sistema ligado: transparência fixa em vez de piscar, e o
  anjinho some parado no lugar.
- Imagem: pixels nítidos (sem borrão), sem faixas pretas fora do lugar, sem tremor da
  câmera com "Reduzir efeitos" ligado.
- **Fps:** com o contador, fique 30 s numa parte movimentada da fase e anote a média.
  Meta: 60. Mínimo aceitável: 55 de média. Abaixo disso, o item não fecha.

## Registro

| Data | Item | Aparelho e navegador | Fase | Concluiu? | Fps médio (30 s) | Observações |
|---|---|---|---|---|---|---|
| 2026-11-18 | 1c | Notebook, Edge (Chromium), monitor de 120 Hz | 1 | sim | 115 | Plataforma da linha 7 fora do pulo, como previsto (mola, 1d). Fase curta demais: alongar no 1e. |
| 2026-11-19 | 1d | Notebook, Edge (Chromium), monitor de 120 Hz | 1 | sim | 120 | Morte em todos os buracos e por 0 corações no espinho; piscando, o espinho não fere; coração da plataforma recuperou 1; moedas coletadas; pausa com Esc e P. "Reduzir efeitos" sem efeito (lido só ao abrir; agora acompanha o sistema) e personagem olhando para o lado oposto ao andar: corrigidos depois. |
