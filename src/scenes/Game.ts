import { Actor, Color, Engine, ImageSource, Material, Scene, SceneActivationContext, Vector } from "excalibur";
import { UIstate, game, MP_Client, MP_Connection } from "../main";
import { UI, UIView } from "@peasy-lib/peasy-ui";
import { waitSomeTime } from "../utils";
import { starFrag } from "../shaders/star";
import { blackHoleFrag } from "../shaders/blackhole";
import { gridNebulaFrag } from "../shaders/gridNebula";
//@ts-ignore
import noise1 from "../assets/perlin.png";
//@ts-ignore
import noise2 from "../assets/fractal.png";
//@ts-ignore
import greynoise from "../assets/blue.png";

//@ts-ignore
import check from "../assets/check.png";
//@ts-ignore
import waiting from "../assets/waiting.gif";

type mySceneContext = {
  time: number;
  engine: Engine;
  w: number;
  h: number;
  starfield: Actor;
};

let state = {
  user: { id: "", nickname: "", token: "" },
  p1state: false,
  p2state: false,
};

export function setState(init: { id: string; nickname: string; token: string }) {
  state.user.id = init.id;
  state.user.nickname = init.nickname;
  state.user.token = init.token;
}

const p1StartingPostionVectors = [
  new Vector(50, 125),
  new Vector(50, 185),
  new Vector(50, 245),
  new Vector(50, 305),
  new Vector(50, 365),
  new Vector(50, 425),
  new Vector(50, 485),
  new Vector(50, 545),
];

const p2StartingPostionVectors = [
  new Vector(1150, 160),
  new Vector(1150, 220),
  new Vector(1150, 280),
  new Vector(1150, 340),
  new Vector(1150, 400),
  new Vector(1150, 460),
  new Vector(1150, 520),
  new Vector(1150, 580),
];

const boardPositions = [
  new Vector(207, 83),
  new Vector(270, 83),
  new Vector(333, 83),
  new Vector(396, 83),
  new Vector(207, 144),
  new Vector(270, 144),
  new Vector(333, 144),
  new Vector(396, 144),
  new Vector(207, 205),
  new Vector(270, 205),
  new Vector(333, 205),
  new Vector(396, 205),
  new Vector(207, 267),
  new Vector(270, 267),
  new Vector(333, 267),
  new Vector(396, 267),
];

const boardPosition = new Vector(600, 350);

export class Game extends Scene {
  //General Purpose Items
  _time: number = 0; // Shader Value
  SceneView: UIView | undefined; //peasy view
  // ******************** */
  // Peasy template ***** */
  // ******************** */
  template = `
  <scene-layer class="scene">
    <toast-layer \${===showToast}>\${toastContent}</toast-layer>
   
    <inactivity-timer \${===showTimerWarning}>
        Inactivity Warning
        Time until game cancellation: \${timeLeft} 
    </inactivity-timer>
    
    <waiting-modal \${===showWaiting}>
      <div class="waiting_primary">WAITING ON PLAYER TO JOIN</div>
      <div class="waiting_secondary">PLEASE STANDBY....</div>
      <div style="display: flex; flex-direction: column; justify-items: center; align-content: center; gap: 10px;">
        <div class="confirm_ready" \${click@=>setPlayer2AI}>PLAY AI?</div>
        <div class="confirm_ready" \${click@=>leaveGame}>QUIT</div>
      </div>
    </waiting-modal>

    <confirm-modal \${===showConfirm}>
      <div class="confirm_title">READY TO START</div>
      <div class="confirm_outerflex">
        <div class="confirm_innerflex">
          <div class="confirm_id">Player 1</div>
          <div class="confirm_name">\${player1Name}</div>
          <div class="confirm_icon \${isPlayer1Active}"></div>
          <div class="confirm_ready \${isPlayer1}" \${click@=>setPlayer1Ready}>READY</div>
        </div>
        <div class="confirm_innerflex">
          <div class="confirm_id">Player 2</div>
          <div class="confirm_name">\${player2Name}</div>
          <div class="confirm_icon \${isPlayer2Active}"></div>
          <div class="confirm_ready \${isPlayer2}" \${click@=>setPlayer2Ready} >READY</div>
        </div>
      </div>
    </confirm-modal>
    
    <title-layer class="gameHudTitle \${blur}" >Orbit Connect</title-layer>
    
    <blur-layer \${===showBlur}></blur-layer>
    
    <player-identifier>You are \${playerIdentifier}</player-identifier>
    
    <turn-identifier>It is \${turnIdentifier}'s turn</turn-identifier>
    
    <end-turn class="endturncontainer" \${===showEndTurn}>
      <div class="endturncontent">Your turn is completed, ready to change turns?</div>
      <div class="confirm_ready" \${click@=>endTurn}>END TURN</div>
    </end-turn>
    
    <player-left \${===showPlayerLeft}>
      <div>The other player left the match</div>
      <div style="display: flex;  gap: 5px;">
          <div \${click@=>backToWaiting} class="confirm_ready">Reset</div>
          <div \${click@=>leaveGame} class="confirm_ready">Leave</div>
      </div>
    </player-left>
    
    <replay-modal \${===showReplay}>
      <div \${!==isDraw}>Game Result: \${gameResult} Won!!!</div>
      <div \${===isDraw}>Game Result: Draw!!!</div>
      <div style="display: flex; flex-direction: column; gap: 5px;">
        <div>Would you like to play again? Both players must click rematch</div>
        <div style="display: flex;  gap: 5px;">
          <div \${click@=>resetGame} class="confirm_ready">Rematch?</div>
          <div \${click@=>leaveGame} class="confirm_ready">Leave</div>
        </div>
      </div>
    </replay-modal>
  </scene-layer>
  `;

  // ******************** */
  // UIState Variables ** */
  // ******************** */
  p1Hoverstates: Boolean[] = [false, false, false, false, false, false, false, false];
  p2Hoverstates: Boolean[] = [false, false, false, false, false, false, false, false];
  player1Name = "Larry";
  player2Name = "Robert";
  showWaiting = false;
  showConfirm = false;
  showToast = false;
  showTimerWarning = false;
  playerIdentifier = "player1";
  turnIdentifier = "player1";
  blur = "";
  toastContent = "This is a toast message";

  // ******************** */
  // Excalibur Data ***** */
  // ******************** */
  _starfieldActor: Actor | undefined;
  p1ActorTokens: Actor[] = [];
  p2ActorTokens: Actor[] = [];
  boardActor: Actor = new Actor({});
  boardSpots: Actor[] = [];
  listOfP1StarShaderMaterials: Material[] = [];
  listOfP2StarShaderMaterials: Material[] = [];
  listOfBoardSpotShadermaterials: Material[] = [];
  boardMaterial: Material | undefined;

  // ******************** */
  // Getters
  // ******************** */
  get isPlayer1Active() {
    if (state.p1state) return "ready";
    else return "waiting";
  }

  get isPlayer2Active() {
    if (state.p2state) return "ready";
    else return "waiting";
  }

  get p1HoverStates() {
    let isHovering = this.p1Hoverstates.some(hov => hov == true);
    let isHovering2 = this.p2Hoverstates.some(hov => hov == true);
    console.log("isHovering: ", isHovering);
    let elem = document.getElementById("App");
    if (elem && (isHovering || isHovering2)) {
      //set hover cursor
      elem.classList.add("hoverCursor");
    } else if (elem && !isHovering && !isHovering2) {
      elem.classList.remove("hoverCursor");
    }
    return isHovering;
  }

  async onActivate(ctx: SceneActivationContext<unknown>): Promise<void> {
    this._time = (ctx.data as { time: number }).time as number;
    this._starfieldActor = (ctx.data as mySceneContext).starfield;
    this.add(this._starfieldActor);
    console.log("in game");
    this.SceneView = UI.create(UIstate.hudLayer, this, this.template);
    //create shaders
    const imgNoise1 = new ImageSource(noise1);
    const imgNoise2 = new ImageSource(noise2);
    const imgNoise3 = new ImageSource(greynoise);
    await imgNoise1.load();
    await imgNoise2.load();
    await imgNoise3.load();

    //create 16 star shaders, 16 black hole shaders, and the board material
    for (let index = 0; index < 16; index++) {
      if (index <= 7) this.listOfP1StarShaderMaterials.push(game.graphicsContext.createMaterial({ fragmentSource: starFrag }));
      else this.listOfP2StarShaderMaterials.push(game.graphicsContext.createMaterial({ fragmentSource: starFrag }));
      this.listOfBoardSpotShadermaterials.push(
        game.graphicsContext.createMaterial({
          fragmentSource: blackHoleFrag,
          images: {
            U_noise1: imgNoise1,
            U_noise2: imgNoise2,
          },
        })
      );
    }
    this.boardMaterial = game.graphicsContext.createMaterial({
      fragmentSource: gridNebulaFrag,
      images: {
        U_noise1: imgNoise3,
      },
    });

    //create actors
    for (let index = 0; index < 16; index++) {
      if (index <= 7) {
        //p1 Actors
        this.p1ActorTokens.push(
          new Actor({
            name: "token",
            width: 80,
            height: 80,
            pos: p1StartingPostionVectors[index],
            color: Color.Transparent,
            z: 3,
          })
        );
      } else {
        //p2 Actors
        this.p2ActorTokens.push(
          new Actor({
            name: "token",
            width: 80,
            height: 80,
            pos: p2StartingPostionVectors[index - 8],
            color: Color.Transparent,
            z: 3,
          })
        );
      }
      this.boardSpots.push(
        new Actor({
          name: "hole",
          width: 80,
          height: 80,
          pos: boardPositions[index],
          color: Color.Transparent,
          z: 2,
        })
      );
    }
    //create board actor
    this.boardActor = new Actor({
      name: "board",
      width: 500,
      height: 500,
      pos: boardPosition,
      color: Color.Transparent,
      z: 1,
    });

    //assign shaders to actors
    this.p1ActorTokens.forEach((act, ind) => (act.graphics.material = this.listOfP1StarShaderMaterials[ind]));
    this.p2ActorTokens.forEach((act, ind) => (act.graphics.material = this.listOfP2StarShaderMaterials[ind]));
    //@ts-ignore
    this.boardSpots.forEach((act, ind) => (act.graphics.material = this.listOfBoardSpotShadermaterials[ind]));
    this.boardActor.graphics.material = this.boardMaterial;

    //set uniforms
    this.p1ActorTokens.forEach(act =>
      act.graphics.material?.update(shader => {
        shader.setUniformFloatVector("U_resolution", new Vector(500, 500));
        shader.setUniform("uniform3f", "U_color", 0.75, 0.2, 0.2);
        shader.setUniformBoolean("U_highlight", false);
      })
    );
    this.p2ActorTokens.forEach(act =>
      act.graphics.material?.update(shader => {
        shader.setUniformFloatVector("U_resolution", new Vector(500, 500));
        shader.setUniform("uniform3f", "U_color", 0.2, 0.2, 0.8);
        shader.setUniformBoolean("U_highlight", false);
      })
    );
    this.boardSpots.forEach(act => {
      act.graphics.material?.update(shader => {
        shader.setUniformBoolean("U_highlighted", true);
        shader.setUniformFloat("u_opacity", 1.0);
      });
    });
    this.boardActor.graphics.material.update(shader => {
      shader.setUniformFloatVector("U_resolution", new Vector(800, 800));
    });

    this.p1ActorTokens.forEach((act, ind: number) => {
      act.on("pointerenter", () => {
        console.log("in");

        this.p1Hoverstates[ind] = true;
      });
      act.on("pointerleave", () => {
        console.log("out");
        this.p1Hoverstates[ind] = false;
      });
    });
    this.p2ActorTokens.forEach((act, ind: number) => {
      act.on("pointerenter", () => {
        console.log("in");

        this.p2Hoverstates[ind] = true;
      });
      act.on("pointerleave", () => {
        console.log("out");
        this.p2Hoverstates[ind] = false;
      });
    });

    //add actors to scene
    console.log(this.boardSpots);
    console.log(this.listOfBoardSpotShadermaterials);

    this.p1ActorTokens.forEach(act => this.add(act));
    this.p2ActorTokens.forEach(act => this.add(act));
    this.boardSpots.forEach(act => {
      this.add(act);
      act.graphics.opacity = 0;
    });

    this.add(this.boardActor);

    setTimeout(() => {
      showToast(this, 4000);
    }, 3000);
  }

  async onDeactivate(ctx: SceneActivationContext<undefined>): Promise<void> {
    console.log("leaving game");
    if (this.SceneView) this.SceneView.destroy();
    await waitSomeTime(1000);
  }

  leaveGame = async () => {
    await MP_Connection.leaveRoom();
    game.goto("lobby", { sceneActivationData: { time: this._time } });
  };

  onPreUpdate(engine: Engine, delta: number): void {
    this._time += delta / 1000;

    (this._starfieldActor as Actor).graphics.material?.update(shader => {
      shader.setUniformFloat("U_time", this._time);
    });
    this.p1ActorTokens.forEach(act => act.graphics.material?.update(shader => shader.setUniformFloat("U_time", this._time)));
    this.p2ActorTokens.forEach(act => act.graphics.material?.update(shader => shader.setUniformFloat("U_time", this._time)));
    this.boardSpots.forEach(act => act.graphics.material?.update(shader => shader.setUniformFloat("U_time", this._time)));
    this.boardActor.graphics.material?.update(shader => shader.setUniformFloat("U_time", this._time));
    let hoverstate = this.p1HoverStates;
  }
}

export function updateHathoraState(serverState: any) {
  state = JSON.parse(JSON.stringify(serverState));
}

function fadeIn(act: Actor, time: number) {
  let handler = setInterval(() => {
    if (act.graphics.opacity >= 1) {
      act.graphics.opacity = 1;
      clearInterval(handler);
      return;
    }
    act.graphics.opacity += 0.01;
  }, time / 100);
}

function fadeOut(act: Actor, time: number) {
  let handler = setInterval(() => {
    if (act.graphics.opacity <= 0) {
      act.graphics.opacity = 0;
      clearInterval(handler);
      return;
    }
    act.graphics.opacity -= 0.01;
  }, time / 100);
}

function showToast(element: Scene, duration: number) {
  //@ts-ignore
  element.showToast = true;
  setTimeout(() => {
    //@ts-ignore
    element.showToast = false;
  }, duration);
}
