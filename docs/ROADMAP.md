# Roadmap de implementação

Ordem de construção. Um item por vez, com commit ao final de cada um; o andamento fica
em `docs/STATUS.md`. As regras estão nos ADRs citados: leia-os antes de começar o item.

Para cada item, "Pronto quando" vale além da lista geral do `CLAUDE.md` ("Antes de dizer
que terminou").

## Fase 0: definição

### 0a. Definição do projeto (concluído)
- **Escopo:** descrição, escopo da primeira versão, ADRs de fundação, este roadmap,
  design system (`docs/DESIGN.md`, com interface), mockup em HTML
  (`docs/mockup/index.html`), CLAUDE.md, agentes e áreas ajustados à stack
  (`/iniciar-projeto`).
- **ADRs:** 0001, 0002.
- **Depende de:** nada.
- **Pronto quando:** nenhum marcador de preenchimento pendente em `CLAUDE.md`, `README.md`,
  `docs/` e `.claude/agents/`; ADRs de fundação, design system
  e mockup aceitos pelo usuário; `node scripts/check-docs.mjs` e os testes dos hooks passam.

## Fase 1: MVP

- **Hipótese:** quem abre o site entende o jogo sem instrução, joga várias fases na
  primeira visita e volta outro dia para avançar e bater os próprios recordes; e trechos
  feitos à mão, combinados por um gerador, rendem 100 fases que parecem variadas e ficam
  mais difíceis sem desenhar cada uma. (Suposição: a descrição não trouxe hipótese.)
- **MVP entregue quando:** no domínio de produção (ADR 0011), num notebook com teclado e
  num celular em paisagem com toque, um jogador sem conta nem cadastro abre o site,
  conclui a fase 1, vê a fase 2 liberada e o recorde da fase 1 na tela de recordes,
  fecha e reabre o navegador e encontra o mesmo progresso; joga uma partida do desafio
  até o fim e vê o apelido no top 10; as 100 fases passam no
  `levels:check` do CI e o E2E conclui cada uma pelo atalho de teste; o dono jogou à mão
  as fases 1, 10, 50 e 100 até a bandeira, com média de 55 fps ou mais nos dois
  aparelhos.
- **Como medir:** sem telemetria (o jogo não tem analytics nem rastreio, ADR 0007), o
  sinal é qualitativo: um teste com 5 pessoas que não conhecem o jogo, cada uma no
  próprio aparelho, sem explicação. Observar se passam da fase 1 sem ajuda e quantas
  fases jogam na primeira sessão; uma semana depois, pedir que mostrem a tela de recordes
  e perguntar se voltaram por conta própria e se as fases pareceram repetidas.
  Confirma: 4 de 5 passam da fase 1 sozinhas, a maioria joga 5 ou mais fases e ao menos
  2 voltaram. Derruba: a maioria trava na fase 1 ou não volta, ou "é tudo igual".

### 1a. Fundação técnica
- **Escopo:** Vite + TypeScript + Phaser num pacote só, com as pastas do ADR 0004 e o
  esqueleto de cada camada (cena vazia com a câmera e a escala do ADR 0009, tela de
  título no DOM, `storage` vazio, `domain` com um teste); Biome com a regra de
  importações do `domain`; Vitest com cobertura e `test:quiet`; Playwright com axe e uma
  fumaça que abre o título; CI do ADR 0010; `pnpm-workspace.yaml` com a defesa de
  cadeia (ADR 0003); versões exatas conferidas e anotadas no ADR 0003; cópia dos assets
  para `assets/kenney/` com `SOURCE.md`, teste de hashes e a pasta do pack no
  `.gitignore` (ADR 0008); tokens do `docs/DESIGN.md` num arquivo de variáveis CSS;
  `docs/ROTEIRO-TESTE.md` (ADR 0010). Sem regra de jogo.
- **ADRs:** 0003, 0004, 0008, 0009, 0010.
- **Depende de:** 0a.
- **Pronto quando:** `pnpm dev` abre o título num navegador; lint, typecheck,
  `test:quiet`, build e E2E passam; CI verde; teste de importações falha ao importar
  `phaser` no `domain` (conferido e desfeito).

### 1b. Formato de trecho e fase manual
- **Escopo:** leitura e validação de `.tmj` no `domain` (camadas, spawns,
  propriedades), `pnpm levels:build` só com as fases manuais, normalizando
  `levels/manual/001.tmj` para `levels/generated/001.json` com tileset embutido; prévia
  em PNG (`pnpm levels:preview`) para o agente ver o que desenhou; carregamento sob
  demanda da fase no jogo; fase 1 (tutorial) escrita por um agente no formato do Tiled
  e desenhada com fundo, terreno e câmera seguindo um ponto. Sem jogador.
- **ADRs:** 0004, 0005, 0008, 0012.
- **Depende de:** 1a.
- **Pronto quando:** a fase 1 aparece na tela com a escala certa em 1920×1080 e em
  844×390; o build de fases é determinístico (dois builds, mesmo arquivo).

### 1c. Jogador e física
- **Escopo:** constantes de `physics.ts`, jogador com animação de 2 frames, andar,
  pulo com altura variável, colisão com o terreno, câmera, morte por queda e recomeço,
  bandeira que conclui a fase; entrada por teclado pela abstração de comandos; pausa
  (Esc/P) e pausa por perda de foco; contador de fps de debug só no modo de
  desenvolvimento (ADR 0010).
- **ADRs:** 0004, 0006, 0009.
- **Depende de:** 1b.
- **Pronto quando:** a fase 1 é jogável do início à bandeira pelo teclado; o alcance
  real do pulo (medido) é de pelo menos 4 tiles de altura e de vão.

### 1d. Perigos e coletáveis
- **Escopo:** corações (3, dano, invulnerabilidade, coleta), espinhos com empurrão,
  molas, moedas; morte por 0 corações.
- **ADRs:** 0006, 0008, 0009.
- **Depende de:** 1c.
- **Pronto quando:** os casos-limite de dano do ADR 0006 passam (unidade) e são vistos à
  mão na fase 1.

### 1e. Inimigos
- **Escopo:** andador (vai e volta, vira na borda e na parede) e voador (vai e volta no
  ar); derrota pisando, dano no resto; inimigo derrotado não volta na tentativa. Fase 1
  (tutorial) alongada, apresentando um elemento por vez (pulo, vão, espinho, mola, moeda,
  coração, andador, voador): no teste à mão do 1c, os 100 tiles atuais pareceram curtos
  demais.
- **ADRs:** 0006, 0012.
- **Depende de:** 1d.
- **Pronto quando:** pisar derrota e qualquer outro contato fere, nos dois tipos, na fase 1;
  a fase 1 nova é concluída à mão do início à bandeira.

### 1f. Pontuação, HUD e fim de fase
- **Escopo:** eventos da tentativa e cálculo puro de pontos e bônus de tempo; HUD no
  canvas (corações, pontos, moedas, tempo); tela de fase concluída com o resumo; tela de
  morte e recomeço.
- **ADRs:** 0006, 0009.
- **Depende de:** 1e.
- **Pronto quando:** os exemplos de pontuação do ADR 0006 passam como teste; o resumo da
  fase 1 bate com o que foi feito na partida.

### 1g. Gerador de fases e validador
- **Escopo:** PRNG, curva, sorteio e encaixe de trechos, ativação de spawns por
  densidade e tier, validador de alcançabilidade, `levels:build` e `levels:check` no CI;
  10 trechos provisórios para exercitar o gerador (8 do meio com dificuldades 1, 1, 3, 4,
  6, 7, 9 e 10, mais um de início e um de chegada); as 100 fases geradas.
- **ADRs:** 0013.
- **Depende de:** 1f.
- **Pronto quando:** os casos-limite do ADR 0013 passam; as 100 fases existem, passam no
  validador e abrem no jogo; `levels:check` falha com um arquivo gerado editado à mão.

### 1g2. Temas e inimigos novos
- **Escopo:** pedido depois do teste à mão do 1g ("todas as fases têm a mesma cara").
  Sistema de temas a cada 10 fases com a tabela dos 10 (ADR 0015): troca de terreno e
  decoração da paleta base pelo gerador, fundo com faixa, cor de céu e tom por tema,
  variante de cor dos inimigos por tema; completos os 5 temas que saem só do pack base
  (campo, floresta, deserto, caverna, neve); os 5 de expansão (fazenda, fábrica,
  templo, doces, castelo) usam provisoriamente um tema do pack base (fazenda → campo,
  fábrica → caverna, templo → deserto, doces → neve, castelo → caverna; plano 1g2);
  inimigos novos espinhoso e voador vertical, e o tipo de spawn do item secreto (só o
  spawn, o sorteio de um por fase e o sprite; o efeito, só no desafio, é do 1i2); as 100
  fases regeneradas com os 10 trechos provisórios. Nenhum arquivo novo em
  `assets/kenney/`.
- **ADRs:** 0015, 0014 (inimigos e spawn do item secreto), 0013, 0012, 0008.
- **Depende de:** 1g; ADRs 0014 e 0015 aceitos.
- **Pronto quando:** os casos-limite do ADR 0015 que não dependem das expansões passam;
  `?fase=1`, `11`, `31`, `41` e `71` mostram campo, floresta, deserto, caverna e neve,
  cada um com o seu céu, e com jogador, inimigos e espinhos legíveis; `?fase=21` mostra o
  provisório do campo; espinhoso fere ao ser pisado e voador vertical é derrotado
  pisando, numa fase gerada.

### 1g3. Temas das expansões
- **Escopo:** temas fazenda, fábrica, templo, doces e castelo com terreno e decoração
  das expansões CC0 da Kenney (ADR 0015), no lugar dos provisórios do 1g2: tabela de
  tiles de cada um pela folha numerada da expansão, céu e tom de cada um; fase gerada com
  mais de um tileset embutido (adição ao ADR 0012, no plano); cópia dos arquivos usados
  das expansões para `assets/kenney/<pasta do pack>/` **pelo usuário** (pasta protegida
  por hook), com `License.txt` e SHA-256 no `SOURCE.md` (ADR 0008); as fases 21–30,
  51–70 e 81–100 regeneradas.
- **ADRs:** 0015, 0008, 0012, 0013.
- **Depende de:** 1g2; adição ao ADR 0012 aceita.
- **Pronto quando:** os casos-limite restantes do ADR 0015 passam; `?fase=21`, `51`,
  `61`, `81` e `91` mostram fazenda, fábrica, templo, doces e castelo, legíveis; as
  fases 1–20, 31–50 e 71–80 não mudam; o teste de hashes cobre os arquivos novos.

### 1h. Biblioteca de trechos e ajuste da curva
- **Escopo:** pelo menos 30 trechos escritos por um agente no formato do Tiled, 3 ou
  mais por dificuldade de 1 a 10, na paleta base (o terreno de cada fase vem do tema,
  ADR 0015), com spawns de todos os inimigos e um item secreto em lugar difícil em boa
  parte deles; caminhos alternativos: tag `alt` e pelo menos 1 trecho em cada 3, por
  dificuldade, com rota alta mais difícil e com mais moedas, onde fica o item secreto
  (adição do ADR 0013); conferência no build de nenhum inimigo no arco de um salto
  obrigatório, pendente da rodada à mão do 1g (adição do ADR 0012); os 10 trechos
  provisórios saem ou são refeitos; ajuste dos números da curva pelo teste à mão (mudança
  de número vai para o ADR 0013).
- **ADRs:** 0013, 0014, 0015, 0008, 0012.
- **Depende de:** 1g2; adições dos ADRs 0012 e 0013 aceitas.
- **Pronto quando:** fases 1, 10, 50 e 100 jogadas à mão até a bandeira pelo roteiro,
  tentando a rota alta onde houver; as 100 fases regeneradas passam no `levels:check`;
  os casos-limite das duas adições passam (unidade).

### 1i. Save, progresso e recordes
- **Escopo:** `storage` com o formato, schema, migração, mescla e tratamento de save
  ilegível, de versão nova e de armazenamento indisponível; fase liberada e recordes por
  fase (pontos, tempo, inimigos, moedas, `contentHash` da fase, conclusões); apagar progresso; "Novo recorde!" no fim da fase. Só o modo livre; a partida do desafio,
  o top 10 e `storySeen` entram no formato no 1i2 e no 1j2, ainda na versão 1 (nada
  publicado antes do 1l, ADR 0014).
- **ADRs:** 0004, 0006, 0007.
- **Depende de:** 1f.
- **Pronto quando:** os casos-limite do ADR 0007 passam (unidade, com fixture da
  versão 1); recarregar a página mantém o progresso.

### 1i2. Modo desafio: partida, vidas e top 10
- **Escopo:** pedido depois do teste à mão do 1g. Regras puras da partida no `domain`
  (começo, morte, vida extra que não volta, conclusão, fim de jogo, zerar, desistir,
  tentativa interrompida); item secreto só no desafio; vidas no HUD; partida no save com
  `id` e `seq` contra outra aba; top 10 com a ordem e a validação do apelido, mescla
  entre abas; conclusão no desafio grava também no livre. Entrada provisória
  `?modo=desafio` só no `pnpm dev` (os menus são do 1j).
- **ADRs:** 0014, 0007, 0004.
- **Depende de:** 1i, 1g2; ADR 0014 aceito (com as mudanças no 0007).
- **Pronto quando:** os casos-limite do ADR 0014 passam (unidade); no `pnpm dev`, pegar
  a vida extra, morrer, fechar a aba no meio de uma fase e voltar mostra as vidas certas
  e o item ausente.

### 1j. Menus, seleção de fase e recordes
- **Escopo:** título com a escolha do modo ("Livre", "Desafio" com "Continuar
  partida" ou "Nova partida"), seleção de fase do livre (liberadas e o recorde de cada
  uma), tela de recordes (total, fases concluídas, por fase pontos e tempo) e top 10 do
  desafio, pausa (continuar, recomeçar, sair; no desafio, aviso de que sair custa uma vida,
  e "Desistir da partida"), fim da partida com a janela do apelido, configurações
  (reduzir efeitos, controles de toque, apagar progresso com confirmação, que apaga
  também o top 10), créditos com o aviso de onde o progresso e o apelido ficam, fim de
  jogo do livre, aviso de versão nova, "Carregando" e "Erro de tela"; textos pt-BR do
  mockup. Antes de codar, a sessão principal atualiza mockup e `docs/DESIGN.md` com as
  telas novas (modo, vidas no HUD, fim da partida, top 10) e o usuário aprova.
- **ADRs:** 0014, 0007, 0009.
- **Depende de:** 1i2.
- **Pronto quando:** todas as telas navegáveis só por teclado; axe sem violações em
  cada uma; a fumaça do ADR 0010 passa completa; uma partida do desafio vai do título ao
  apelido no top 10 só pelo teclado.

### 1j2. Historinha da fase 1
- **Escopo:** janela em HTML (diálogo modal sobre o canvas) que conta a história do jogo
  e do Jorge e explica como ganhar e perder pontos e, no desafio, vidas. Aparece antes
  da fase 1 na primeira vez (em qualquer modo), marcada no save (`storySeen`) só ao
  fechar ou pular; botão "Pular"; reaberta pelo menu ("Como jogar"). Acessível pelo
  ADR 0009: foco no primeiro botão, Esc fecha, sem tempo para ler, sem animação com
  reduzir efeitos. Texto: rascunho do architect no plano do item, a partir das regras
  dos ADR 0014; o usuário aprova antes de ir para `strings.ts`.
- **ADRs:** 0009, 0014, 0007.
- **Depende de:** 1j.
- **Pronto quando:** na primeira visita a historinha abre antes da fase 1, "Pular" e Esc
  fecham e ela não volta ao recarregar; abre de novo pelo menu; axe sem violações; lida
  pelo Narrador do começo ao fim.

### 1k. Controles de toque e celular
- **Escopo:** botões de toque (vários toques ao mesmo tempo), detecção e configuração,
  aviso de girar o aparelho, tela cheia, ajuste de escala abaixo de 2×; E2E no perfil de
  dispositivo celular do Playwright; desempenho medido.
- **ADRs:** 0009, 0010.
- **Depende de:** 1j2.
- **Pronto quando:** os casos-limite de controle do ADR 0009 vistos num celular real;
  fase 50 com média de 55 fps ou mais nele.

### 1l. Deploy em produção
- **Escopo:** Dockerfile, `Caddyfile` com headers e cache, compose, `jorge.caddy`, workflow de deploy, monitoramento, nota de handoff para a plataforma
  (orçamento de memória, nomes, DNS), `docs/OPERACAO.md` (deploy, voltar versão,
  onde ver logs e alertas, e o registro de que não há backup porque não há dado no
  servidor, ADR 0011).
- **ADRs:** 0011.
- **Depende de:** 1k, 1g3; nota de handoff aceita na plataforma.
- **Pronto quando:** deploy de um SHA feito pelo workflow e voltado para o SHA anterior
  pelo procedimento do `docs/OPERACAO.md`; headers e CSP conferidos no domínio; o
  critério "MVP entregue quando" cumprido.

## Fase 2 (proposta): ranking global e save na nuvem

Não é prioridade e não tem data: o usuário escolhe se e quando ela entra, ao fechar a
Fase 1. Nada desta fase é regra (sem ADR Aceito) e a Fase 1 continua 100% estática,
sem backend. Do lado do MVP, o preparo é só o que custa pouco: recordes por fase com
pontos, tempo, inimigos, moedas e o `contentHash` da fase (ADR 0013, ADR 0007), e o
domínio determinístico (ADR 0004), com o que a nota "pontuação conferível" do ADR 0014
diz para não fechar.

- **Objetivo:** quem quiser compara a própria pontuação com a de outros jogadores e
  leva o progresso de um aparelho para outro.
- **Itens (alto nível, a detalhar em planos):** serviço de backend com banco; envio de
  resultado de fase; ranking global (total e por fase); save na nuvem com a mescla do
  ADR 0007; identidade do jogador; moderação; deploy do backend na VM.
- **O que a fase terá de decidir (cada um vira ADR antes do código):**
  - **Identidade:** anônimo com apelido e token no navegador, ou login pela conta
    fahledu (introspecção e sessão central da plataforma, `fahledu/0015` e
    `fahledu/0016`); o que acontece com o save local ao entrar.
  - **Moderação de apelido** num jogo público: lista de bloqueio, revisão, denúncia,
    apelido padrão gerado.
  - **Antifraude de pontuação:** o servidor revalida (replay das entradas sobre a fase
    de `seed` e `contentHash` conhecidos exige física determinística, o que a engine não
    garante entre aparelhos) ou só aplica limites plausíveis por fase (pontos máximos,
    tempo mínimo, inimigos e moedas existentes), mais limite de envio.
  - **LGPD e dados pessoais:** o apelido (e o e-mail, se houver login) passa a ser dado
    pessoal; base legal, retenção, exclusão a pedido, aviso de privacidade.
  - **Backend e banco:** stack (alinhar com a plataforma), banco próprio ou não,
    `mem_limit` dentro do orçamento da VM (`fahledu/0019`), backup com restauração
    testada, janela de job.
  - **Recordes feitos em versão antiga da fase** (`contentHash` diferente): entram ou
    não no ranking global.

## Para depois

Tudo o que foi cortado de uma fase ou do "Fora de escopo" de um plano e vale lembrar,
uma linha cada, com a origem, sem detalhar nem ordenar. Ex.:
`- Exportar relatório em CSV (fora de escopo do plano 2b)`. Ninguém implementa daqui
direto: ao fechar uma fase, o usuário escolhe o que vira item da próxima; o escolhido
sai desta lista, e o descartado também.

- Fases especiais e chefes a cada 10 fases, feitas à mão (fora do MVP)
- Mais inimigos: bola de espinhos, saltador, andador grande de 2 pisões (desenhos sem uso na folha de personagens), atiradores (fora do MVP)
- Chaves e portas, blocos "?" com itens e poderes (fora do MVP)
- Água nadável, escadas e plataformas móveis (fora do MVP)
- Checkpoint no meio da fase (fora do MVP)
- Sons e música, com pack CC0 (fora do MVP)
- Controle (gamepad) (fora do MVP)
- PWA: instalar na tela inicial e jogar offline (fora do MVP)
- Vários jogadores com saves separados no mesmo navegador (fora do MVP)
- Exportar e importar o save, para não perder progresso ao limpar o navegador (fora do MVP)
- Remapear teclas (fora do MVP)
- Conquistas e estatísticas (fora do MVP)
- Fonte pixel com licença OFL nos títulos dos menus (fora do MVP, ADR 0009)
- Outros idiomas (fora do MVP)
- Plataformas atravessáveis por baixo (fora de escopo do plano 1c)
- Voador com trajetória em onda (fora de escopo do plano 1e; o vertical entrou no 1g2)
- Passagem secreta (bloco falso, parede atravessável) levando ao item secreto (fora do MVP, ADR 0014)
- Quique mais alto ao pisar no inimigo segurando o pulo (fora de escopo do plano 1e)
- Pontos flutuando no lugar do inimigo derrotado ou da moeda (fora de escopo do plano 1f)
- Tempo-alvo do bônus visível durante a fase (fora de escopo do plano 1f)
- Morros do fundo acompanhando a altura do chão ao longo da fase (fora de escopo do plano 1g)
- Fases além das 100, geradas sem fim (fora de escopo do plano 1g)
- Apresentar o espinhoso e o voador vertical ao jogador antes do primeiro encontro (fora de escopo do plano 1g2)
- Ranking global top 100 do desafio no servidor, com pódio dos 3 melhores: exige
  pontuação conferível (nota do ADR 0014), moderação de apelido e LGPD, `connect-src` na
  CSP (ADR 0011) e integração com a plataforma fahledu; detalhe na Fase 2 (fora do MVP)
