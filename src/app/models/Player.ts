


import {AllGameSystems} from "./game-systems";

export interface Player {
  id?: string;
  name: string;
  location: string;
  gameSystems: AllGameSystems;
  password?: string;

  MainFaction?: string;
  ArmyLists?: string[];

}
