// Every interface text, in pt-BR (ADR 0004, ADR 0009).
export const strings = {
  gameName: "Jorge",
  tagline: "100 fases. Pule nos inimigos, pegue moedas, chegue à bandeira.",
  play: "Jogar",
  saveNote: "Seu progresso fica salvo neste navegador.",
  levelLabel: (levelNumber: number): string => `Fase ${levelNumber}`,
  pause: "Pausa",
  resume: "Continuar",
  levelCompleted: (levelNumber: number): string => `Fase ${levelNumber} concluída!`,
  playAgain: "Jogar de novo",
  /** On the HUD, before the level number. */
  levelWord: "FASE",
  pauseLine: (levelNumber: number, time: string, points: string): string =>
    `Fase ${levelNumber} · ${time} · ${points} pontos`,
  scoreTable: "Pontos da fase",
  walkersLine: (count: string, each: string): string => `Andadores derrotados (${count} × ${each})`,
  flyersLine: (count: string, each: string): string => `Voadores derrotados (${count} × ${each})`,
  coinsLine: (count: string, each: string): string => `Moedas (${count} × ${each})`,
  completionLine: (base: string, perLevel: string, levelNumber: string): string =>
    `Fase concluída (${base} + ${perLevel} × ${levelNumber})`,
  timeBonusLine: (used: string, target: string): string => `Bônus de tempo (${used} de ${target})`,
  total: "Total",
  fell: "Ops! Você caiu.",
  outOfHearts: "Ops! Acabaram os corações.",
  restarting: (levelNumber: number): string => `Recomeçando a fase ${levelNumber}…`,
} as const;
