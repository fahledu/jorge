import type { EventBus } from "../game/events.ts";
import { button, dialog, element } from "./dom.ts";
import { formatPoints } from "./format.ts";
import { strings } from "./strings.ts";
import { summaryRows } from "./summary-rows.ts";

function row(label: string, points: number, className = ""): HTMLTableRowElement {
  const tr = element("tr", className);
  const header = element("th", "", label);
  header.scope = "row";
  tr.append(header, element("td", "", formatPoints(points)));
  return tr;
}

/** "Fase concluída" (mockup), without the record of 1i nor the buttons of 1j. */
export function mountLevelCompleteScreen(root: HTMLElement, bus: EventBus): void {
  const { veil, panel, title } = dialog(root, "complete-title");
  title.classList.add("success");
  const table = element("table", "breakdown");
  table.setAttribute("aria-label", strings.scoreTable);
  const body = element("tbody", "");
  // The focus goes to the button: the rows are the dialog's description, read with the
  // title. It points at the tbody, since the table's aria-label would replace the rows.
  body.id = "complete-summary";
  panel.setAttribute("aria-describedby", body.id);
  table.append(body);
  const again = button(strings.playAgain);
  panel.append(table, again);

  again.addEventListener("click", () => {
    veil.hidden = true;
    bus.emit("restartRequested");
  });
  bus.on("levelCompleted", ({ levelNumber, summary }) => {
    title.textContent = strings.levelCompleted(levelNumber);
    const rows = summaryRows(summary);
    const last = rows.length - 1;
    body.replaceChildren(
      ...rows.map(([label, points], i) => row(label, points, i === last ? "total" : "")),
    );
    veil.hidden = false;
    again.focus();
  });
}
