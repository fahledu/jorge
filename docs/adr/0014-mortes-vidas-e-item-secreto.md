# 0014. Modos livre e desafio, vidas e item secreto (substitui o 0006)

- Status: Aceito
- Data: 2026-11-20

## Contexto
Depois de jogar as fases do 1g, o usuário quer que morrer custe alguma coisa ("deixar
mais competitivo"), um item escondido em lugar difícil e um placar para comparar
partidas. O ADR 0006 dava tentativas ilimitadas sem custo, o que é bom para quem joga
de vez em quando e não serve para competir: com tentativas ilimitadas o recorde mede
insistência, não habilidade. A saída é ter dois modos: o **livre** fica como o 0006, e o
**desafio** é uma partida com vidas, do começo ao fim, com um top 10 local. Pedido também
(ADR 0015, temas): inimigos novos do pack, cujas regras de contato e pontos moram aqui.

Pontuação total que cresce sem limite ao repetir a fase 1 perde o sentido como recorde.
As regras são usadas pelo jogo, pelo HUD e pelo save e recordes (ADR 0007), por isso
moram aqui e no `src/domain` (ADR 0004). Como já há código, o 0006 não é editado: este
ADR o substitui por inteiro. O que não está marcado como *novo* repete o 0006.

## Decisão

### Jogador (comum aos dois modos)
- **Corações:** cada tentativa começa com 3, máximo 3. Coração coletado soma 1 até o
  máximo. Dano tira 1 e dá 1,5 s de invulnerabilidade.
- **Morte:** 0 corações ou queda num buraco (abaixo do mapa) → a tentativa acaba e a
  fase recomeça do início com 3 corações. No livre, tentativas ilimitadas; no desafio, a
  morte gasta uma vida (*novo*, abaixo).
- **Derrotar inimigo:** cair sobre ele (velocidade vertical para baixo e pés acima do
  meio do inimigo) → inimigo derrotado, jogador quica. Qualquer outro contato → dano.
  Inimigo derrotado não volta na mesma tentativa. O espinhoso é exceção (abaixo).
- **Espinhos:** dano de 1 coração e empurrão para trás. **Mola:** pulo alto.
- **Conclusão:** tocar a bandeira conclui a fase.
- **Sair ou pausar e abandonar** a fase = tentativa perdida, sem pontos (no desafio,
  conta como morte, abaixo).

### Inimigos novos (*novo*; só sprites da folha de personagens do pack, ADR 0008)
- **Espinhoso:** anda como o andador (vai e volta, vira na borda e na parede), mas não
  pode ser pisado: qualquer contato fere, inclusive cair sobre ele (empurrão sem quique).
  Não é derrotado, não dá pontos. Liberado desde o tier 4.
- **Voador vertical:** o voador com o trilho no eixo y (sobe e desce entre dois limites).
  Mesmas regras e pontos do voador (200). Liberado desde o tier 5.
- Os dois entram na densidade de inimigos do ADR 0013 como os demais; o validador
  continua ignorando inimigos. Tipos de spawn: `spiky` e `flyer-v` (ADR 0012).
- Outros inimigos do pack ficam para depois.

### Pontuação de uma tentativa (só vale se a fase for concluída)

| Evento | Pontos |
|---|---|
| Andador derrotado | 100 |
| Voador (horizontal ou vertical) derrotado | 200 |
| Moeda | 10 |
| Fase concluída | 500 + 10 × número da fase (510 na fase 1, 1500 na fase 100) |
| Bônus de tempo | 10 × max(0, `targetTimeSeconds` − segundos inteiros usados) |

- `targetTimeSeconds` = `ceil(largura da fase em tiles / 4)`, gravado na fase pelo
  gerador (ADR 0013). O relógio pausa com o jogo pausado.
- Morreu → os pontos da tentativa somem.
- A pontuação é calculada por funções puras (`src/domain/score.ts`) a partir da lista
  de eventos da tentativa; a cena só emite eventos.

### Item secreto (*novo*)
- Tipo de spawn `secret` (sprite: a gema do `tilemap_packed`; ADR 0012). No máximo 1
  ativo por fase: com mais de um elegível, o gerador mantém um, sorteado pelo PRNG depois
  da escolha dos inimigos (último sorteio da ordem do ADR 0013; `generatorVersion` sobe).
- Fica em lugar difícil do trecho: na rota alta, quando o trecho tem uma (ADR 0013), ou
  atrás de espinhos, depois de um vão. O validador **não** precisa alcançá-lo (a bandeira
  continua sendo o único alvo).
- O efeito é só do desafio (vida extra, abaixo). **No modo livre o item não aparece.**
- Passagem secreta de verdade (bloco falso, parede atravessável) fica para depois.

### Modo livre
- **Progresso:** concluir a fase `n` libera a `n + 1` (até 100); fases liberadas não se
  perdem. Qualquer fase liberada pode ser jogada de novo. Concluir a 100 mostra a tela de
  fim de jogo.
- Tentativas ilimitadas, sem custo.
- **Recorde da fase:** de cada fase, guarda-se a maior pontuação e o menor tempo de
  tentativas concluídas (ADR 0007).
- **Pontuação total** = soma das melhores pontuações de cada fase. Repetir a fase só sobe
  o total se superar o próprio recorde dela; o total tem teto, porque inimigos e moedas
  de cada fase são finitos.

### Modo desafio (*novo*)
- **Partida:** começa sempre na fase 1, com **5 vidas** e 0 pontos, e segue fase após fase
  (concluir a `n` leva à `n + 1`, sem escolher fase). Uma partida em andamento por save.
- **Pontos da partida:** soma dos pontos de cada fase concluída nela (tabela acima, com o
  bônus de tempo). A tentativa que morre não soma nada.
- **Morte:** gasta 1 vida e recomeça a fase atual. Com 0 vidas → **fim de jogo**: a partida
  acaba e o placar é o total dela.
- **Vida extra:** pegar o item secreto vale +1 vida na hora, até o teto de **9 vidas**.
  Pego, o item daquela fase não volta mais na partida: nem ao recomeçar a fase por morte,
  nem depois. Com as vidas no teto o item não é pego e continua na fase.
- **Vidas passam de uma fase para a outra.** Concluir a fase não dá vida.
- **Zerar:** concluir a fase 100 também encerra a partida, com o placar total.
- **Desistir** (pelo menu) encerra a partida como o fim de jogo.
- **Tentativa interrompida:** a tentativa começada e não terminada (sair da fase pelo
  menu ou fechar a aba) conta como morte. Pausar, inclusive por perda de foco (ADR 0009),
  não custa nada.
- **Partida guardada:** a partida fica no save e continua depois de fechar a aba
  ("Continuar partida"), na fase atual, do início.
- **Ligação com o livre:** concluir uma fase no desafio também a conclui no livre (libera
  a seguinte e grava o recorde da fase, ADR 0007). O desafio não exige nenhuma fase
  liberada: está sempre aberto.
- **HUD do desafio:** mostra as vidas além do que o livre já mostra (visual no
  `docs/DESIGN.md`).

### Fim da partida e top 10 local (*novo*)
- Partida encerrada (fim de jogo, zerar ou desistir) com placar que entra no top 10 →
  janela pede o apelido e grava. Placar 0 ou abaixo do 10º não entra e não abre janela.
  "Não gravar" descarta o placar.
- A partida encerrada fica pendente no save até gravar ou descartar: fechar a aba com a
  janela aberta mostra a janela de novo ao voltar.
- O campo vem preenchido com o apelido do placar mais recente.
- **Ordem do top 10:** maior placar; empate → mais fases concluídas; empate → a partida
  mais antiga (menor `runId`) fica na frente (o placar novo não tira o antigo). Sem data
  gravada.
- O top 10 fica só no navegador, como o resto do save (ADR 0007); nada sai do aparelho.
- **Apelido** (exceção a "sem dado pessoal" do ADR 0007): depois de normalizar (NFC),
  tirar espaços das pontas e juntar espaços seguidos, de 1 a 12 caracteres, só letras de
  `A` a `Z` com ou sem acento (`A-Za-zÀ-ÖØ-öø-ÿ`), dígitos, espaço, `-` e `_`. Outro
  caractere é recusado com mensagem, não removido em silêncio. Mostrado sempre como texto
  (nunca como HTML). Motivo: distinguir quem fez cada placar entre pessoas que dividem o
  navegador; o limite e os caracteres evitam controle, invisíveis e emoji (lista igual em
  qualquer aparelho, sem imitar outro nome) e facilitam a moderação se um ranking global
  vier. Pode ser um nome real: fica só no aparelho, sai com "Apagar progresso", e o aviso
  dos créditos diz onde fica.

### Pontuação conferível (nota para o futuro, sem implementação)
Um ranking no servidor (Fase 2 proposta do `docs/ROADMAP.md`) só é justo se o servidor
puder conferir a partida, por exemplo rejogando os comandos com a física determinística
do `domain` sobre fases de `contentHash` conhecido. Nada disso é feito no MVP, e o top 10
local não é conferido (ADR 0007). O que não pode fechar essa porta, desde já:
- Tudo o que decide pontos, vidas, dano, pisão, coleta, morte e bandeira fica no `domain`,
  avançado em passo fixo (`STEP_MS`) a partir dos comandos do passo (ADR 0004). A cena não
  decide resultado por callback da engine (overlap do Arcade, timer, tween).
- A colisão do jogador com o terreno é hoje a única regra que depende do Arcade; não
  acrescentar outra. Levá-la ao `domain` é trabalho do ranking, não do MVP.
- Sem aleatoriedade em tempo de jogo; se vier, por PRNG com semente injetada e gravável.
- Física do `domain` só com `+ − × ÷`, `Math.sqrt`, `Math.floor`/`ceil`/`round`/`abs`/
  `min`/`max` (exatos em qualquer motor JS); `Math.sin`, `exp`, `pow` e afins podem
  diferir entre navegadores.
- Os comandos continuam discretos por passo (a abstração de comandos do ADR 0009), para
  caber numa gravação compacta.
- Cada fase guarda o `contentHash` (ADR 0013); uma partida pode atravessar um deploy, e o
  ranking terá de decidir o que fazer com isso.

## Casos-limite

Tentativa (os dois modos):
- Fase 1 concluída em 30 s, `targetTimeSeconds` 25, 2 andadores, 5 moedas →
  200 + 50 + 510 + 0 = 760.
- Mesma fase em 20,9 s → bônus 10 × (25 − 20) = 50 → 810; novo melhor da fase; o total
  sobe 50.
- Jogar de novo e fazer 700 → melhor da fase continua 810; total não muda.
- Derrotar 3 inimigos e cair no buraco → 0 pontos; melhor da fase inalterado.
- Coração coletado com 3 corações → continua 3, sem pontos.
- Dois danos em 1 s (espinho e andador) → só o primeiro tira coração.
- Pisar no inimigo subindo (no meio do pulo) → dano, não derrota.
- Cair sobre um espinhoso → dano e empurrão, sem quique; o espinhoso continua.
- Voador vertical pisado → derrotado, 200 pontos.
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

Livre:
- Concluir a fase 100 → 1500 + eventos; nada é liberado; tela de fim.
- Morre 10 vezes e conclui → pontos da tentativa que concluiu; o item secreto não aparece.

Desafio:
- Partida nova → fase 1, 5 vidas, 0 pontos.
- Conclui a fase 1 com 760 → partida 760, fase 2, 5 vidas; a fase 2 também fica liberada
  no livre e o recorde da fase 1 é gravado.
- Na fase 2 derrota 3 inimigos e cai no buraco → 4 vidas, fase 2 do início, partida 760.
- Na fase 3 pega o item (4 → 5) e cai → 4 vidas; a fase 3 recomeça sem o item; conclui →
  o item continua ausente até o fim da partida.
- Com 9 vidas, encosta no item → continua 9 e o item fica.
- Com 1 vida, morre → fim de jogo; placar = total da partida.
- Conclui a fase 100 → partida encerrada como "zerou", placar com os pontos da 100.
- Fecha a aba no meio da fase 4 com 3 vidas → ao voltar, "Continuar partida": 2 vidas,
  fase 4 do início. Com 1 vida → ao voltar, fim de jogo e janela do apelido.
- Fecha a aba na tela de fase concluída da 4 → ao voltar, fase 5 com as mesmas vidas.
- Abas A e B na mesma partida (`seq` 6); B morre e grava (`seq` 7); A conclui a fase →
  não grava, aviso "Esta partida continua em outra aba".
- Top 10 cheio, 10º com 3.000 e 12 fases; partida com 3.000 e 12 fases → não entra, sem
  janela; com 3.000 e 13 fases → entra, o anterior sai; com 3.010 → entra.
- Morre 5 vezes na fase 1 → placar 0, sem janela.
- Apelido `"  Ana   Lu "` → `"Ana Lu"`; vazio → recusado; 13 caracteres → recusado;
  `"<b>"` ou com emoji → recusado com mensagem.
- Fecha a aba com a janela do apelido aberta → a janela volta com o mesmo placar.
- Duas abas gravam o placar da mesma partida → aparece uma vez (mesmo `runId`).

## Descartado
- **Modo único com vidas e fim de jogo:** voltar fases liberadas afasta quem joga de vez
  em quando; vidas com seleção de fase não têm o que tirar no fim de jogo, e a vida que não
  volta briga com o recorde pelo melhor da fase. Separar os modos resolve os dois.
- **Penalidade por morte em tentativas ilimitadas:** tentativas ilimitadas medem
  insistência, não habilidade; descontar pontos não muda isso, só pune quem tenta mais, e
  ainda exigia contador de mortes no save por fase.
- **Total = soma de todas as tentativas:** repetir a fase 1 infinitamente inflaria o
  total sem esforço novo.
- **Pontos de tentativa incompleta:** incentiva morrer de propósito depois de coletar.
- **Checkpoint no meio da fase:** fases do MVP são curtas (no máximo 11 trechos); fica
  para depois.
- **Vida extra ou bônus do item no livre:** vida não tem uso lá, e bônus de pontos mudaria
  os recordes por fase que o desafio também grava.
- **Partida que acaba ao fechar a aba:** perde partidas longas por acidente. **Fechar a aba
  sem custo:** daria tentativa grátis fechando a aba antes de morrer.
- **Desafio que exige fases liberadas no livre:** o desafio começa sempre na 1; exigir
  nada acrescenta.
- **Vida extra que volta ao recomeçar a fase:** quem pega o item antes de morrer não
  perderia vida nunca naquela fase (tentativas ilimitadas de novo).
- **Apelido livre (qualquer Unicode, sem limite):** controle e invisíveis quebram a lista
  e permitem imitar outro nome.
- **Data do placar para desempate:** o `runId` já ordena as partidas, sem gravar data.
