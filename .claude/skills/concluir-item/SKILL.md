---
name: concluir-item
description: Checklist de fechamento de uma tarefa ou item do roadmap. Verificações, documentação, STATUS e commit em Conventional Commits.
argument-hint: <item ou descrição do que foi feito (opcional)>
---

Fechando: $ARGUMENTS

1. Rode e mostre o resultado de tudo o que o CI roda (`.github/workflows/`, inclusive o
   e2e, que no GitHub pode rodar só no deploy): lint, typecheck e testes (comandos no
   CLAUDE.md), `node scripts/check-docs.mjs` e
   `node --test --test-reporter=dot .claude/hooks/hooks.test.mjs`. Falhou: abra só o
   detalhe do que falhou, corrija e rode de novo. Não diga que terminou com algo
   falhando.
2. Confira a lista "Antes de dizer que terminou" do CLAUDE.md e o "Pronto quando" do item
   no `docs/ROADMAP.md`, item por item. Diga explicitamente o que não foi verificado.
3. Procure esquecidos no diff: logs de depuração, `TODO` sem dono, segredo, arquivo
   temporário, teste desabilitado ou com `.only`.
4. Se não houve revisão desde a última mudança de código, rode o `reviewer` (se o
   `/feature` já revisou, não repita).
5. Atualize o `docs/STATUS.md` na sessão principal, sem subagente: o que foi feito,
   próximo passo, questões resolvidas saem, questões novas entram.
6. Se o item fechou a fase (era o último dela), confira com o usuário o critério
   "entregue quando" da fase e, na Fase 1, a hipótese do MVP. Depois mostre a lista
   "Para depois" do roadmap e pergunte o que vira a próxima fase, o que continua para
   depois e o que é descartado; passe as escolhas ao `architect` para montar a fase.
7. `git add` dos arquivos do item e `node scripts/check-secrets.mjs` (a varredura do CI,
   no histórico e no stage). Achou: segredo real sai do código; senha de teste fora de
   arquivo de teste vai para um. Nunca altere `.gitleaks.toml` para passar. Saiu
   "NÃO VERIFICADO": diga isso ao usuário.
8. Mostre ao usuário a mensagem de commit (Conventional Commits, em inglês, corpo curto
   com o porquê) e os arquivos incluídos; faça o commit. Não faça push sem pedido. Cada
   push é uma execução do CI, com quantos commits tiver: se o usuário pedir push a cada
   item, lembre que juntar itens num push só economiza minutos do GitHub Actions.
9. Se o item era a fundação técnica e a skill `claude-code-setup:claude-automation-recommender`
   (plugin `claude-code-setup`) estiver disponível, rode-a e mostre as recomendações
   (plugins, MCP servers, skills, hooks), com o custo de cada uma: tudo o que fica ativo
   ocupa contexto em toda sessão. Instale ou configure só o que o usuário aprovar, um a
   um, na sessão principal, sem duplicar o que o esqueleto já faz (hooks, agentes,
   skills), e faça um commit separado. Sem a skill, pule este passo.
10. Sugira ao usuário `/clear` e `/retomar` antes do próximo item.
