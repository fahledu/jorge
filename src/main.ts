import "./ui/tokens.css";
import "./ui/base.css";
import { createGame } from "./game/create-game";
import { EventBus } from "./game/events";
import { strings } from "./ui/strings";
import { mountTitleScreen } from "./ui/title-screen";

function byId(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id} in index.html`);
  return node;
}

const bus = new EventBus();
const game = createGame(byId("game"), strings.gameName);
bus.on("playRequested", () => game.start());
mountTitleScreen(byId("ui"), bus);
