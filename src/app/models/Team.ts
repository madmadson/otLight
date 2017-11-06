


export interface Team {
  id?: string;
  name: string;
  location?: string;

  opponentTeamNames: string[];
  roundScores: number[];

  // TEAM
  sgw: number[];

  // WARMACHINE
  cp?: number[];
  vp?: number[];

  // JUDGEMENT
  levels?: number[];
  souls?: number[];
}


export function getTeamForJSON(id: string, json: any): Team {
  return {
    id: id,
    name: json.name,
    location: json.location ? json.location : '',

    sgw: json.sgw ? json.sgw : [0],
    opponentTeamNames: json.opponentTeamNames ? json.opponentTeamNames : [],
    roundScores: json.roundScores ? json.roundScores : [],
  };
}
