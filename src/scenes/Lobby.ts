import { Actor, Engine, Scene, SceneActivationContext } from "excalibur";
import { UIstate, MP_Connection, game } from "../main";
import { UI, UIView } from "@peasy-lib/peasy-ui";
import { waitSomeTime } from "../utils";
import { LobbyVisibility, Region } from "@hathora/cloud-sdk-typescript/dist/sdk/models/shared";
import { UserData } from "../Multiplayer";
import { LobbyStatus } from "../types";

//@ts-ignore
import spinner from "../assets/spinner.svg";

type mySceneContext = {
  time: number;
  engine: Engine;
  w: number;
  h: number;
  starfield: Actor;
};

export class Lobby extends Scene {
  _time: number = 0;
  _starfieldActor: Actor | undefined;
  directPublicID: string = "";
  lobbyInterval: NodeJS.Timeout | null | undefined;
  userdata: UserData = {
    id: "",
    name: "",
  };
  openMatches: any[] = [];
  serverDropdown: HTMLInputElement | undefined;
  localMatches: any[] = [];
  privateGames: any[] = [];
  showSpinner = false;
  isShowBlur = false;

  createPublic = async () => {
    this.showSpinner = true;
    this.isShowBlur = true;
    if (MP_Connection.getServerScope() == LobbyVisibility.Local) {
      if (this.serverDropdown && this.serverDropdown?.value != undefined) {
        //@ts-ignore
        const roomid = await MP_Connection.createRoom(LobbyVisibility.Local, this.serverDropdown.value, { status: LobbyStatus.empty });
        this.localMatches.push({
          type: "local",
          id: roomid,
          status: LobbyStatus.empty,
          who: this.userdata.name ? this.userdata.name : this.userdata.id,
          when: new Date().toLocaleString("en-US"),
        });
      }
    } else {
      console.log("joining public lobby");
      //@ts-ignore
      await MP_Connection.createRoom(LobbyVisibility.Public, this.serverDropdown.value, { status: LobbyStatus.empty });
    }
    this.showSpinner = false;
    this.isShowBlur = false;
  };
  createPrivate = async () => {
    //ignore this if running locally
    if (MP_Connection.getServerScope() == LobbyVisibility.Local) return;
    this.showSpinner = true;
    this.isShowBlur = true;
    //@ts-ignore
    let privateGame = await MP_Connection.createRoom(LobbyVisibility.Private, this.serverDropdown.value, {
      status: LobbyStatus.empty,
    });
    let gameInfo;
    if (privateGame && typeof privateGame == "string") {
      gameInfo = await MP_Connection.getRoomInfo(privateGame);
    }
    this.showSpinner = false;
    this.isShowBlur = false;
    let status = JSON.parse(gameInfo.lobbyV3.roomConfig).status;
    let statusString;
    switch (status) {
      case 0:
        statusString = "empty";
        break;
      case 1:
        statusString = "waiting";
        break;
      case 2:
        statusString = "full";
        break;
    }
    this.privateGames.push({
      type: "private",
      status: statusString,
      id: gameInfo.lobbyV3.roomId,
      who: gameInfo.lobbyV3.createdBy,
      when: (gameInfo.lobbyV3.createdAt as Date).toLocaleDateString(),
    });
  };

  joinPublic = async (_e: any, m: any) => {
    this.showSpinner = true;
    this.isShowBlur = true;
    let roomToJoin = m.match.id;
    console.log("Joining Room", roomToJoin);
    await MP_Connection.enterRoom(roomToJoin);
    //goto game
    game.goto("game", { sceneActivationData: { time: this._time, starfield: this._starfieldActor } });
  };

  joinDirectPublic = async (_e: any, m: any) => {
    this.showSpinner = true;
    this.isShowBlur = true;
    let roomToJoin = this.directPublicID;
    console.log("Joining Room", roomToJoin);
    await MP_Connection.enterRoom(roomToJoin);
    game.goto("game", { sceneActivationData: { time: this._time, starfield: this._starfieldActor } });
  };

  servers = [];

  template = `
   <style>
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
   </style>
    <scene-layer>
        <blur-layer \${===isShowBlur}></blur-layer>
        <wait-spinner  \${===showSpinner}></wait-spinner>
        <div class="mygrid">
          <div class="titleblock">
            <div class="lobbytitle">ORBIT CONNECT</div>
            <div class="userdata">
              <div class="userid">
                UserID: \${userdata.id}
              </div>
              <div class="username">
                UserName: \${userdata.name}
              </div>
            </div>
          </div>
          <div class="matchesblock">
            <div class="matchestitle">
              MATCHES
              <div class="infoIcon" title="This section shows all active matches that one can join, if none available, you can create a new match to the right"></div>
            </div>
            <div class="matchesheader">
              <div>TYPE</div>
              <div style="display: flex; justify-content: center; align-items: flex-start; gap: 2px;">
                STATUS
                <div class="infoIcon" title="EMPTY = 0 players in room, WAITING = 1 player in room, FULL=2 players in room (can't be joined), AI=1 person playing single player mode"></div>
              </div>
              <div>ROOMID</div>
              <div>WHO</div>
              <div>DETAILS</div>
              <div>JOIN</div>
            </div>
            <div class="openMatches" >
              <div class="openMatch" \${match <=* openMatches:id}>
                <div class="matches_type">\${match.type}</div>
                <div class="matches_status">\${match.status}</div>
                <div class="matches_rid">\${match.id}</div>
                <div class="matches_creator">\${match.who}</div>
                <div class="matches_deets">\${match.when}</div>
                <button class="matches_join_button" \${click@=>joinPublic}>JOIN</button>
              </div>
            </div>
          </div>
          <div class="createblock">
            <div class="create_title">
              CREATE NEW MATCH
              <div class="infoIcon" title="This section lets you create a new match, all you need is to find the nearest server, and select PRIVATE or PUBLIC game"></div>
            </div>
            <div class="servers">
              <div class="create_title">Servers</div>
              <select class="serverdropdown" \${==>serverDropdown}>
                <option  class="serverdropdownOptions" \${serv<=*servers}>\${serv}</option>
              </select>
            </div>
            <div class="buttoncontainer">
              <button class="public matches_join_button" \${click@=>createPublic}>
                PUBLIC
                
              </button>
              <button class="private matches_join_button" \${click@=>createPrivate}>
                PRIVATE
                <div class="infoIcon" title="A Private Match only shows up for you in your client, you must share the roomID with a friend"></div>
              </button>
            </div>
            
          </div>
          <div class="joinblock">
            <div class="lobby_join_title">
              JOIN MATCH
              <div class="infoIcon" title="If you receive a private roomID from friend, you enter it here to join the match directly"></div>
            </div>
            <div class="matchInput_container">
              <input type="text" max="13" class="matchInput"/ \${value<=>directPublicID}>
              <button class="matchJoinButton matches_join_button " \${click@=>joinDirectPublic}>JOIN</button>
            </div>
          </div>

        </div>
    </scene-layer>
  `;

  SceneView: UIView | undefined;

  onActivate(ctx: SceneActivationContext<unknown>): void {
    this._time = (ctx.data as mySceneContext).time as number;
    this._starfieldActor = (ctx.data as mySceneContext).starfield;
    console.log("in lobby");

    this.add(this._starfieldActor);

    this.SceneView = UI.create(UIstate.hudLayer, this, this.template);
    this.servers = [];
    this.userdata = MP_Connection.userdata;
    Object.keys(Region).forEach((reg: string) => {
      //@ts-ignore
      return this.servers.push(reg);
    });
    setTimeout(() => {
      if (this.serverDropdown) this.serverDropdown.value = "Chicago";
    }, 25);

    if (MP_Connection.getServerScope() == LobbyVisibility.Local) this.lobbyInterval = setInterval(this.updateLobby, 1000);
    else this.lobbyInterval = setInterval(this.updateLobby, 2000);
  }

  async onDeactivate(ctx: SceneActivationContext<undefined>): Promise<void> {
    this.showSpinner = false;
    this.isShowBlur = false;
    return new Promise(async resolve => {
      console.log("leaving lobby");
      if (this.SceneView) {
        this.SceneView.destroy();
        await this.SceneView.detached;
        resolve();
      }
    });
  }

  onPreUpdate(engine: Engine<any>, delta: number): void {
    this._time += delta / 1000;

    (this._starfieldActor as Actor).graphics.material?.update(shader => {
      shader.setUniformFloat("U_time", this._time);
    });
  }

  updateLobby = async () => {
    //while local, just use window.localmatches

    if (MP_Connection.getServerScope() == LobbyVisibility.Local) {
      //update all local match lobby config
      for (const match of this.localMatches) {
        let rstl = await MP_Connection.getRoomInfo(match.id);
        let localRoomConfig = JSON.parse(rstl.lobbyV3.roomConfig);
        let statusString;
        switch (localRoomConfig.status) {
          case 0:
            statusString = "empty";
            break;
          case 1:
            statusString = "waiting";
            break;
          case 2:
            statusString = "full";
            break;
          case 3:
            statusString = "AI";
            break;
        }
        match.status = statusString;
      }

      this.openMatches = [...this.localMatches];
    } else {
      let lobbies = await MP_Connection.getPublicLobbies();
      if (lobbies && lobbies.classes) {
        this.openMatches = [];
        //load privates first
        this.openMatches = [...this.privateGames];

        //load publics
        lobbies.classes.map((match: any) => {
          let status = JSON.parse(match.roomConfig).status;
          console.log(status);

          let statusString;
          switch (status) {
            case 0:
              statusString = "empty";
              break;
            case 1:
              statusString = "waiting";
              break;
            case 2:
              statusString = "full";
              break;
          }
          this.openMatches.push({
            type: "public",
            status: statusString,
            id: match.roomId,
            who: match.createdBy,
            when: (match.createdAt as Date).toLocaleDateString(),
          });
        });
      }
      //console.log(this.openMatches);
    }
  };
}
