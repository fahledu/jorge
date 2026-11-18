# Jorge (nome provisório)

Jogo de plataforma 2D para o navegador: 100 fases que ficam mais difíceis aos poucos,
pontos por inimigos derrotados, moedas e fases concluídas, e progresso e recordes
pessoais salvos no próprio navegador. Funciona no computador (teclado) e no celular em
paisagem (toque). Sem cadastro, sem login, sem cookies e sem rastreio.

> Status: em definição. As decisões estão em `docs/adr/` e o código começa no item 1a
> do `docs/ROADMAP.md`. Veja como o jogo vai ficar em `docs/mockup/index.html`.

## Pré-requisitos

- Git
- Node 24 (LTS) e pnpm 10 (versões exatas no ADR 0003)
- Docker, só para testar a imagem de produção

## Como rodar

Os scripts nascem no item 1a do roadmap. Depois dele:

```bash
pnpm install          # dependências
pnpm dev              # jogo em modo de desenvolvimento
pnpm test             # testes
pnpm levels:build     # gera as 100 fases a partir dos trechos em levels/chunks/
pnpm levels:check     # confere que todas as fases podem ser concluídas
pnpm build            # build de produção
```

## Créditos e licenças

- **Código:** licença MIT, veja `LICENSE`.
- **Arte:** [Pixel Platformer](https://kenney.nl/assets/pixel-platformer), de Kenney
  ([kenney.nl](https://www.kenney.nl)), licença
  [Creative Commons Zero (CC0)](http://creativecommons.org/publicdomain/zero/1.0/).
  Os arquivos da arte não estão sob a licença MIT.

## Documentação

- `CLAUDE.md`: contexto e índice das regras (lido pelo Claude Code em toda sessão)
- `GUIA.md`: como trabalhar com os agentes
- `docs/adr/`: decisões de arquitetura
- `docs/ROADMAP.md` e `docs/STATUS.md`: plano e andamento
- `docs/DESIGN.md` e `docs/mockup/index.html`: design system e mockup
