


import {AllGameSystems} from "./game-systems";

export interface Player {
  id?: string;
  name: string;
  gameSystems: AllGameSystems;
  password?: string;

}
