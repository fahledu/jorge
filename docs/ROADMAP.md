# Roadmap de implementação

Ordem de construção. Um item por vez, com commit ao final de cada um; o andamento fica
em `docs/STATUS.md`. As regras estão nos ADRs citados: leia-os antes de começar o item.

Para cada item, "Pronto quando" vale além da lista geral do `CLAUDE.md` ("Antes de dizer
que terminou").

## Fase 0: definição

### 0a. Definição do projeto
- **Escopo:** descrição, escopo da primeira versão, ADRs de fundação, este roadmap,
  design system (`docs/DESIGN.md`, com interface), mockup em HTML
  (`docs/mockup/index.html`), CLAUDE.md, agentes e áreas ajustados à stack
  (`/iniciar-projeto`).
- **ADRs:** 0001, 0002.
- **Depende de:** nada.
- **Pronto quando:** nenhum marcador de preenchimento pendente em `CLAUDE.md`, `README.md`,
  `docs/` e `.claude/agents/`; ADRs de fundação, design system
  e mockup aceitos pelo usuário; `node scripts/check-docs.mjs` e os testes dos hooks passam.

<!-- PREENCHER em /iniciar-projeto: a fase MVP e as fases seguintes, neste formato:

## Fase 1: MVP

- **Hipótese:** o que o MVP quer provar e para quem.
- **MVP entregue quando:** critério de ponta a ponta, verificável, com o sistema rodando
  no ambiente de destino (ex.: "um usuário real se cadastra e emite a primeira nota em
  produção"). Vale além do "Pronto quando" de cada item.
- **Como medir:** o sinal que confirma ou derruba a hipótese (pode ser qualitativo).

### 1a. <Título>
- **Escopo:** o que entra (e o que fica para depois).
- **ADRs:** números.
- **Depende de:** itens.
- **Pronto quando:** critérios verificáveis além da lista geral.

A Fase 1 tem só o necessário para o critério "MVP entregue quando": fundação técnica,
as features do escopo da primeira versão e o deploy no ambiente de destino (último
item da fase). O resto vai para "Para depois".

O item de deploy só fica pronto com `docs/OPERACAO.md` (fazer deploy, voltar versão,
restaurar backup, trocar segredos, onde ver logs e alertas, comando por comando) e uma
restauração de backup feita de verdade, com a data registrada lá: backup nunca
restaurado não conta.

As fases seguintes têm o mesmo formato: objetivo, "Fase entregue quando" e itens.

O primeiro item de código é sempre a fundação técnica: estrutura do repositório,
ambiente de dev reproduzível, lint, typecheck, testes rodando, CI verde e o esqueleto
de cada camada, sem feature de negócio. Inclui um script de teste com saída resumida
(só falhas e o total, ex.: `test:quiet`) e o formatador da stack instalado; depois do
item, a sessão principal registra o script no CLAUDE.md e o formatador em
`formatters` de `.claude/hooks/config.json`. Com interface, os tokens do `docs/DESIGN.md`
passam para o tema do código (variáveis CSS ou tema da biblioteca de UI, com os mesmos
nomes), e o `DESIGN.md` passa a apontar para esse arquivo em vez de repetir os valores.
-->

## Para depois

Tudo o que foi cortado de uma fase ou do "Fora de escopo" de um plano e vale lembrar,
uma linha cada, com a origem, sem detalhar nem ordenar. Ex.:
`- Exportar relatório em CSV (fora de escopo do plano 2b)`. Ninguém implementa daqui
direto: ao fechar uma fase, o usuário escolhe o que vira item da próxima; o escolhido
sai desta lista, e o descartado também.

<!-- PREENCHER em /iniciar-projeto: o que ficou fora do MVP, no formato acima. -->
