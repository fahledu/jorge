# Status do projeto

Ponto de retomada: onde o projeto está, o que vem a seguir e o que está em aberto.
Atualize ao fim de cada item do roadmap (`docs/ROADMAP.md`) ou quando uma questão for
resolvida. Questão resolvida sai daqui e vai para um ADR ou plano. O histórico está no git.

- **Última atualização:** 2026-11-18
- **Fase:** esqueleto criado; projeto ainda não definido.
- **Próximo passo:** item **0a** do roadmap: `/iniciar-projeto <descrição do projeto>`.

## Feito

- Esqueleto: CLAUDE.md como índice, ADRs 0001 e 0002, roadmap, modelo de plano, agentes,
  hooks de área e de `.env`, `scripts/check-docs.mjs`, skills e CI mínimo.

## Limites aceitos

- Hooks de caminho valem para Edit/Write, não para shell (proibição no ADR 0002).
- Scripts de teste e lint rodados pelos agentes de revisão executam código do projeto.
- Os agentes leem e editam `.env`, `.env.development` e `.env.test`: o conteúdo vai
  para o contexto do modelo e para os transcripts locais. Por isso esses arquivos não
  têm chave real; ela fica em `.env.local`, que pede confirmação (inclusive comandos que
  só citam o nome). Confirmado, o valor também vai para o contexto e os transcripts.
- Código que carrega o `.env.local` (dotenv, `--env-file`) e imprime `process.env`
  expõe o valor sem passar pelo hook.
- Os hooks precisam do Node instalado; sem ele, as restrições não são aplicadas.
- A confirmação de ações externas e o bloqueio de chaves olham o texto do comando: um
  comando embrulhado (`bash -c`, script) escapa, e fazer isso é contornar hook (ADR 0002).

## Questões em aberto

- (nenhuma ainda)
