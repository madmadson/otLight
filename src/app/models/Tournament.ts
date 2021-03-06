


export interface Tournament {
  id?: string;
  name: string;
  gameSystem: string;
  type: string;
  password?: string;
  actualRound: number;
  publishedRound: number;
  state: string;
  teamSize?: number;
}

export function getTournamentForJSON(id: string, json: any): Tournament {
  return {
    id: id,
    name: json.name,
    gameSystem: json.gameSystem,
    type: json.type,
    password: json.password ? json.password : '',
    actualRound: json.actualRound ? json.actualRound : 0,
    publishedRound: json.publishedRound ? json.publishedRound : 0,
    state: json.state ? json.state : 'CREATED',
    teamSize: json.teamSize ? parseInt(json.teamSize, 10) : 3
  };
}
