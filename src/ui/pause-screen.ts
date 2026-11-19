import type { EventBus } from "../game/events.ts";
import { button, dialog, element } from "./dom.ts";
import { strings } from "./strings.ts";

const RESUME_KEYS = new Set(["Escape", "KeyP", "Enter", "NumpadEnter"]);

/** "Pausa" (mockup), reduced to item 1c: level line and "Continuar". */
export function mountPauseScreen(root: HTMLElement, bus: EventBus): void {
  const { veil, panel, title } = dialog(root, "pause-title");
  title.textContent = strings.pause;
  const level = element("p", "muted small subtitle");
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
  bus.on("paused", ({ levelNumber }) => {
    level.textContent = strings.levelLabel(levelNumber);
    veil.hidden = false;
    document.addEventListener("keydown", onKey, true);
    resume.focus();
  });
}
