// Command state shared by every input source (ADR 0004, ADR 0009): keyboard now, touch in
// item 1k. A command is held while any source holds it; presses are edges consumed by
// `frame()`, so a press and release between two frames still counts.

export type Command = "left" | "right" | "jump" | "pause";

export interface CommandFrame {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpPressed: boolean;
  pausePressed: boolean;
}

export class CommandState {
  /** Source id (e.g. `key:ArrowLeft`, `touch:1`) → command it holds. */
  readonly #held = new Map<string, Command>();
  readonly #pressed = new Set<Command>();

  #isHeld(command: Command): boolean {
    for (const held of this.#held.values()) if (held === command) return true;
    return false;
  }

  press(input: string, command: Command): void {
    if (this.#held.get(input) === command) return; // a repeat of the same source
    if (!this.#isHeld(command)) this.#pressed.add(command);
    this.#held.set(input, command);
  }

  release(input: string): void {
    this.#held.delete(input);
  }

  /** Lets go of everything and drops pending presses (pause, focus lost). */
  releaseAll(): void {
    this.#held.clear();
    this.#pressed.clear();
  }

  frame(): CommandFrame {
    const frame: CommandFrame = {
      left: this.#isHeld("left"),
      right: this.#isHeld("right"),
      jump: this.#isHeld("jump"),
      jumpPressed: this.#pressed.has("jump"),
      pausePressed: this.#pressed.has("pause"),
    };
    this.#pressed.clear();
    return frame;
  }
}
