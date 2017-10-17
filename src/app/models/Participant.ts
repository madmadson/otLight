



export interface Participant {
  id?: string;
  name: string;
  location?: string;

  opponentParticipantsNames: string[];
  roundScores: number[];

  MainFaction?: string;
  ArmyLists?: string[];
}


export function getParticipantForJSON(id: string, json: any): Participant {
  return {
    id: id,
    name: json.name,
    location: json.location ? json.location : '',

    opponentParticipantsNames: json.opponentParticipantsNames ? json.opponentParticipantsNames : [],
    roundScores: json.roundScores ? json.roundScores : [],

    MainFaction: json.MainFaction ? json.MainFaction : '',
    ArmyLists: json.ArmyLists ? json.ArmyLists : [],
  };
}
