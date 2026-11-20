import type { EventBus } from "../game/events.ts";
import { button, dialog, element } from "./dom.ts";
import { formatPoints, formatTime } from "./format.ts";
import { strings } from "./strings.ts";

const RESUME_KEYS = new Set(["Escape", "KeyP", "Enter", "NumpadEnter"]);

/** "Pausa" (mockup) without the buttons of 1j: level, time and points, and "Continuar". */
export function mountPauseScreen(root: HTMLElement, bus: EventBus): void {
  const { veil, panel, title } = dialog(root, "pause-title");
  title.textContent = strings.pause;
  const level = element("p", "muted small subtitle");
  level.id = "pause-line";
  // The focus goes to "Continuar": level, time and points are read as the description.
  panel.setAttribute("aria-describedby", level.id);
  const resume = button(strings.resume);
  panel.append(level, resume);

  const close = (): void => {
    veil.hidden = true;
    document.removeEventListener("keydown", onKey, true);
    bus.emit("resumeRequested");
  };
  // Capture phase and stopPropagation: the key that resumes must not reach the game's
  // keyboard, which is enabled again by the time the event would bubble to the window.
  const onKey = (event: KeyboardEvent): void => {
    if (!RESUME_KEYS.has(event.code) || event.ctrlKey || event.altKey || event.metaKey) return;
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) close();
  };

  resume.addEventListener("click", close);
  bus.on("paused", ({ levelNumber, elapsedMs, points }) => {
    level.textContent = strings.pauseLine(levelNumber, formatTime(elapsedMs), formatPoints(points));
    veil.hidden = false;
    document.addEventListener("keydown", onKey, true);
    resume.focus();
  });
}
