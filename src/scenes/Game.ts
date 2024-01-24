import { Actor, Color, Engine, ImageSource, Material, Scene, SceneActivationContext, Vector } from "excalibur";
import { UIstate, starfeild, game, MP_Client, MP_Connection } from "../main";
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
  new Vector(50, 50),
  new Vector(50, 80),
  new Vector(50, 110),
  new Vector(50, 140),
  new Vector(50, 170),
  new Vector(50, 200),
  new Vector(50, 230),
];

const p2StartingPostionVectors = [
  new Vector(500, 50),
  new Vector(500, 80),
  new Vector(500, 110),
  new Vector(500, 140),
  new Vector(500, 170),
  new Vector(500, 200),
  new Vector(500, 230),
];

const boardPositions = [
  new Vector(200, 175),
  new Vector(275, 175),
  new Vector(350, 175),
  new Vector(425, 175),
  new Vector(200, 250),
  new Vector(275, 250),
  new Vector(350, 250),
  new Vector(425, 250),
  new Vector(200, 325),
  new Vector(275, 325),
  new Vector(350, 325),
  new Vector(425, 325),
  new Vector(200, 400),
  new Vector(275, 400),
  new Vector(350, 400),
  new Vector(425, 400),
];

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
  player1Name = "Larry";
  player2Name = "Robert";
  showWaiting = true;
  showConfirm = false;
  showToast = false;
  showTimerWarning = false;
  playerIdentifier = "player1";
  turnIdentifier = "player1";
  blur = "";

  // ******************** */
  // Excalibur Data ***** */
  // ******************** */
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

  async onActivate(ctx: SceneActivationContext<unknown>): Promise<void> {
    this._time = (ctx.data as { time: number }).time as number;
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
            z: 2,
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
            z: 2,
          })
        );
      }
      this.boardSpots.push(
        new Actor({
          name: "hole",
          width: 100,
          height: 100,
          pos: boardPositions[index],
          color: Color.Transparent,
          z: 2,
        })
      );
    }
    //create board actor
    this.boardActor = new Actor({
      name: "board",
      width: 300,
      height: 300,
      pos: new Vector(200, 100),
      color: Color.Transparent,
      z: 1,
    });

    //assign shaders to actors
    this.p1ActorTokens.forEach((act, ind) => (act.graphics.material = this.listOfP1StarShaderMaterials[ind]));
    this.p2ActorTokens.forEach((act, ind) => (act.graphics.material = this.listOfP2StarShaderMaterials[ind]));
    //@ts-ignore
    this.boardSpots.forEach((act, ind) => (act.graphics.material = this.boardMaterial[ind]));
    this.boardActor.graphics.material = this.boardMaterial;

    console.log("adding actors");

    //add actors to scene
    this.p1ActorTokens.forEach(act => this.add(act));
    this.p2ActorTokens.forEach(act => this.add(act));
    this.boardSpots.forEach(act => this.add(act));
    this.add(this.boardActor);
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
    starfeild.getShader().use();
    starfeild.getShader().setUniformFloat("U_time", this._time);
  }
}

export function updateHathoraState(serverState: any) {
  state = JSON.parse(JSON.stringify(serverState));
}
