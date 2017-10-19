


export interface Participant {
  id?: string;
  name: string;
  location?: string;
  type: string;

  opponentParticipantsNames: string[];
  opponentParticipantsIds: string[];
  roundScores: number[];

  // WARMACHINE
  sgw?: number[];
  sos?: number[];
  cp?: number[];
  vp?: number[];

  MainFaction?: string;
  ArmyLists?: string[];
}


export function getParticipantForJSON(id: string, json: any): Participant {
  return {
    id: id,
    name: json.name,
    location: json.location ? json.location : '',
    type: json.type ? json.type : '',

    opponentParticipantsNames: json.opponentParticipantsNames ? json.opponentParticipantsNames : [],
    opponentParticipantsIds: json.opponentParticipantsIds ? json.opponentParticipantsIds : [],
    roundScores: json.roundScores ? json.roundScores : [],
  };
}
