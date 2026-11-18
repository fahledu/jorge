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
  fecha e reabre o navegador e encontra o mesmo progresso; as 100 fases passam no
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
- **Escopo:** leitura de `.tmj` no `domain` (camadas, spawns, propriedades), build de
  fases que normaliza `levels/manual/001.tmj` para `levels/generated/001.json` com
  tileset embutido; carregamento sob demanda da fase no jogo; fase 1 (tutorial) feita
  no Tiled e desenhada com fundo, terreno e câmera seguindo um ponto. Sem jogador.
- **ADRs:** 0004, 0005, 0008.
- **Depende de:** 1a.
- **Pronto quando:** a fase 1 aparece na tela com a escala certa em 1920×1080 e em
  844×390; o build de fases é determinístico (dois builds, mesmo arquivo).

### 1c. Jogador e física
- **Escopo:** constantes de `physics.ts`, jogador com animação de 2 frames, andar,
  pulo com altura variável, colisão com o terreno, câmera, morte por queda e recomeço,
  bandeira que conclui a fase; entrada por teclado pela abstração de comandos; pausa
  (Esc/P) e pausa por perda de foco.
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
  ar); derrota pisando, dano no resto; inimigo derrotado não volta na tentativa.
- **ADRs:** 0006.
- **Depende de:** 1d.
- **Pronto quando:** pisar derrota e qualquer outro contato fere, nos dois tipos, na fase 1.

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
  6 trechos provisórios (dificuldades 1, 3, 5, 7, 9, 10) para exercitar o gerador; as 100
  fases geradas.
- **ADRs:** 0005.
- **Depende de:** 1f.
- **Pronto quando:** os casos-limite do ADR 0005 passam; as 100 fases existem, passam no
  validador e abrem no jogo; `levels:check` falha com um arquivo gerado editado à mão.

### 1h. Biblioteca de trechos e ajuste da curva
- **Escopo:** pelo menos 30 trechos no Tiled, 3 ou mais por dificuldade de 1 a 10, com
  terreno variado (grama, terra, neve, areia) e spawns; ajuste dos números da curva
  pelo teste à mão (mudança de número vai para o ADR 0005).
- **ADRs:** 0005, 0008.
- **Depende de:** 1g.
- **Pronto quando:** fases 1, 10, 50 e 100 jogadas à mão até a bandeira pelo roteiro;
  as 100 fases regeneradas passam no `levels:check`.

### 1i. Save, progresso e recordes
- **Escopo:** `storage` com o formato, schema, migração, mescla e tratamento de save
  ilegível, de versão nova e de armazenamento indisponível; fase liberada e recordes por
  fase (pontos, tempo, inimigos, moedas, `contentHash` da fase, conclusões); apagar progresso; "Novo recorde!" no fim da fase.
- **ADRs:** 0004, 0006, 0007.
- **Depende de:** 1f.
- **Pronto quando:** os casos-limite do ADR 0007 passam (unidade, com fixture da
  versão 1); recarregar a página mantém o progresso.

### 1j. Menus, seleção de fase e recordes
- **Escopo:** título ("Jogar"), seleção de fase (liberadas e o recorde de cada uma),
  tela de recordes (total, fases concluídas, por fase pontos e tempo), pausa (continuar,
  recomeçar, sair), configurações (reduzir efeitos, controles de toque, apagar
  progresso com confirmação), créditos com o aviso de onde o progresso fica,
  fim de jogo, aviso de versão nova; textos pt-BR do mockup.
- **ADRs:** 0006, 0007, 0009.
- **Depende de:** 1i.
- **Pronto quando:** todas as telas navegáveis só por teclado; axe sem violações em
  cada uma; a fumaça do ADR 0010 passa completa.

### 1k. Controles de toque e celular
- **Escopo:** botões de toque (vários toques ao mesmo tempo), detecção e configuração,
  aviso de girar o aparelho, tela cheia, ajuste de escala abaixo de 2×; E2E no perfil de
  dispositivo celular do Playwright; desempenho medido.
- **ADRs:** 0009, 0010.
- **Depende de:** 1j.
- **Pronto quando:** os casos-limite de controle do ADR 0009 vistos num celular real;
  fase 50 com média de 55 fps ou mais nele.

### 1l. Deploy em produção
- **Escopo:** Dockerfile, `Caddyfile` com headers e cache, compose, `jorge.caddy`, workflow de deploy, monitoramento, nota de handoff para a plataforma
  (orçamento de memória, nomes, DNS), `docs/OPERACAO.md` (deploy, voltar versão,
  onde ver logs e alertas, e o registro de que não há backup porque não há dado no
  servidor, ADR 0011).
- **ADRs:** 0011.
- **Depende de:** 1k; nota de handoff aceita na plataforma.
- **Pronto quando:** deploy de um SHA feito pelo workflow e voltado para o SHA anterior
  pelo procedimento do `docs/OPERACAO.md`; headers e CSP conferidos no domínio; o
  critério "MVP entregue quando" cumprido.

## Fase 2 (proposta): ranking global e save na nuvem

Não é prioridade e não tem data: o usuário escolhe se e quando ela entra, ao fechar a
Fase 1. Nada desta fase é regra (sem ADR Aceito) e a Fase 1 continua 100% estática,
sem backend. Do lado do MVP, o preparo é só o que custa pouco: recordes por fase com
pontos, tempo, inimigos, moedas e o `contentHash` da fase (ADR 0005, ADR 0007), e o
domínio determinístico (ADR 0004).

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
- Mais inimigos: blocos com rosto, saltadores, atiradores (fora do MVP)
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
