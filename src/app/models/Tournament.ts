


export interface Tournament {
  id?: string;
  name: string;
  gameSystem: string;
  type: string;
  password?: string;
  actualRound: number;
  status: string;
}

export function getTournamentForJSON(id: string, json: any): Tournament {
  return {
    id: id,
    name: json.name,
    gameSystem: json.gameSystem,
    type: json.type,
    password: json.password ? json.password : '',
    actualRound: json.actualRound ? json.actualRound : 0,
    status: json.status ? json.status : 'CREATED',
  };
}
