import type { EventBus } from "../game/events.ts";
import { strings } from "./strings.ts";

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Title screen, first visit (mockup "Título"). Emits `playRequested` and hides itself. */
export function mountTitleScreen(root: HTMLElement, bus: EventBus): void {
  const veil = element("div", "veil");
  const panel = element("section", "panel panel-title");
  panel.setAttribute("aria-labelledby", "title-name");

  const name = element("h1", "display", strings.gameName);
  name.id = "title-name";
  const tagline = element("p", "muted small tagline", strings.tagline);
  const play = element("button", "btn btn-primary", strings.play);
  play.type = "button";
  const note = element("p", "muted small save-note", strings.saveNote);

  play.addEventListener("click", () => {
    veil.hidden = true;
    bus.emit("playRequested");
  });

  panel.append(name, tagline, play, note);
  veil.append(panel);
  root.append(veil);
  play.focus();
}
