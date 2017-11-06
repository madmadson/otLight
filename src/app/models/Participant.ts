


export interface Participant {
  id?: string;
  name: string;
  location?: string;
  team?: string;

  opponentParticipantsNames: string[];
  roundScores: number[];

  // WARMACHINE
  cp?: number[];
  vp?: number[];
  MainFaction?: string;
  ArmyLists?: string[];

  // JUDGEMENT
  levels?: number[];
  souls?: number[];
  Warband?: string[];
}


export function getParticipantForJSON(id: string, json: any): Participant {
  return {
    id: id,
    name: json.name,
    location: json.location ? json.location : '',
    team: json.team ? json.team : '',

    opponentParticipantsNames: json.opponentParticipantsNames ? json.opponentParticipantsNames : [],
    roundScores: json.roundScores ? json.roundScores : [],
  };
}
