


export interface Participant {
  id?: string;
  name: string;
  location?: string;
  type: string;

  opponentParticipantsNames: string[];
  roundScores: number[];

  // TEAM
  sgw?: number[];

  // WARMACHINE

  sos?: number[];
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
    type: json.type ? json.type : '',

    opponentParticipantsNames: json.opponentParticipantsNames ? json.opponentParticipantsNames : [],
    roundScores: json.roundScores ? json.roundScores : [],
  };
}
