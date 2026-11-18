---
name: retomar
description: Retoma o trabalho numa sessão nova. Lê o STATUS, o roadmap e o estado do git e diz onde o projeto está e qual é o próximo passo.
---

1. Leia `docs/STATUS.md`, o item atual de `docs/ROADMAP.md` e o plano dele em `docs/plans/`,
   se existir.
2. Veja `git status --short` e `git log --oneline -10`.
3. Responda em no máximo 10 linhas: fase e item atual, o que foi feito por último,
   mudanças não commitadas (e se parecem trabalho pela metade), questões em aberto que
   bloqueiam o próximo passo, e o próximo passo com o prompt sugerido.
4. Se o STATUS contradisser o git (item marcado como feito sem commit, por exemplo),
   aponte a divergência. Não comece a implementar sem o usuário pedir.
