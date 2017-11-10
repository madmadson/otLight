import {Team} from "./Team";
import {ParticipantMatch} from "./ParticipantMatch";

export interface TeamMatch {

  id?: string;
  round: number;

  teamOne: Team;
  teamTwo: Team;

  participantMatches?: ParticipantMatch[];

  section: number;

  scoreTeamOne: number;
  scoreTeamTwo: number;

  sgwTeamOne: number;
  sgwTeamTwo: number;

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
  finishedParticipantGames: number;
  matchDate: Date;
}

export function getTeamMatchForJSON(id: string, json: any): TeamMatch {
  return {
    id: id,
    round: json.round,

    teamOne: json.teamOne,
    teamTwo: json.teamTwo,

    participantMatches: json.participantMatches ? json.participantMatches : [],

    section: json.section ? json.section : 0,

    scoreTeamOne: json.scoreTeamOne ? json.scoreTeamOne : 0,
    scoreTeamTwo: json.scoreTeamTwo ? json.scoreTeamTwo : 0,

    sgwTeamOne: json.sgwTeamOne ? json.sgwTeamOne : 0,
    sgwTeamTwo: json.sgwTeamTwo ? json.sgwTeamTwo : 0,

    result: json.result ? json.result : '',
    finished: json.finished ? json.finished : false,
    finishedParticipantGames: json.finishedParticipantGames ? json.finishedParticipantGames : 0,

    matchDate: json.matchDate ? json.matchDate : new Date(),
  };
}

export enum TeamMatchResult {
  teamOneWin = 't1',
  teamTwoWin = 't2',
  draw = 'draw',

}
