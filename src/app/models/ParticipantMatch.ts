import {Participant} from "./Participant";

export interface ParticipantMatch {

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
  warbandParticipantOne?: string[];
  soulsParticipantTwo?: number;
  levelsParticipantTwo?: number;
  warbandParticipantTwo?: string[];

  // Malifaux
  mfDiffParticipantOne?: number;
  mfVpParticipantOne?: number;
  mfDiffParticipantTwo?: number;
  mfVpParticipantTwo?: number;

  result: string;
  finished: boolean;
  matchDate: Date;
}

export function getParticipantMatchForJSON(id: string, json: any): ParticipantMatch {
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

export function createEmptyParticipantMatch(round: number, participant1: Participant, participant2: Participant) {

  return {
    round: round,
    participantOne: participant1,
    participantTwo: participant2,
    table: 0,
    scoreParticipantOne: 0,
    scoreParticipantTwo: 0,
    result: '',
    finished: false,
    matchDate: new Date(),
  };
}
