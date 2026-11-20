import {
  COMPLETION_BASE,
  COMPLETION_PER_LEVEL,
  POINTS,
  type ScoreSummary,
} from "../domain/score.ts";
import { formatSeconds, formatPoints as n } from "./format.ts";
import { strings } from "./strings.ts";

/** The five lines and the total of the summary (plan 1f, decision 5), always all of them. */
export function summaryRows(summary: ScoreSummary): [string, number][] {
  const { walkers, flyers, coins, completion, timeBonus } = summary;
  return [
    [strings.walkersLine(n(walkers.count), n(POINTS.walker)), walkers.points],
    [strings.flyersLine(n(flyers.count), n(POINTS.flyer)), flyers.points],
    [strings.coinsLine(n(coins.count), n(POINTS.coin)), coins.points],
    [
      strings.completionLine(
        n(COMPLETION_BASE),
        n(COMPLETION_PER_LEVEL),
        n(completion.levelNumber),
      ),
      completion.points,
    ],
    [
      strings.timeBonusLine(
        formatSeconds(timeBonus.usedSeconds),
        formatSeconds(timeBonus.targetSeconds),
      ),
      timeBonus.points,
    ],
    [strings.total, summary.total],
  ];
}
