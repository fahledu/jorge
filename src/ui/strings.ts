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
} as const;
