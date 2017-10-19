

import {Participant} from "./Participant";

export interface RoundMatch {

  id?: string;
  round: number;

  participantOne: Participant;
  participantTwo: Participant;

  scoreParticipantOne: number;
  scoreParticipantTwo: number;

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
}

export function getRoundMatchForJSON(id: string, json: any): RoundMatch {
  return {
    id: id,
    round: json.round,

    participantOne: json.participantOne,
    participantTwo: json.participantTwo,

    scoreParticipantOne: json.scoreParticipantOne,
    scoreParticipantTwo: json.scoreParticipantTwo,

    result: json.result ? json.result : '',
    finished: json.finished ? json.finished : false
  };
}
