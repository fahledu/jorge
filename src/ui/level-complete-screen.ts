import {
  COMPLETION_BASE,
  COMPLETION_PER_LEVEL,
  POINTS,
  type ScoreSummary,
} from "../domain/score.ts";
import type { EventBus } from "../game/events.ts";
import { button, dialog, element } from "./dom.ts";
import { formatSeconds, formatPoints as n } from "./format.ts";
import { strings } from "./strings.ts";

/** The five lines and the total of the summary (plan 1f, decision 5), always all of them. */
function summaryRows(summary: ScoreSummary): [string, number][] {
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
  ];
}

function row(label: string, points: number, className = ""): HTMLTableRowElement {
  const tr = element("tr", className);
  tr.append(element("td", "", label), element("td", "", n(points)));
  return tr;
}

/** "Fase concluída" (mockup), without the record of 1i nor the buttons of 1j. */
export function mountLevelCompleteScreen(root: HTMLElement, bus: EventBus): void {
  const { veil, panel, title } = dialog(root, "complete-title");
  title.classList.add("success");
  const table = element("table", "breakdown");
  table.setAttribute("aria-label", strings.scoreTable);
  const body = element("tbody", "");
  table.append(body);
  const again = button(strings.playAgain);
  panel.append(table, again);

  again.addEventListener("click", () => {
    veil.hidden = true;
    bus.emit("restartRequested");
  });
  bus.on("levelCompleted", ({ levelNumber, summary }) => {
    title.textContent = strings.levelCompleted(levelNumber);
    body.replaceChildren(
      ...summaryRows(summary).map(([label, points]) => row(label, points)),
      row(strings.total, summary.total, "total"),
    );
    veil.hidden = false;
    again.focus();
  });
}
