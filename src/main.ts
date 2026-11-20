import "./ui/tokens.css";
import "./ui/base.css";
import { createGame } from "./game/create-game.ts";
import { EventBus } from "./game/events.ts";
import { mountAttemptLostToast } from "./ui/attempt-lost-toast.ts";
import { mountLevelCompleteScreen } from "./ui/level-complete-screen.ts";
import { mountPauseScreen } from "./ui/pause-screen.ts";
import { strings } from "./ui/strings.ts";
import { mountTitleScreen } from "./ui/title-screen.ts";

function byId(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id} in index.html`);
  return node;
}

const bus = new EventBus();
const game = createGame(byId("game"), bus, {
  label: strings.gameName,
  levelLabel: strings.levelLabel,
  levelWord: strings.levelWord,
});
bus.on("playRequested", () => game.start());
const ui = byId("ui");
mountTitleScreen(ui, bus);
mountPauseScreen(ui, bus);
mountLevelCompleteScreen(ui, bus);
mountAttemptLostToast(ui, bus);
