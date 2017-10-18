

import {Participant} from "./Participant";

export interface RoundMatch {

  id?: string;
  round: number;

  participantOne: Participant;
  participantTwo: Participant;

  scoreParticipantOne: number;

  cpParticipantOne?: number;
  vpParticipantOne?: number;

  scoreParticipantTwo: number;

  cpParticipantTwo?: number;
  vpParticipantTwo?: number;

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

    // WARMACHINE
    cpParticipantOne: json.cpParticipantOne ? json.cpParticipantOne : 0,
    vpParticipantOne: json.vpParticipantOne ? json.vpParticipantOne : 0,

    scoreParticipantTwo: json.scoreParticipantTwo,

    // WARMACHINE
    cpParticipantTwo: json.cpParticipantTwo ? json.cpParticipantTwo : 0,
    vpParticipantTwo: json.vpParticipantTwo ? json.vpParticipantTwo : 0,

    result: json.result ? json.result : '',
    finished: json.finished ? json.finished : false
  };
}
