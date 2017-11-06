


import {AllGameSystems} from "./game-systems";

export interface Player {
  id?: string;
  name: string;
  location: string;
  team: string;
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
    team: json.team ? json.team : '',
    gameSystems: json.gameSystems ? json.gameSystems : [],
    password: json.password ? json.password : '',
  };
}
