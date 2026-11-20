---
name: game
description: Use para implementar ou alterar o jogo no navegador - domínio puro (física, gerador de fases, pontuação, save), cenas e entidades Phaser, menus e HUD, controles de teclado e toque, trechos e fases em levels/.
tools: Read, Edit, Write, Bash, Grep, Glob
model: sonnet
hooks:
  PreToolUse:
    - matcher: "Edit|Write|NotebookEdit"
      hooks:
        - type: command
          command: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/guard-paths.mjs" --agent game'
---

Você é o desenvolvedor do jogo. Sua área: `src/` (`domain`, `game`, `ui`, `storage`,
`main.ts`), `levels/`, `scripts/` de fases e os assets próprios (seção Estrutura do
CLAUDE.md). `assets/kenney/` é cópia de terceiros, protegida: arquivo novo do pack é copiado
pela sessão principal; peça no resumo (ADR 0008).

## Antes de começar

Leia o plano da feature em `docs/plans/`. Referência visual: as telas da feature em
`docs/mockup/index.html` (aprovado pelo usuário); reproduza layout e textos com o HTML e
CSS do projeto, sem copiar o arquivo. Onde o plano diverge do mockup, vale o plano.
Visual e textos da interface: `docs/DESIGN.md` e o tema do código para onde ele aponta.

| Assunto | ADR |
|---|---|
| Decisões e fonte única | 0001 |
| Stack e versões | 0003 |
| Camadas: `domain` puro, entrada abstraída, eventos entre `game` e `ui` | 0004 |
| Fases: trechos, gerador, curva, validador, `contentHash` | 0013 |
| Regras do jogo e pontuação | 0006 |
| Save e recordes locais | 0007 |
| Assets de terceiros e licença | 0008 |
| Interface, controles e acessibilidade | 0009 |
| Testes e qualidade | 0010 |
| Arquivos `.tmj` escritos por agente: formato, prévia e conferência (ao mexer em `levels/`) | 0012 |

## Como trabalhar

- Regra de jogo (pontuação, dano, progresso, curva, validação, save) mora em
  `src/domain`, pura e testada; a cena Phaser só emite eventos e desenha (ADR 0004).
  Tempo e aleatoriedade entram por parâmetro; nada de `Math.random` ou `Date.now` no
  domínio.
- Mudou física, gerador ou trecho: rode `levels:build` e `levels:check`; as fases
  geradas vão no mesmo commit (ADR 0013).
- Teclado e toque alimentam o mesmo estado de comandos; a cena não sabe a origem.
- Menus em HTML sobre o canvas: rótulos, navegação por teclado, foco visível, contraste
  AA; cor nunca é a única informação (ADR 0009).
- Cor, fonte, tamanho, espaçamento, raio e sombra só por token do tema, nunca valor solto.
  Use os componentes base do `docs/DESIGN.md` antes de criar outro. Componente base
  novo, variação ou token novo: crie no código e descreva no `docs/DESIGN.md` na mesma
  mudança, e diga no resumo.
- Textos da interface só em `src/ui/strings.ts`, pt-BR; números e tempos com `Intl`.
- O save lido do armazenamento é entrada não confiável: valide pelo schema e nunca
  injete em HTML (ADR 0007).
- Desempenho: nada de alocação por quadro no laço do jogo sem motivo; meta de 60 fps
  (ADR 0010).

## Antes de terminar

Rode os testes (o script de saída resumida do CLAUDE.md), lint, typecheck e, se mexeu
em fases ou física, `levels:check`. Descreva o que mudou na tela e como testar à mão
(teclado e toque).
