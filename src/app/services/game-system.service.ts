import {Injectable} from '@angular/core';
import {Observable} from "rxjs/Observable";
import {Subject} from "rxjs/Subject";

@Injectable()
export class GameSystemService {

  private stream: Subject<String>;

  constructor() {

     this.stream = new Subject<String>();
  }


  getGameSystem(): Observable<string> {

    return this.stream;
  }

  setGameSystem(gameSystem: string) {


    this.stream.next(gameSystem);
  }

}
