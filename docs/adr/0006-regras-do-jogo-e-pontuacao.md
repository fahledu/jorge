# 0006. Regras do jogo e pontuação

- Status: Aceito
- Data: 2026-11-18

## Contexto
Os recordes pessoais são por pontos ganhos derrotando inimigos e passando de fase. O
jogo é aberto a qualquer pessoa, inclusive quem joga de vez em quando: perder muito
progresso afasta. Pontuação total que cresce sem limite ao repetir a fase 1 perde o
sentido como recorde. As regras são usadas pelo jogo, pelo HUD e pelo save e recordes
(ADR 0007), por isso moram aqui e no `src/domain` (ADR 0004).

## Decisão

### Jogador
- **Corações:** cada tentativa começa com 3, máximo 3. Coração coletado soma 1 até o
  máximo. Dano tira 1 e dá 1,5 s de invulnerabilidade.
- **Morte:** 0 corações ou queda num buraco (abaixo do mapa) → a tentativa acaba e a
  fase recomeça do início com 3 corações. Sem vidas e sem fim de jogo: tentativas
  ilimitadas.
- **Derrotar inimigo:** cair sobre ele (velocidade vertical para baixo e pés acima do
  meio do inimigo) → inimigo derrotado, jogador quica. Qualquer outro contato → dano.
  Inimigo derrotado não volta na mesma tentativa.
- **Espinhos:** dano de 1 coração e empurrão para trás. **Mola:** pulo alto.
- **Conclusão:** tocar a bandeira conclui a fase.
- **Sair ou pausar e abandonar** a fase = tentativa perdida, sem pontos.

### Pontuação de uma tentativa (só vale se a fase for concluída)

| Evento | Pontos |
|---|---|
| Andador derrotado | 100 |
| Voador derrotado | 200 |
| Moeda | 10 |
| Fase concluída | 500 + 10 × número da fase (510 na fase 1, 1500 na fase 100) |
| Bônus de tempo | 10 × max(0, `targetTimeSeconds` − segundos inteiros usados) |

- `targetTimeSeconds` = `ceil(largura da fase em tiles / 4)`, gravado na fase pelo
  gerador (ADR 0005). O relógio pausa com o jogo pausado.
- Morreu → os pontos da tentativa somem.
- **Recorde da fase:** de cada fase, guarda-se a maior pontuação e o menor tempo de
  tentativas concluídas (ADR 0007).
- **Pontuação total** = soma das melhores pontuações de cada fase. Repetir a
  fase só sobe o total se superar o próprio recorde dela; o total tem teto, porque
  inimigos e moedas de cada fase são finitos.
- A pontuação é calculada por funções puras (`src/domain/score.ts`) a partir da lista
  de eventos da tentativa; a cena só emite eventos.

### Progresso
- Concluir a fase `n` libera a `n + 1` (até 100). Qualquer fase liberada pode ser
  jogada de novo. Concluir a 100 mostra a tela de fim de jogo.

## Casos-limite
- Fase 1 concluída em 30 s, `targetTimeSeconds` 25, 2 andadores, 5 moedas →
  200 + 50 + 510 + 0 = 760.
- Mesma fase em 20,9 s → bônus 10 × (25 − 20) = 50 → 810; novo melhor da fase; o total
  sobe 50.
- Jogar de novo e fazer 700 → melhor da fase continua 810; total não muda.
- Derrotar 3 inimigos e cair no buraco → 0 pontos; melhor da fase inalterado.
- Coração coletado com 3 corações → continua 3, sem pontos.
- Dois danos em 1 s (espinho e andador) → só o primeiro tira coração.
- Pisar no inimigo subindo (no meio do pulo) → dano, não derrota.
- Ordem num passo da tentativa: os inimigos andam no começo do passo; depois queda →
  coleta (moedas e corações) → pisão → bandeira → dano (espinho e inimigo não pisado) →
  mola.
  - Pegar o coração e encostar no espinho no mesmo passo, com 1 coração → sobrevive com 1.
  - Tocar a bandeira e o espinho no mesmo passo → fase concluída, sem dano.
  - Pisar um inimigo e tocar a bandeira no mesmo passo → inimigo derrotado e contado,
    fase concluída.
  - Impulso do passo: levou dano → empurrão, sem quique; senão, pisou → quique; senão,
    mola. A mola não lança no passo de dano nem no de pisão.
- Espinho ou inimigo durante a invulnerabilidade → não fere nem empurra; o jogador
  atravessa. Acabou a invulnerabilidade ainda em contato → fere de novo. Ninguém fica
  preso entre espinhos.
- Cair sobre um inimigo durante a invulnerabilidade → derrota e quica normalmente.
- Dano de inimigo → o mesmo empurrão do espinho, para longe do centro do inimigo; com
  espinhos e inimigos tocados no mesmo passo, para longe da média dos centros. O inimigo
  não muda de direção ao ferir.
- Pisar um inimigo e encostar de lado em outro no mesmo passo → o pisado é derrotado, o
  outro fere; empurrão no lugar do quique.
- Concluir a fase 100 → 1500 + eventos; nada é liberado; tela de fim.

## Descartado
- **Vidas e fim de jogo que volta fases:** afasta quem joga de vez em quando e não
  serve aos recordes.
- **Total = soma de todas as tentativas:** repetir a fase 1 infinitamente inflaria o
  total sem esforço novo.
- **Pontos de tentativa incompleta:** incentiva morrer de propósito depois de coletar.
- **Checkpoint no meio da fase:** fases do MVP são curtas (no máximo 11 trechos); fica
  para depois.
