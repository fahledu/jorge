import type { Command, CommandState } from "../../domain/commands.ts";

/** Keys of ADR 0009, by `KeyboardEvent.code` (layout independent). */
const KEY_COMMANDS: Readonly<Record<string, Command>> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  Space: "jump",
  KeyW: "jump",
  ArrowUp: "jump",
  Escape: "pause",
  KeyP: "pause",
};

export interface KeyboardControl {
  /** The level is being played: keys drive the commands. */
  enable(): void;
  /** Menus own the keyboard: lets go of every command. */
  disable(): void;
  detach(): void;
}

/** Feeds `state` from the keyboard while enabled. */
export function attachKeyboard(state: CommandState): KeyboardControl {
  let enabled = false;

  const onKeyDown = (event: KeyboardEvent): void => {
    if (!enabled || event.ctrlKey || event.altKey || event.metaKey) return;
    const command = KEY_COMMANDS[event.code];
    if (!command) return;
    // No page scroll and no click on a focused button while playing.
    event.preventDefault();
    if (!event.repeat) state.press(`key:${event.code}`, command);
  };
  const onKeyUp = (event: KeyboardEvent): void => {
    if (!enabled) return;
    if (KEY_COMMANDS[event.code]) state.release(`key:${event.code}`);
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  return {
    enable() {
      state.releaseAll();
      enabled = true;
    },
    disable() {
      enabled = false;
      state.releaseAll();
    },
    detach() {
      this.disable();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
  };
}
