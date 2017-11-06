import {Team} from "./Team";

export interface TeamMatch {

  id?: string;
  round: number;

  teamOne: Team;
  teamTwo: Team;

  section: number;

  scoreTeamOne: number;
  scoreTeamTwo: number;

  // WARMACHINE
  cpParticipantOne?: number;
  vpParticipantOne?: number;
  cpParticipantTwo?: number;
  vpParticipantTwo?: number;

  // JUDGEMENT
  soulsParticipantOne?: number;
  levelsParticipantOne?: number;
  soulsParticipantTwo?: number;
  levelsParticipantTwo?: number;

  result: string;
  finished: boolean;
  matchDate: Date;
}

export function getRoundMatchForJSON(id: string, json: any): TeamMatch {
  return {
    id: id,
    round: json.round,

    teamOne: json.teamOne,
    teamTwo: json.teamOne,

    section: json.section ? json.section : 0,

    scoreTeamOne: json.scoreTeamOne ? json.scoreTeamOne : 0,
    scoreTeamTwo: json.scoreTeamTwo ? json.scoreTeamTwo : 0,

    result: json.result ? json.result : '',
    finished: json.finished ? json.finished : false,

    matchDate: json.matchDate ? json.matchDate : new Date(),
  };
}
