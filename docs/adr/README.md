# Architecture Decision Records

Decisões estruturais e duradouras do projeto. **São a fonte única das regras**:
CLAUDE.md, agentes, planos e guias citam o ADR, nunca copiam o detalhe.
Só o agente `architect` escreve aqui (garantido por hook, ADR 0002).

Status: **Proposto** (em discussão), **Aceito**, **Substituído por NNNN** ou
**Descartado**. ADR Proposto não é regra: o architect o considera ao planejar e
pede a decisão antes de seguir.

## Quando criar um ADR

- Decisão difícil de desfazer: stack, estrutura, formato de dados, contrato público,
  segurança, regra de domínio que várias partes do código precisam respeitar.
- Não vira ADR: detalhe de uma feature só (vai no plano), preferência de estilo que o
  lint garante, passo a passo operacional (vai no README ou num guia).

## Como mudar uma regra

- **Antes do primeiro commit de código:** edite o ADR do assunto diretamente. Um ADR por
  assunto; não crie ADR novo só para complementar outro.
- **Depois que houver código:** ADR aceito é imutável. Para trocar uma decisão, crie um
  novo que o **substitua** (o antigo vira "Substituído por NNNN").
- Uma regra mora num ADR só; os outros citam "(ADR NNNN)".
- Se o resumo da regra no CLAUDE.md mudar, atualize a linha de lá;
  `node scripts/check-docs.mjs` confere índice, links e citações.
- ADRs citam outros ADRs, nunca a numeração das regras do CLAUDE.md, que muda.

## Modelo

Arquivo `NNNN-titulo-em-kebab-case.md`, número sequencial com 4 dígitos. Seja
conciso: regra, não ensaio. Seções opcionais só quando houver conteúdo.

```markdown
# NNNN. Título

- Status: Proposto
- Data: AAAA-MM-DD

## Contexto
O problema e as forças em jogo, em poucas linhas.

## Decisão
As regras, em itens verificáveis (um revisor consegue dizer se o código cumpre).

## Dados (opcional)
Tabelas, colunas e restrições que a decisão exige.

## Casos-limite (opcional)
Entradas extremas e o comportamento esperado; viram testes nos planos.

## Descartado (opcional)
Alternativas consideradas e por que não.
```

## Índice

| # | Título | Status |
|---|---|---|
| [0001](0001-registro-de-decisoes-e-fonte-unica.md) | Registro de decisões e fonte única | Aceito |
| [0002](0002-agentes-areas-e-garantias-por-hook.md) | Agentes, áreas e garantias por hook | Aceito |
| [0003](0003-stack-e-versoes.md) | Stack e versões | Aceito |
| [0004](0004-arquitetura-e-estrutura-do-codigo.md) | Arquitetura e estrutura do código | Aceito |
| [0005](0005-fases-gerador-por-trechos-e-curva-de-dificuldade.md) | Fases: gerador por trechos e curva de dificuldade | Substituído por 0013 |
| [0006](0006-regras-do-jogo-e-pontuacao.md) | Regras do jogo e pontuação | Substituído por 0014 |
| [0007](0007-save-e-ranking-locais.md) | Save e recordes locais | Aceito |
| [0008](0008-assets-de-terceiros-e-licenca.md) | Assets de terceiros e licença | Aceito |
| [0009](0009-interface-controles-e-acessibilidade.md) | Interface, controles e acessibilidade | Aceito |
| [0010](0010-testes-e-qualidade.md) | Testes e qualidade | Aceito |
| [0011](0011-hospedagem-ci-e-deploy.md) | Hospedagem, CI e deploy | Aceito |
| [0012](0012-arquivos-tmj-autoria-por-agente-e-validade.md) | Arquivos .tmj: autoria por agente e validade | Aceito |
| [0013](0013-fases-gerador-curva-e-validador.md) | Fases: gerador, curva e validador (substitui o 0005) | Aceito |
| [0014](0014-mortes-vidas-e-item-secreto.md) | Modos livre e desafio, vidas e item secreto (substitui o 0006) | Aceito |
| [0015](0015-temas-visuais-por-bloco-de-fases.md) | Temas visuais por bloco de fases | Aceito |

## Decisões ainda sem ADR

Assuntos que vão precisar de ADR quando a feature correspondente for planejada:

- Ranking global e save na nuvem (Fase 2 proposta do `docs/ROADMAP.md`, sem prioridade):
  identidade, moderação de apelido, antifraude de pontuação, dados pessoais, backend e
  banco. Nenhum ADR até o usuário decidir abrir a fase.
