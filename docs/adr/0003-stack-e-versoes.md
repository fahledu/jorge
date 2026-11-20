# 0003. Stack e versões

- Status: Aceito
- Data: 2026-11-18

## Contexto
Jogo de plataforma 2D em pixel art para navegador, sem backend (ADR 0007), servido como
arquivos estáticos (ADR 0011). Precisa de física simples de plataforma, mapas do Tiled,
toque e teclado, e 60 fps em notebook comum e celular médio. O dono mantém outros
projetos em TypeScript com pnpm, Vite, Vitest, Playwright e Biome (plataforma
`fahledu/0003`); repetir as ferramentas poupa revisão. As versões exatas são conferidas
no item de fundação (1a do roadmap) e anotadas na tabela como versão inicial.

## Decisão
- **Runtime de desenvolvimento e build:** Node 24 (LTS), a mesma versão em `engines`,
  `.nvmrc`, CI e imagem de build. O jogo não roda Node em produção. Linha LTS nova só
  por ADR que substitua este, junto com a plataforma.
- **Gerenciador:** pnpm 10, `packageManager` fixado no `package.json`. Um pacote só
  (sem workspaces) enquanto houver um app (ADR 0004).
- **Bibliotecas** (major fixado; trocar de major ou de biblioteca para o mesmo papel
  exige ADR que substitua este):

  | Área | Pacote | Major | Versão inicial (1a) |
  |---|---|---|---|
  | Runtime e gerenciador | Node, pnpm | 24 / 10 | 24.22.3 / 10.34.9 |
  | Linguagem | typescript (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) | 6 | 6.0.3 |
  | Tipos do Node (dev; testes de `scripts/` e arquivos de configuração) | @types/node | 24 | 24.19.2 |
  | Engine | phaser (Arcade Physics, loader de Tiled JSON, entrada por toque) | 3 | 3.90.0 (última do major 3) |
  | Build | vite | 7 | 7.3.8 |
  | Validação do save | zod (import `zod/mini`, menor no bundle) | 4 | 4.6.7 |
  | Testes | vitest, @vitest/coverage-v8, @playwright/test, @axe-core/playwright | 4 / 4 / 1 / 4 | 4.1.12 / 4.1.12 / 1.65.0 / 4.14.0 |
  | Lint e formato | @biomejs/biome (não formata `*.md` nem `*.yml`) | 2 | 2.6.6 |
  | Servidor estático | Caddy (imagem `-alpine`, por digest) | 2 | a mesma da plataforma (`fahledu/0003`) |
  | Edição de trechos (ferramenta do autor, fora do `package.json`) | Tiled | 1.10 ou mais nova | formato `.tmj` (ADR 0013) |

- **Menus e HUD fora do canvas sem framework:** TypeScript e DOM puros, CSS à mão com os
  tokens do `docs/DESIGN.md` (ADR 0009). Sem React, sem biblioteca de UI.
  A coluna "Versão inicial (1a)" registra o que o item 1a instalou (conferido no npm em
  2026-11-18). Depois do 1a, patch e minor vivem só no `package.json` e no lockfile; o
  ADR só muda em troca de major ou de biblioteca.
- **Versão nova de um pacote:** a mais nova do major com mais de 7 dias publicada.
- **Versões exatas** (`save-exact=true`), `pnpm-lock.yaml` versionado, CI e imagem
  instalam com `--frozen-lockfile`.
- **Cadeia de dependências:**
  - `minimumReleaseAge: 10080` (7 dias) no `pnpm-workspace.yaml`. Exceção só para
    correção de segurança, com o motivo no commit.
  - Scripts de instalação só dos pacotes em `onlyBuiltDependencies` (hoje só
    `esbuild`, que vem com o Vite); incluir outro pede aprovação do usuário e motivo no
    commit.
  - Pacote novo: nome exato, autor, idade e downloads conferidos; preferir Web API a
    pacote pequeno (ex.: PRNG e hash de semente são código próprio, ADR 0013). Fora da
    tabela, só com motivo no plano.
- **Atualização:** revisão mensal (`pnpm outdated`), patch e minor em lote com testes
  verdes; `pnpm audit --prod --audit-level high` no CI falha o build.

## Casos-limite
- Phaser 3.x nova com mudança de API de física → só entra com os testes de domínio e o
  E2E de fumaça verdes e o jogo testado à mão na fase 1.
- Pacote com 6 dias de publicado → o pnpm recusa; espera ou exceção de segurança.

## Descartado
- **Phaser 4:** API de renderização nova e ecossistema (exemplos, plugins, respostas)
  ainda centrado no 3; o jogo não usa nada que só o 4 tenha. Migrar é ADR futuro.
- **Canvas próprio sem engine:** física, câmera, tilemap, animação e entrada por toque
  seriam código a escrever e testar.
- **Kaboom/Kaplay, Excalibur, PixiJS + física à parte:** menos maduros para Tiled e
  plataforma, ou exigem juntar várias bibliotecas.
- **Godot exportado para web:** bundle grande e lento no celular, fora da stack do dono.
- **React nos menus:** meia dúzia de telas simples não justifica o runtime.
- **ESLint + Prettier:** o Biome faz os dois com uma dependência.
