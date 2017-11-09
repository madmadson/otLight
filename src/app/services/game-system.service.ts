import {Injectable} from '@angular/core';
import {Subject} from "rxjs/Subject";
import {getGameSystems} from "../models/game-systems";


@Injectable()
export class GameSystemService {

  private gameSystemStream: Subject<string>;
  private gameSystem: string;
  private allGameSystems: string[];

  constructor() {

    this.allGameSystems = getGameSystems();

     this.gameSystemStream = new Subject<string>();
  }

  getGameSystem(): string {
    return this.gameSystem ? this.gameSystem : this.allGameSystems[0];
  }


  getGameSystemAsStream(): Subject<string> {

    return this.gameSystemStream;
  }

  setGameSystem(gameSystem: string) {

    this.gameSystem = gameSystem;

    this.gameSystemStream.next(gameSystem);
  }

}
