# 0001. Registro de decisões e fonte única

- Status: Aceito
- Data: 2026-11-18

## Contexto
Com vários agentes lendo e escrevendo, uma regra copiada em dois lugares diverge. Regra
só no prompt de um agente não vale para os outros; regra só na conversa se perde.

## Decisão
- Decisão estrutural e duradoura vira ADR em `docs/adr/`, com o modelo e as regras de
  mudança de `docs/adr/README.md`. Um assunto por ADR; cada regra mora num ADR só.
- ADR **Proposto** não é regra: só vale depois de **Aceito** pelo usuário.
- CLAUDE.md tem uma linha de resumo por regra, com o número do ADR; agentes, planos e
  guias citam o número, nunca copiam o detalhe.
- Plano de feature (`docs/plans/`) cita os ADRs e só define o que é da feature; regra
  nova descoberta no plano vai para um ADR.
- `docs/STATUS.md` é o ponto de retomada; `docs/ROADMAP.md`, a ordem de construção.
  Questão resolvida sai do STATUS e vai para um ADR ou plano.
- `node scripts/check-docs.mjs` confere índice, status, links e citações; roda por hook
  ao fim de cada sessão e subagente, e no CI.

## Descartado
- **Regras só no CLAUDE.md:** cresce sem limite e é lido inteiro em toda sessão.
- **Wiki fora do repositório:** os agentes não leem e não versiona junto com o código.
