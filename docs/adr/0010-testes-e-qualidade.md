# 0010. Testes e qualidade

- Status: Aceito
- Data: 2026-11-18

## Contexto
As regras que mais custam quando erram são puras (gerador, validador, pontuação, save e
migração, ADR 0004) e cabem em teste de unidade. A física e o desenho dependem da
engine e do aparelho: E2E de fumaça e teste à mão, com roteiro.

## Decisão
- **Unidade (Vitest):** `src/domain` com cobertura de linhas e ramos ≥ 95%, conferida
  no CI. Os casos-limite dos ADRs 0007, 0013 e 0014 viram testes com os valores deles.
- **Fases:** `pnpm levels:check` no CI (ADR 0013): determinismo, igualdade com os
  arquivos versionados e validador nas 100 fases.
- **Save:** fixture de cada `schemaVersion` publicada, migrada até a atual (ADR 0007).
- **Assets:** teste dos hashes de `assets/kenney/` (ADR 0008).
- **Importações:** teste que garante a pureza do `domain` (ADR 0004).
- **E2E (Playwright, Chromium desktop e um perfil de celular em paisagem com toque):**
  contra o build de produção servido localmente. Fumaça: abrir, jogar a fase 1 até a
  bandeira, ver a fase 2 liberada, recarregar e ver o progresso e o recorde da fase 1 na
  tela de recordes; apagar o progresso e ver a fase 2 bloqueada. Axe sem violações em cada tela de menu (ADR 0009). Nenhum erro no console
  nem violação de CSP (ADR 0011).
- **Atalho de teste:** só no build de modo `e2e` (`import.meta.env.MODE`), um objeto em
  `window` permite pular para a bandeira e escolher a fase; um teste confere que o
  build de produção não o contém. Com ele, o E2E abre as 100 fases e conclui cada uma.
- **Teste à mão** antes de fechar itens que mexem em física, trechos ou controles:
  roteiro em `docs/ROTEIRO-TESTE.md`, criado no item de fundação (fases 1, 10, 50 e 100 até o fim, num notebook e num
  celular), com medida de fps (contador de debug só no modo de desenvolvimento): meta de
  60 fps, mínimo aceitável 55 de média em 30 s.
- **Lint e tipos:** Biome e `tsc --noEmit` sem erro; sem `any` sem comentário.
- **CI** roda: Biome, typecheck, unidade com cobertura, `levels:check`, build,
  `pnpm audit --prod --audit-level high` e varredura de segredos (ADR 0002). E2E roda no
  deploy e manualmente (ADR 0011).
- Script `test:quiet` com saída resumida (só falhas e o total), para os agentes.

## Casos-limite
- Teste de E2E que depende de tempo de física → usa o atalho de teste, nunca espera fixa
  em ms.
- Build de produção com a string do atalho de teste → teste falha.
- Cobertura do `domain` em 94,9% → CI falha.

## Descartado
- **Teste de unidade das cenas do Phaser com mock da engine:** muito mock, pouca
  garantia; a lógica que importa está no `domain`.
- **Teste de regressão visual por screenshot:** frágil com animação; fica para depois se
  houver regressão visual real.
- **Navegadores Firefox e WebKit no CI:** custo de minutos; conferidos à mão no roteiro.
