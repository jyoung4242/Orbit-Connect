import { Engine, Scene, SceneActivationContext } from "excalibur";
import { version, MP_Connection, game, UIstate, starfeild } from "../main";
import { UI, UIView } from "@peasy-lib/peasy-ui";
import { setState } from "./Game";

//@ts-ignore
import settings from "../assets/settings.svg";
//@ts-ignore
import access from "../assets/access.svg";
//@ts-ignore
import help from "../assets/help.svg";
//@ts-ignore
import spinner from "../assets/spinner.svg";

export class Login extends Scene {
  _time: number = 0;
  version = version;
  showSpinner: boolean = false;
  isShowSettings: boolean = false;
  isShowAccess: boolean = false;
  isShowTutorial: boolean = false;
  isShowBlur = false;

  showSettings = () => {
    this.isShowSettings = true;
    this.isShowBlur = true;
  };
  showAccess = () => {
    this.isShowAccess = true;
    this.isShowBlur = true;
  };
  showTutorial = () => {
    this.isShowTutorial = true;
    this.isShowBlur = true;
  };

  closeTutorial = () => {
    this.isShowTutorial = false;
    this.isShowBlur = false;
  };
  closeAccess = () => {
    this.isShowAccess = false;
    this.isShowBlur = false;
  };
  closeSettings = () => {
    this.isShowSettings = false;
    this.isShowBlur = false;
  };

  get pointerStyle() {
    if (this.isShowBlur) return "none";
    else return "auto";
  }

  showActiveSession: boolean = false;
  nickname: undefined | HTMLInputElement;
  activeSessionString = "";

  resetSession = () => {
    sessionStorage.removeItem("token");
    this.showActiveSession = false;
    let activeSession = MP_Connection?.checkForActiveToken();
    if (activeSession) {
      this.showActiveSession = true;
      //@ts-ignore
      if (activeSession.type == "anonymous") {
        this.activeSessionString = `Anonymous Active Session`;
      } else {
        //@ts-ignore
        this.activeSessionString = `Active Session created by ${activeSession.name}`;
      }
    }
  };
  login = async (name?: string): Promise<boolean> => {
    console.log(name);

    let user;
    if (name) {
      user = await MP_Connection.login(name);
    } else {
      user = await MP_Connection.login();
    }

    if (user.userdata && user.token && user.token != "" && user.userdata.id != "" && user.userdata.name) {
      setState({ id: user.userdata.id, nickname: user.userdata.name, token: user.token });
      return true;
    }

    return false;
  };
  loginEvent = async () => {
    this.showSpinner = true;
    this.isShowBlur = true;
    let loginResult;
    loginResult = await this.login(this.nickname?.value);

    if (loginResult) {
      game.goto("lobby", { sceneActivationData: { time: this._time } });
    }
  };

  public template = `
      <style>
        
  
        .layer.hud{
          z-index: 1;
        }
  
        .title{
          font-family: hero;
          font-size: 3vw;
          width: 70%;
          text-align: center;
        }
  
  
        .loginButton{
          font-family: subtext;
          font-size: 1.2vw;
          border: 1px solid whitesmoke;
          border-radius: 5000px;
          width: 30%;
          display: flex;
          justify-content: center;
          align-items: center;
          transform: scale(1);
          padding: 3px;
          cursor: pointer;
          transition: width 0.4s ;
          background-color: transparent;
          color: whitesmoke;
          pointer-events: auto;
        }
  
        .loginButton:hover{
          background-color: whitesmoke;
          color: #222222;
          width: 38%;
          cursor: url("/src/assets/bhole_icon.png"), pointer;
        }
  
        .nicknamecontainer{
          border: 1px solid whitesmoke;
          border-radius: 5px;
          width: 50%;
          display: flex;
          justify-content: space-evenly;
          align-items: center;
          padding: 3px;
        }
  
        .loginNickName{
          font-family: subtext;
          border: 1px solid whitesmoke;
          border-radius: 5px;
          width: 50%;
          font-size: 1.2vw;
          text-align: center;
          pointer-events: auto;
        }
  
        .loginNickNameLabel{
          font-family: subtext;
          font-size: 1.2vw;
        }
  
        .settings{
          background-color: transparent;
          border: none;
          position: fixed;
          top: 1%;
          left: 1%;
          background-image: url(${settings});
          background-size: contain;
          background-repeat: no-repeat;
          width: 2%;
          aspect-ratio: 1/1;
          color: whitesmoke;
          z-index: 4;
          cursor: pointer;
          transform: scale(1);
          transition: transform 0.4s;
          pointer-events: \${pointerStyle};
        }
  
        .settings:hover{
          transform: scale(1.25);
          cursor: url("/src/assets/bhole_icon.png"), pointer;
        }
  
        .accessibility{
          background-color: transparent;
          border: none;
          position: fixed;
          top: 6%;
          left: 1%;
          background-image: url(${access});
          background-size: contain;
          background-repeat: no-repeat;
          width: 2%;
          aspect-ratio: 1/1;
          color: whitesmoke;
          cursor: pointer;
          transform: scale(1);
          transition: transform 0.4s;
          pointer-events: \${pointerStyle};
        }
        .accessibility:hover{
          transform: scale(1.25);
          cursor: url("/src/assets/bhole_icon.png"), pointer;
        }
        .help{
          background-color: transparent;
          border: none;
          position: fixed;
          top: 11%;
          left: 1%;
          background-image: url(${help});
          background-size: contain;
          background-repeat: no-repeat;
          width: 2%;
          aspect-ratio: 1/1;
          color: whitesmoke;
          cursor: pointer;
          transform: scale(1);
          transition: transform 0.4s;
          pointer-events: \${pointerStyle};
        }
        .help:hover{
          transform: scale(1.25);
          cursor: url("/src/assets/bhole_icon.png"), pointer;
        }
  
        .sessiontext{
          display:flex;
          justify-content: flex-start;
          align-items: center;
          position: fixed;
          bottom: 0px;
          left: 3px;
          width: 60%;
          color: whitesmoke;
          font-size: xx-small;
          flex-wrap: no-wrap;
          pointer-events: auto;
          gap: 10px;
        }
  
        .resetButton{
          bottom: 0px;
          color: whitesmoke;
          font-size: xx-small;
          background-color: transparent;
          border: none;
          text-decoration: underline;
          cursor: url("/src/assets/bhole_icon.png"), pointer;
        }

        .resetButton:hover{
          transform: scale(1.25);
          cursor: url("/src/assets/bhole_icon.png"), pointer;
        }
  
        wait-spinner{
          width: 5%;
          aspect-ratio: 1/1;
          position: fixed;
          z-index: 99999;
          background-image: url(${spinner});
          background-repeat: no-repeat;
          background-size: cover;
          left: 50%;
          top: 50%;
          transform: translate(-50%,-50%);
        }
  
  
        version-text {
          font-family: subtext;
          position: fixed;
          bottom: 1%;
          right: 1%;
          font-size: xx-small;
          color: whitesmoke;
        }
  
        settings-modal,accessibility-modal,tutorial-modal{
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%,-50%);
          width: 80%;
          height: 80%;
          border: 2px solid whitesmoke;
          border-radius: 10px;
          background-color: black;
          z-index: 11;
        }
  
        settings-modal>header,accessibility-modal>header,tutorial-modal>header{
          position: fixed;
          top: 3%;
          left: 50%;
          transform: translateX(-50%);  
          font-size: 2vw;
          font-family: hero;
        }
    
        .blur {
          filter: blur(3px);
        }
        
        blur-layer {
          position: fixed;
          display: block;
          width: 100%;
          height: 100%;
          background-color: #000000bb;
          z-index: 10;
        }
  
        .closeButton{
          position: fixed;
          bottom: 1%;
          left: 50%;
          transform: translateX(-50%);   
          font-family: subtext;     
        }
  
      </style>
      <scene-layer class="normCursor">
        <button class="settings" title="SETTINGS" \${click@=>showSettings}></button>
        <button class="accessibility" title="ACCESSIBILITY" \${click@=>showAccess}></button>
        <button class="help" title="TUTORIAL"  \${click@=>showTutorial}></button>
        <version-text>Version \${version }</version-text>
        <div class="title">ORBIT CONNECT</div>
        <div class="nicknamecontainer">
          <label class="loginNickNameLabel" title="NICKNAME">Nickname (optional)</label>
          <input \${==>nickname} type='text' class="loginNickName" placeholder="anonymous" title="NICKNAME"\${keydown@=>checkEnter}/>
        </div>
       <button class="loginButton" title="LOGIN" \${click@=>loginEvent}>LOGIN</button>
       <active-session \${===showActiveSession} class="sessiontext">
          \${activeSessionString}
          <button class="resetButton" \${click@=>resetSession}>Reset Session</button>
       </active-session>
       <blur-layer \${===isShowBlur}></blur-layer>
       <wait-spinner  \${===showSpinner}></wait-spinner>
       <settings-modal \${===isShowSettings}>
          <header>SETTINGS</header>
          <button class="loginButton closeButton" title="CLOSE SETTINGS" \${click@=>closeSettings}>CLOSE</button>
       </settings-modal>
       <accessibility-modal \${===isShowAccess}>
          <header>ACCESSIBILITY</header>
          <button class="loginButton closeButton" title="CLOSE ACCESSIBILITY" \${click@=>closeAccess}>CLOSE</button>
       </accessibility-modal>
       <tutorial-modal \${===isShowTutorial}>
          <header>TUTORIAL</header>
          <button class="loginButton closeButton" title="CLOSE TUTORIAL" \${click@=>closeTutorial}>CLOSE</button>
       </tutorial-modal>
  
      </scene-layer>
  `;
  SceneView: UIView | undefined;

  onActivate(ctx: SceneActivationContext<unknown>): void {
    console.log(ctx);

    this._time = (ctx.data as { time: number }).time as number;
    console.log("in login");
    this.SceneView = UI.create(UIstate.hudLayer, this, this.template);

    let activeSession = MP_Connection.checkForActiveToken();
    if (activeSession) {
      this.showActiveSession = true;
      //@ts-ignore
      if (activeSession.type == "anonymous") {
        this.activeSessionString = `Anonymous Active Session`;
      } else {
        //@ts-ignore
        this.activeSessionString = `Active Session created by ${activeSession.name}`;
      }
    }
  }

  async onDeactivate(ctx: SceneActivationContext<undefined>): Promise<void> {
    return new Promise(async resolve => {
      console.log("leaving login");
      if (this.SceneView) {
        this.SceneView.destroy();
        await this.SceneView.detached;
        resolve();
      }
    });
  }

  onPreUpdate(engine: Engine, delta: number): void {
    this._time += delta / 1000;
    starfeild.getShader().use();
    starfeild.getShader().setUniformFloat("U_time", this._time);
  }
}
