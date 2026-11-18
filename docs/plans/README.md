# Planos de feature

Um arquivo por feature ou item do roadmap, escrito pelo `architect` antes do código:
`docs/plans/<feature>.md`. O plano cita os ADRs, nunca copia as regras; regra nova
descoberta aqui vai para um ADR (ADR 0001). O usuário aprova o plano antes da
implementação.

## Modelo

```markdown
# <Feature>

- Item do roadmap: <id>
- Status: Rascunho | Aprovado | Implementado

## Decisões pendentes
ADRs Propostos ligados à feature e ambiguidades que mudam o design, cada uma com a
suposição adotada. Se houver alguma, o usuário decide antes das tarefas.

## Objetivo
O que o usuário consegue fazer ao final, em 2 a 4 linhas.

## Critérios de aceitação
Comportamento visto pelo usuário, sem detalhe técnico, um por linha:
"Dado <situação>, quando <ação>, então <resultado>". É o que o usuário aprova e o que
o `qa` transforma em teste.

## Fora de escopo
O que parece fazer parte da feature mas não entra agora (ex.: paginação, filtros,
exportação). Nenhum agente implementa o que está aqui nem o que não está no plano. O
que vale lembrar o `architect` copia para "Para depois" do `docs/ROADMAP.md`.

## ADRs aplicáveis
Só os números.

## Modelo de dados
Tabelas, colunas, índices, restrições; o que muda nas existentes.

## Contratos
Rotas ou interfaces: entrada, saída, erros.

## Regras e casos de borda
Só o que é específico da feature.

## Interface
Telas do `docs/mockup/index.html` que a feature implementa; estados (carregando, erro,
vazio, sucesso) e textos principais. O que diverge do mockup, com o porquê. Componente
base ou token novo que a feature pede (vai no `docs/DESIGN.md`).

## Testes necessários
Casos-limite dos ADRs aplicáveis + os da feature, com valores concretos.

## Tarefas por agente
Em ordem: database, backend, frontend, qa, docs (quando houver recurso visível).
Cada tarefa pequena o bastante para uma sessão.

## Riscos e alternativas descartadas
```
