import type { EventBus } from "../game/events.ts";
import { element } from "./dom.ts";
import { strings } from "./strings.ts";

/**
 * "Tentativa perdida" (mockup): a short notice with no button that does not take the focus,
 * shown while the death effect runs, until the new attempt starts (plan 1f, decision 6).
 */
export function mountAttemptLostToast(root: HTMLElement, bus: EventBus): void {
  // The live region and the notice stay in the accessibility tree all the time; only the
  // text changes, which screen readers announce. A node that appears already filled
  // (`hidden` removed with the text) is often not announced, so idle only fades it out.
  const status = element("div", "toast-region");
  status.setAttribute("role", "status");
  const toast = element("div", "toast toast-idle");
  const title = element("p", "toast-title");
  const line = element("p", "muted small toast-line");
  toast.append(title, line);
  status.append(toast);
  root.append(status);

  bus.on("attemptLost", ({ levelNumber, reason }) => {
    title.textContent = reason === "fell" ? strings.fell : strings.outOfHearts;
    line.textContent = strings.restarting(levelNumber);
    toast.classList.remove("toast-idle");
  });
  bus.on("attemptStarted", () => {
    toast.classList.add("toast-idle");
    title.textContent = "";
    line.textContent = "";
  });
}
