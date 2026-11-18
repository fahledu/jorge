import "./ui/tokens.css";
import "./ui/base.css";
import { createGame } from "./game/create-game.ts";
import { EventBus } from "./game/events.ts";
import { strings } from "./ui/strings.ts";
import { mountTitleScreen } from "./ui/title-screen.ts";

function byId(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id} in index.html`);
  return node;
}

const bus = new EventBus();
const game = createGame(byId("game"), strings.gameName, strings.levelLabel);
bus.on("playRequested", () => game.start());
mountTitleScreen(byId("ui"), bus);
