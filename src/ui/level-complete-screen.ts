import type { EventBus } from "../game/events.ts";
import { button, dialog } from "./dom.ts";
import { strings } from "./strings.ts";

/** "Fase concluída" (mockup), reduced to item 1c: title and "Jogar de novo". */
export function mountLevelCompleteScreen(root: HTMLElement, bus: EventBus): void {
  const { veil, panel, title } = dialog(root, "complete-title");
  title.classList.add("success");
  const again = button(strings.playAgain);
  panel.append(again);

  again.addEventListener("click", () => {
    veil.hidden = true;
    bus.emit("restartRequested");
  });
  bus.on("levelCompleted", ({ levelNumber }) => {
    title.textContent = strings.levelCompleted(levelNumber);
    veil.hidden = false;
    again.focus();
  });
}
