# Status do projeto

Ponto de retomada: onde o projeto está, o que vem a seguir e o que está em aberto.
Atualize ao fim de cada item do roadmap (`docs/ROADMAP.md`) ou quando uma questão for
resolvida. Questão resolvida sai daqui e vai para um ADR ou plano. O histórico está no git.

- **Última atualização:** 2026-11-18
- **Fase:** Fase 1 (MVP).
- **Próximo passo:** rodada à mão do 1c no Firefox (`docs/ROTEIRO-TESTE.md`; Edge já
  passou); depois o item **1d**: `/feature 1d`.

## Feito

- Esqueleto: CLAUDE.md como índice, ADRs 0001 e 0002, roadmap, modelo de plano, agentes,
  hooks de área e de `.env`, `scripts/check-docs.mjs`, skills e CI mínimo.
- 0a: projeto definido. ADRs 0003 a 0011 aceitos, roadmap da Fase 1, `docs/DESIGN.md` e
  mockup aprovados, agentes ajustados (`game` no lugar de `frontend`, sem `database` e
  `backend`), licença MIT do código e créditos da Kenney no README.
- 1a: fundação técnica. Vite + TypeScript + Phaser, camadas do ADR 0004 com teste de
  fronteiras, `computeScale` (escala inteira, ADR 0009), título no DOM e cena vazia,
  tokens em `src/ui/tokens.css`, assets em `assets/kenney/` com teste de hashes (pasta do
  pack fora do git), E2E com axe e CSP, CI `stack.yml`, versões no ADR 0003,
  `docs/ROTEIRO-TESTE.md`.
- 1b: formato de trecho e fase manual (ADR 0012, autoria por agente). Leitores de `.tsx`
  e `.tmj` no `domain`, `pnpm levels:build` (determinístico) e `pnpm levels:preview`,
  fase 1 escrita por agente em `levels/manual/001.tmj`, carregada sob demanda num chunk
  próprio, com fundo em parallax e câmera percorrendo a fase; imports com `.ts` (Node
  roda os scripts sem dependência nova). Desvios do plano: `TmjMap.chunk` no lugar de
  `properties`; `readLevelInfo` no `domain` valida a fase carregada; o fundo do pack é
  opaco e cobre o céu do token (que aparece só antes de a fase carregar); a faixa de
  morros está fixa para chão na linha 12 até haver fases com outra altura (1g).
- 1c: jogador e física. Constantes, controle (`movement.ts`), comandos e alcance do pulo
  (`jumpReach`: 4,48 tiles de altura, 4,99 de vão) no `domain`; jogador com 2 quadros,
  colisão, câmera, queda e recomeço, bandeira com "Fase 1 concluída!", pausa por Esc/P e
  perda de foco, contador de fps só no dev, atalho `window.__jorgeTest` só no build `e2e`
  (`pnpm build:e2e`, `dist-e2e/`), `scripts/check-dist.ts` no fim do `pnpm build`. E2E
  mede o pulo real contra o modelo (tolerância de 0,25 tile). Desvios do plano: o teto de
  queda fica em `stepMovement` (o `maxVelocity` do Arcade limita os dois sentidos e
  cortaria o pulo); `src/domain/geometry.ts` novo (bandeira e posições); a cena chama
  `resetFlags()` a cada passo (os passos extras do quadro não reiniciam `blocked.down`); o
  personagem da folha olha de frente, o espelho quase não aparece. **Pendente:** a rodada
  à mão no Firefox (Edge feito: fase 1 concluída, 115 fps de média).

## Limites aceitos

- Hooks de caminho valem para Edit/Write, não para shell (proibição no ADR 0002).
- Scripts de teste e lint rodados pelos agentes de revisão executam código do projeto.
- Os agentes leem e editam `.env`, `.env.development` e `.env.test`: o conteúdo vai
  para o contexto do modelo e para os transcripts locais. Por isso esses arquivos não
  têm chave real; ela fica em `.env.local`, que pede confirmação (inclusive comandos que
  só citam o nome). Confirmado, o valor também vai para o contexto e os transcripts.
- Código que carrega o `.env.local` (dotenv, `--env-file`) e imprime `process.env`
  expõe o valor sem passar pelo hook.
- A pasta `kenney_pixel-platformer/` continua no histórico do git (commit inicial); é
  CC0, sem problema de licença.
- Escala inteira em pixel CSS: em tela com zoom de 125% ou 150% o pixel pode ficar
  irregular; se incomodar no teste à mão, vira mudança no ADR 0009.
- Os hooks precisam do Node instalado; sem ele, as restrições não são aplicadas.
- A confirmação de ações externas e o bloqueio de chaves olham o texto do comando: um
  comando embrulhado (`bash -c`, script) escapa, e fazer isso é contornar hook (ADR 0002).

## Questões em aberto

- Confirmar: sem analytics nem rastreio de qualquer tipo (suposição do ADR 0007); a
  hipótese do MVP é medida por teste com 5 pessoas (`docs/ROADMAP.md`).
- Quem recruta e acompanha o teste com 5 pessoas depois do deploy.
- Sons: ficam para depois; quando entrarem, de qual pack CC0.
- Nota de handoff para a plataforma (orçamento de memória, nomes, DNS; ADR 0011): a
  escrever pela sessão principal antes do item 1l.
