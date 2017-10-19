


import {AllGameSystems} from "./game-systems";

export interface Player {
  id?: string;
  name: string;
  location: string;
  gameSystems: AllGameSystems;
  myGameSystems?: string[];
  password?: string;

  // WARMACHINE
  Faction?: string;
  ArmyLists?: string[];

}

export function getPlayerForJSON(id: string, json: any): Player {
  return {
    id: id,
    name: json.name,
    location: json.location ? json.location : '',
    gameSystems: json.gameSystems ? json.gameSystems : [],
    password: json.password ? json.password : '',
  };
}
