---
name: iniciar-projeto
description: Define o projeto a partir do esqueleto (fase 0 do roadmap) com a descrição do usuário. ADRs de fundação, roadmap, design system (com interface), mockup em HTML, CLAUDE.md, áreas dos agentes e ajuste dos agentes à stack.
argument-hint: <descrição do projeto, ou caminho de um arquivo com ela>
disable-model-invocation: true
---

Vamos definir o projeto (item 0a do `docs/ROADMAP.md`). Descrição do usuário:

$ARGUMENTS

Se o texto acima for um caminho de arquivo, leia o arquivo. Se estiver vazio, peça a
descrição e pare.

## Etapa 1: entender

1. Leia `docs/adr/README.md` e `docs/STATUS.md` (o CLAUDE.md já está no contexto; o
   GUIA.md é para o usuário, não precisa ler).
2. Confira se a descrição responde: objetivo e usuários; escopo da primeira versão (MVP)
   e o que fica fora; o que o MVP quer provar e como saber se deu certo; plataforma (web, mobile, API, CLI, desktop); stack preferida ou
   restrições; dados pessoais ou sensíveis e requisitos legais; onde vai rodar;
   integrações externas; idioma e localidade; com interface, referências visuais (marca
   ou logo, cores, sites ou apps de referência, clima, tema claro ou escuro). Pergunte ao
   usuário o que faltar e mudar a arquitetura ou o visual (poucas perguntas, com opções e
   uma recomendação). O resto vira suposição explícita.
   Web com interface: se a descrição não disser, pergunte sempre se deve ser um PWA
   (instalável na tela inicial, funciona offline ou com rede ruim, notificações), com
   uma recomendação conforme o uso; não vira suposição, porque muda a arquitetura.

## Etapa 2: propor (architect)

3. Use o agente `architect` para: corte do MVP (o que entra e o que fica para depois),
   ADRs de fundação como **Proposto** (um assunto por ADR, só os que se aplicam), roadmap
   com a Fase 1 (MVP) indo da fundação técnica ao deploy, e a lista do que a sessão
   principal precisa ajustar. Passe a descrição, as respostas e as suposições.
4. **Pare** e mostre ao usuário: o corte do MVP (entra / fica para depois, com o
   motivo), hipótese e "MVP entregue quando", ADRs propostos (título e decisão em uma
   linha cada), suposições e roadmap. Peça aprovação ou ajustes. Ajustes voltam ao
   `architect`.

## Etapa 3: design system e mockup (depois da aprovação, antes de qualquer código)

5. Com interface, na sessão principal, sem subagente, crie `docs/DESIGN.md` a partir das
   referências visuais e do ADR de interface. Sem referências, proponha uma direção
   sóbria e diga que é suposição. Curto, uma tabela por seção:
   - **Cores:** tokens com papel (`--color-bg`, `--color-surface`, `--color-text`,
     `--color-muted`, `--color-primary`, `--color-danger`, `--color-success`,
     `--color-border`, `--color-focus`), valor no tema claro e no escuro (se o ADR pedir
     os dois), e o contraste de cada par de texto e fundo, AA no mínimo (4,5:1 para
     texto, 3:1 para texto grande e bordas de controle).
   - **Tipografia:** família (fonte do sistema ou uma web font com licença livre), escala
     de tamanhos com o uso de cada um, pesos e altura de linha.
   - **Espaço e forma:** escala de espaçamento (ex.: 4, 8, 12, 16, 24, 32), raios,
     sombras, larguras máximas e pontos de quebra.
   - **Componentes base:** botão (primário, secundário, perigo; normal, foco,
     desabilitado, carregando), campo com rótulo, ajuda e erro, card, aviso, estado vazio,
     carregando e erro de tela, e o que mais o escopo pedir. Para cada um: quando usar e
     os tokens que usa.
   - **Textos da interface:** tom de voz, tratamento (você, tu), como escrever erro,
     confirmação e botão (verbo no infinitivo, ex.: "Salvar").
   - No topo: o que é token (nomes iguais no mockup e no código) e que, depois do item de
     fundação, os valores moram no tema do código e este arquivo só aponta para ele.
   Sem interface (API, CLI): não crie; o mockup segue neutro.
6. Na sessão principal, sem subagente, crie `docs/mockup/index.html` com o que foi
   definido para a primeira versão, para o usuário ver o produto antes de codar:
   - Um arquivo só, autocontido (CSS e JS embutidos, sem CDN, sem build): abre com dois
     cliques, offline.
   - Com interface: as telas do escopo da primeira versão, navegáveis por um menu ou
     links, com dados fictícios realistas na localidade do projeto, os textos principais
     e os estados (carregando, erro, vazio, sucesso) das telas centrais. Sem interface
     (API, CLI): uma página com os fluxos principais como exemplos (sessões de terminal
     ou requisição e resposta, com os erros).
   - No topo: "Mockup, não é código de produção", a data e o que ficou fora (a lista
     "Para depois" do roadmap).
   - Estático: nada de lógica de negócio, chamada de rede ou biblioteca da stack.
   - Visual só pelo `docs/DESIGN.md`: os tokens viram variáveis CSS com os mesmos nomes,
     e as telas usam só os componentes base de lá. Inclua uma tela "Design system" com
     a paleta, a tipografia e os componentes em todos os estados (e o tema escuro, se
     houver), para o usuário aprovar o visual de uma vez.
7. **Pare** e peça ao usuário para abrir o arquivo e aprovar ou pedir ajustes. Ajuste
   visual: corrija o `docs/DESIGN.md` e o mockup juntos, por edição pontual (não
   reescreva o arquivo inteiro). Ajuste que muda escopo ou regra
   (tela nova, campo que vira dado, fluxo diferente): volte ao `architect` para ADRs e
   roadmap, e depois ao mockup.

## Etapa 4: aplicar (depois da aprovação do mockup)

8. Peça ao `architect` para marcar os ADRs aprovados como **Aceito** (arquivo e índice).
9. Na sessão principal (única que altera `.claude/`), com base nos ADRs:
   - `CLAUDE.md`: nome, descrição, stack, estrutura, comandos, uma linha por regra com o
     ADR, convenções; remova a nota de status do topo, mantendo a linha que manda ler o
     `docs/STATUS.md`.
   - `README.md`: nome, descrição, pré-requisitos, como rodar (o que já se sabe).
   - `.claude/hooks/config.json`: caminhos do schema e das migrations em `owners` (dono
     `database`), outras áreas exclusivas se os ADRs pedirem, e `readonlyCommands` com os
     scripts de teste, lint, typecheck e auditoria da stack. `formatters` fica vazio
     até o item de fundação instalar o formatador.
   - `.claude/settings.json`: em `permissions.deny`, acrescente `Read(...)` para o que
     a stack gera e ninguém precisa ler e ainda não está na lista (pasta de build com
     outro nome, código gerado, lockfile de outro gerenciador). Pasta da raiz se escreve
     `Read(/pasta/**)`: `./pasta/**` e `**/pasta/**` casam em qualquer nível, inclusive
     dentro de `node_modules`, e bloqueiam a doc dos pacotes (ex.: `next/dist/docs/`).
   - Agentes: preencha a tabela de ADRs de cada um, cite a stack e a estrutura reais;
     remova os agentes que não se aplicam (ex.: sem frontend) e crie os que faltam, com o
     mesmo formato (`tools:` explícito e hook `guard-paths.mjs --agent <nome>`), sempre
     atualizando `agents` em `config.json` junto.
   - Sem interface: remova do CLAUDE.md a linha do `docs/DESIGN.md` (tabela de fonte
     única e estrutura).
   - Não crie código de aplicação: isso é o item de fundação, pelo `/feature`.
10. Verifique: `node scripts/check-docs.mjs` e `node --test --test-reporter=dot .claude/hooks/hooks.test.mjs`
    passam; `rg -n "<!-- PREENCHER" CLAUDE.md README.md docs .claude/agents` não encontra
    nada.
11. Atualize o `docs/STATUS.md` (fase = Fase 1: MVP, próximo passo = primeiro item de
    código do roadmap, questões em aberto) e faça o commit `docs: define project foundations`, mostrando ao
    usuário a mensagem e os arquivos antes.
12. Termine com um resumo curto e o prompt sugerido para o próximo item:
    `/feature <item de fundação do roadmap>`.
