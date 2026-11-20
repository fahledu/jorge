// Typed event bus between `game` and `ui` (ADR 0004). Built on EventTarget, not on
// Phaser, so `ui` does not depend on the engine through this file.
import type { ScoreSummary } from "../domain/score.ts";

/** Every event and its payload. `undefined` means no payload. */
export interface GameEvents {
  /** The player asked to start playing (title screen). */
  playRequested: undefined;
  /** game → ui: the level stopped (Esc/P or focus lost), with the attempt so far. */
  paused: { levelNumber: number; elapsedMs: number; points: number };
  /** game → ui: the player touched the flag; the points of the attempt (ADR 0006). */
  levelCompleted: { levelNumber: number; summary: ScoreSummary };
  /** game → ui: the attempt was lost (fell or no hearts); the death effect starts. */
  attemptLost: { levelNumber: number; reason: "fell" | "hearts" };
  /** game → ui: an attempt started (the first one too). */
  attemptStarted: { levelNumber: number; attempt: number };
  /** ui → game: continue the paused level. */
  resumeRequested: undefined;
  /** ui → game: play the level again from the start. */
  restartRequested: undefined;
}

export type GameEventName = keyof GameEvents;
type Listener<K extends GameEventName> = (payload: GameEvents[K]) => void;
type Payload<K extends GameEventName> = GameEvents[K] extends undefined ? [] : [GameEvents[K]];

export class EventBus {
  readonly #target = new EventTarget();
  // Keyed by event name and listener: the same function may listen to several events.
  readonly #wrapped = new Map<GameEventName, Map<unknown, EventListener>>();

  #listeners(name: GameEventName): Map<unknown, EventListener> {
    let byListener = this.#wrapped.get(name);
    if (!byListener) {
      byListener = new Map();
      this.#wrapped.set(name, byListener);
    }
    return byListener;
  }

  on<K extends GameEventName>(name: K, listener: Listener<K>): void {
    const wrapped: EventListener = (event) => {
      listener((event as CustomEvent<GameEvents[K]>).detail);
    };
    this.#listeners(name).set(listener, wrapped);
    this.#target.addEventListener(name, wrapped);
  }

  off<K extends GameEventName>(name: K, listener: Listener<K>): void {
    const wrapped = this.#listeners(name).get(listener);
    if (!wrapped) return;
    this.#target.removeEventListener(name, wrapped);
    this.#listeners(name).delete(listener);
  }

  emit<K extends GameEventName>(name: K, ...payload: Payload<K>): void {
    this.#target.dispatchEvent(new CustomEvent(name, { detail: payload[0] }));
  }
}
