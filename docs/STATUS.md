# Status do projeto

Ponto de retomada: onde o projeto está, o que vem a seguir e o que está em aberto.
Atualize ao fim de cada item do roadmap (`docs/ROADMAP.md`) ou quando uma questão for
resolvida. Questão resolvida sai daqui e vai para um ADR ou plano. O histórico está no git.

- **Última atualização:** 2026-11-18
- **Fase:** Fase 1 (MVP).
- **Próximo passo:** item **1a** do roadmap (fundação técnica): `/feature 1a fundação técnica`.

## Feito

- Esqueleto: CLAUDE.md como índice, ADRs 0001 e 0002, roadmap, modelo de plano, agentes,
  hooks de área e de `.env`, `scripts/check-docs.mjs`, skills e CI mínimo.
- 0a: projeto definido. ADRs 0003 a 0011 aceitos, roadmap da Fase 1, `docs/DESIGN.md` e
  mockup aprovados, agentes ajustados (`game` no lugar de `frontend`, sem `database` e
  `backend`), licença MIT do código e créditos da Kenney no README.

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

- Nome final do jogo ("jorge" é provisório). Precisa estar decidido antes do item 1l:
  o domínio define onde o save fica (ADR 0007, ADR 0011).
- Confirmar: sem analytics nem rastreio de qualquer tipo (suposição do ADR 0007); a
  hipótese do MVP é medida por teste com 5 pessoas (`docs/ROADMAP.md`).
- Quem recruta e acompanha o teste com 5 pessoas depois do deploy.
- Quem desenha os trechos do item 1h no Tiled: o dono ou um agente gerando o JSON.
- A pasta `kenney_pixel-platformer/` está no commit inicial; sai do git no item 1a
  (ADR 0008). É CC0, então não há problema de licença no histórico público.
- Sons: ficam para depois; quando entrarem, de qual pack CC0.
- Nota de handoff para a plataforma (orçamento de memória, nomes, DNS; ADR 0011): a
  escrever pela sessão principal antes do item 1l.
