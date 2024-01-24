import "./style.css";
import { UI, UIView } from "@peasy-lib/peasy-ui";
import { Engine, DisplayMode, Color, Vector, GoToOptions, Actor } from "excalibur";
import { AuthenticationType, MultiPlayerInterface } from "./Multiplayer";
import { HathoraClient, HathoraConnection } from "@hathora/client-sdk";
import { Login } from "./scenes/Login";
import { Lobby } from "./scenes/Lobby";
import { Game, updateHathoraState } from "./scenes/Game";
//import { starfieldPostProcessor } from "./shaders/starfield";
export const version = "0.0.6";
//@ts-ignore
import bhole from "./assets/bhole_icon.png";
//@ts-ignore
import galaxy from "./assets/galaxy_icon.png";

const gameWidth = 1200;
const gameHeight = (gameWidth * 9) / 16;

export const MP_Connection = new MultiPlayerInterface(
  "app-52044e66-ed56-4479-b2cb-4997622a9472",
  updateHathoraState,
  9000,
  [AuthenticationType.anonymous, AuthenticationType.nickname],
  true
);

export let MP_Client: HathoraClient | undefined;

export const UIstate = {
  hudLayer: undefined as undefined | HTMLElement,
  hudWidth: gameWidth,
  hudHeight: gameHeight,
};

const template = `
<style>
    html,body{
      height:100%;
    }

    .App{
      height: 100%;
      display:flex;
      justify-content: center;
      align-items: center;
    }

    hud-layer{
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%,-50%); 
        display: flex;
        justify-content: center;
        align-items: center;
        width: \${hudWidth}px;
        height: \${hudHeight}px;
        pointer-events: none;
        opacity: 1;
        transition: opacity 0.4s;
    }
</style>

<div id="App" class="App normCursor">
    <canvas id="gameCnv" style="z-index: 0;"></canvas>
    <hud-layer style="z-index: 1;" \${==>hudLayer}></hud-layer>
</div>
`;
await UI.create(document.body, UIstate, template).attached;

export const game = new Engine({
  width: gameWidth,
  height: gameHeight,
  canvasElementId: "gameCnv",
  displayMode: DisplayMode.FitScreen,
});
const screen = game.screen;

UIstate.hudWidth = screen.viewport.width;
UIstate.hudHeight = screen.viewport.height;
window.addEventListener("resize", () => {
  UIstate.hudWidth = screen.viewport.width;
  UIstate.hudHeight = screen.viewport.height;
});

game.add("login", new Login());
game.add("lobby", new Lobby());
game.add("game", new Game());
//game.toggleDebug();
game.start();
game.goto("login", { sceneActivationData: { time: 0, engine: game, w: gameWidth, h: gameHeight } });
