---
name: feature
description: Fluxo completo de uma feature ou item do roadmap. Plano do architect com aprovação do usuário, implementação na sessão principal pelas regras de cada área, testes, revisão e documentação.
argument-hint: <feature ou id do item do roadmap>
---

Feature pedida: $ARGUMENTS

## Etapa 1: plano

1. Leia `docs/STATUS.md` (o CLAUDE.md já está no contexto). Se o pedido for um item do
   roadmap, leia só esse item em `docs/ROADMAP.md` e confira se as dependências estão prontas.
   Se o pedido não é item da fase atual (está em "Para depois" ou não está no roadmap),
   avise e pergunte se entra na fase (volta ao `architect` para o roadmap), vai para
   "Para depois" ou segue mesmo assim.
2. Se o pedido for grande demais para um plano (várias telas e regras independentes),
   proponha a divisão e pare.
   Se for pequeno (uma área, poucos arquivos, sem decisão estrutural), diga isso e
   proponha fazer na sessão principal, sem plano e sem subagentes de implementação;
   siga assim se o usuário concordar.
3. Use o agente `architect` para criar `docs/plans/<feature>.md`.
4. **Pare** e mostre ao usuário: objetivo, critérios de aceitação, fora de escopo (e o
   que foi copiado para "Para depois" do roadmap), decisões pendentes com as suposições, tarefas por agente e o caminho do plano. Não implemente antes da aprovação.

## Etapa 2: implementação (depois que o usuário aprovar)

5. Implemente as tarefas do plano na sessão principal, nesta ordem, pulando as áreas sem
   tarefa: `devops` → `database` → `backend` → `frontend` → `qa`. Antes de cada área,
   leia `.claude/agents/<agente>.md` dela e siga as regras de lá (subagente começa do
   zero e relê tudo; aqui o contexto já está carregado). ADR continua só com o
   `architect`. Use o subagente da área só quando ela tiver muitas tarefas ou arquivos,
   passando o caminho do plano e um resumo curto do anterior (contratos, schema,
   variáveis novas), não a conversa inteira.
6. Se um subagente relatar bloqueio de hook ou mudança fora da sua área, faça na sessão
   principal pelas regras do agente responsável; nunca contorne o hook.
7. `reviewer` uma vez; `security` só se tocar autenticação, autorização, dados
   pessoais ou financeiros, uploads ou integração externa. Corrija os bloqueantes e rode
   a revisão de novo **só sobre as correções**, no máximo mais uma vez; se ainda sobrar
   bloqueante, pare e pergunte ao usuário.
8. Documentação (recurso visível, comando novo ou mudança no jeito de rodar): atualize
   na sessão principal; o agente `docs` só se a mudança for grande (vários guias).

## Etapa 3: fechamento

9. Siga `/concluir-item`: verificações, STATUS e commit.
