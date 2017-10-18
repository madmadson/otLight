


export interface Participant {
  id?: string;
  name: string;
  location?: string;
  type: string;

  opponentParticipantsNames: string[];
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
    roundScores: json.roundScores ? json.roundScores : [],

    sgw: json.sgw ? json.sgw : [],
    sos: json.sos ? json.sos : [],
    cp: json.cp ? json.cp : [],
    vp: json.vp ? json.vp : [],

    MainFaction: json.MainFaction ? json.MainFaction : '',
    ArmyLists: json.ArmyLists ? json.ArmyLists : [],
  };
}
