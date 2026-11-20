# 0007. Save e recordes locais

- Status: Aceito
- Data: 2026-11-18

## Contexto
O jogo é público e aberto: qualquer pessoa que abrir o site joga, sem conta e sem
login. O save e o "ranking" ficam só no navegador; o ranking é da própria pessoa (os
recordes dela por fase e o total), sem competição com outros jogadores. O formato do
save vai mudar com as versões do jogo, e um save perdido ou corrompido é a pior falha
possível para quem joga.

## Decisão

### Um save por navegador, sem perfil
- Um único save por navegador (origem). **Sem perfis e sem apelido:** o recorde é
  pessoal, e quem divide o navegador divide o save. Assim o jogo não guarda nenhum dado
  pessoal.
- Tudo no `localStorage` da origem, numa chave só: `game.save` (o nome não muda com o
  nome do produto). Só `src/storage` lê e grava (ADR 0004). Os dados têm poucos KB e a
  escrita de uma chave é atômica.
- **Nada sai do aparelho:** sem rede para save ou recordes, sem analytics, sem cookie,
  sem identificador do aparelho ou do jogador.

### Formato (versão 1)

```ts
{
  schemaVersion: 1,
  unlockedLevel: number,                // 1 a 100
  levels: Record<string, {              // "1".."100", só fases concluídas
    best: {                             // tentativa concluída de maior pontuação (ADR 0006)
      score: number,
      timeMs: number,
      enemiesDefeated: number,
      coinsCollected: number,
      levelHash: string,                // `contentHash` da fase jogada (ADR 0013)
    },
    bestTimeMs: number,                 // menor tempo de uma tentativa concluída
    completions: number,                // vezes que a fase foi concluída (≥ 1)
  }>,
  settings: { reduceEffects: boolean, touchControls: 'auto' | 'on' | 'off' },
}
```

- `best` e `bestTimeMs` são independentes (podem vir de tentativas diferentes). Empate
  de pontuação: fica a tentativa de menor `timeMs`.
- A pontuação total e as telas de recordes são derivadas de `levels`, nunca gravadas.
- **Preparo barato para a Fase 2 (proposta) do roadmap:** o resultado detalhado e o
  `levelHash` dizem com qual versão da fase o recorde foi feito, para um ranking global
  ou save na nuvem futuros filtrarem ou migrarem. Nada além disso: sem código, endpoint
  ou identificador de jogador no MVP.
- Fase cujo conteúdo mudou num deploy (outro `contentHash`) → o recorde antigo continua
  valendo localmente, com o `levelHash` antigo; a tentativa nova que o superar grava o
  hash novo.
- Validação na leitura com um schema Zod por versão (ADR 0003), no `domain`.

### Versão e migração
- `schemaVersion` sobe a cada mudança de formato. Migrações são funções puras
  `v → v + 1`, encadeadas na leitura; o resultado é gravado na versão atual.
- Cada versão publicada tem uma fixture de save real em `src/domain/save/fixtures/`,
  mantida para sempre; o teste migra todas até a atual.
- **Save de versão mais nova** que a do jogo (aba com build antigo em cache) → o jogo
  não grava por cima: avisa "Recarregue a página para usar a versão nova" e joga sem
  salvar.
- **Save ilegível** (JSON inválido ou falha no schema) → cópia do texto bruto em
  `game.save.corrupted.<timestamp UTC>` (só a mais recente), save novo vazio e aviso.
  Nunca apaga o texto sem cópia.

### Gravação e várias abas
- Grava ao concluir fase, ao mudar configuração e ao apagar o progresso.
- Toda gravação lê o save atual, **mescla** e grava: `unlockedLevel` = maior dos dois;
  por fase, `best` = o de maior `score` (empate: menor `timeMs`), `bestTimeMs` = menor,
  `completions` = maior.
  Configuração: vale a última gravação. Duas abas não apagam o progresso uma da outra.
- **Apagar progresso** (nas configurações) pede confirmação em duas etapas e grava o
  save vazio sem mesclar.
- Armazenamento indisponível (modo privado, cota, bloqueado) → o jogo roda, avisa
  uma vez "Seu progresso não será salvo neste navegador" e mantém o estado em memória.

### Recordes
- Tela de recordes: pontuação total (soma dos `best.score`), fases concluídas, e por
  fase a melhor pontuação e o melhor tempo. A seleção de fases mostra o recorde de cada fase.
- Tentativa concluída que bate o recorde de pontos ou de tempo da fase → "Novo
  recorde!" na tela de fase concluída.

## Casos-limite
- Aba A conclui a fase 5 (libera 6) enquanto a aba B, com save antigo, conclui a 3 com
  recorde → save final com `unlockedLevel` 6 e o recorde da fase 3.
- Duas abas concluem a fase 2 ao mesmo tempo, cada uma com `completions` 1 → resultado
  1, não 2. Aceito (contagem aproximada, sem perda de recorde).
- Fase 4: recorde 900 pontos em 40 s; nova tentativa com 800 pontos em 35 s →
  `best.score` 900 (com o tempo de 40000 dele), `bestTimeMs` 35000, `completions` +1;
  "Novo recorde!" de tempo.
- Duas tentativas da fase 2 com 760 pontos, em 30 s e em 28 s → `best` fica a de 28 s.
- Apagar progresso numa aba enquanto outra está aberta e depois grava → a outra mescla
  com o save vazio e devolve o que tinha em memória. Aceito; a confirmação avisa para
  fechar as outras abas.
- `{"schemaVersion":2,...}` com o jogo na versão 1 → não grava, aviso de recarregar.
- `game.save` = `"{abc"` → cópia em `game.save.corrupted.2026-11-18T12:00:00Z`, save
  novo, aviso.
- `levels` com fase `"101"`, pontuação negativa ou `completions` 0 → falha no schema →
  tratado como ilegível.
- Jogador edita o `localStorage` e se dá 1 milhão de pontos válidos no schema → aceito
  (recorde pessoal, ninguém mais vê); sem antitrapaça.
- Usuário limpa os dados do navegador → progresso perdido; risco aceito e dito na tela
  de créditos ("o progresso fica só neste navegador").
- Troca do domínio do jogo → outra origem, save não acompanha (nome decidido antes do
  deploy, ADR 0011).

## Descartado
- **Perfis com apelido no mesmo navegador:** o recorde é pessoal e não há competição
  local; perfis trariam dado pessoal (apelido), telas e regras de unicidade sem pedido.
- **Apelido opcional "para o futuro":** dado pessoal sem uso agora; se o ranking global
  vier, a identificação será desenhada junto com ele.
- **IndexedDB:** API assíncrona e mais código para poucos KB.
- **Ranking global ou save na nuvem no MVP:** exige backend, identificação, moderação e
  antifraude; ficam na Fase 2 (proposta) do roadmap, sem decisão aqui.
- **Gravar o total:** pode divergir dos recordes; derivar é mais simples.
