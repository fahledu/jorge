import { describe, expect, it } from "vitest";
import type { AttemptEvent } from "../domain/attempt.ts";
import { scoreSummary } from "../domain/score.ts";
import { summaryRows } from "./summary-rows.ts";

const walker: AttemptEvent = { type: "enemyDefeated", enemy: "walker" };
const flyer: AttemptEvent = { type: "enemyDefeated", enemy: "flyer" };
const coin: AttemptEvent = { type: "coin" };
const completed: AttemptEvent = { type: "completed" };
const times = (n: number, event: AttemptEvent) => Array.from({ length: n }, () => event);

describe("summaryRows", () => {
  it("the five lines and the total, with pt-BR thousands", () => {
    const events = [...times(12, walker), flyer, ...times(3, coin), completed];
    const summary = scoreSummary(events, { levelNumber: 12, targetTimeSeconds: 45 }, 50_000);
    expect(summaryRows(summary)).toEqual([
      ["Andadores derrotados (12 × 100)", 1200],
      ["Voadores derrotados (1 × 200)", 200],
      ["Moedas (3 × 10)", 30],
      ["Fase concluída (500 + 10 × 12)", 620],
      ["Bônus de tempo (0:50 de 0:45)", 0],
      ["Total", 2050],
    ]);
  });

  it("keeps the lines with nothing in them", () => {
    const summary = scoreSummary([completed], { levelNumber: 1, targetTimeSeconds: 25 }, 9000);
    const rows = summaryRows(summary);
    expect(rows.map(([label]) => label.split(" (")[0])).toEqual([
      "Andadores derrotados",
      "Voadores derrotados",
      "Moedas",
      "Fase concluída",
      "Bônus de tempo",
      "Total",
    ]);
    expect(rows.slice(0, 3).map(([, points]) => points)).toEqual([0, 0, 0]);
    expect(rows[5]?.[1]).toBe(summary.total);
  });
});
