import {Participant} from "./Participant";

export interface RoundMatch {

  id?: string;
  round: number;

  participantOne: Participant;
  participantTwo: Participant;

  table: number;

  scoreParticipantOne: number;
  scoreParticipantTwo: number;

  // WARMACHINE
  cpParticipantOne?: number;
  vpParticipantOne?: number;
  cpParticipantTwo?: number;
  vpParticipantTwo?: number;
  armyListParticipantOne?: string;
  armyListParticipantTwo?: string;

  // JUDGEMENT
  soulsParticipantOne?: number;
  levelsParticipantOne?: number;
  soulsParticipantTwo?: number;
  levelsParticipantTwo?: number;
  warbandParticipantOne?: string[];
  warbandParticipantTwo?: string[];

  result: string;
  finished: boolean;
  matchDate: Date;
}

export function getRoundMatchForJSON(id: string, json: any): RoundMatch {
  return {
    id: id,
    round: json.round,

    participantOne: json.participantOne,
    participantTwo: json.participantTwo,

    table: json.table ? json.table : 0,

    scoreParticipantOne: json.scoreParticipantOne ? json.scoreParticipantOne : 0,
    scoreParticipantTwo: json.scoreParticipantTwo ? json.scoreParticipantTwo : 0,

    result: json.result ? json.result : '',
    finished: json.finished ? json.finished : false,

    matchDate: json.matchDate ? json.matchDate : new Date(),
  };
}
