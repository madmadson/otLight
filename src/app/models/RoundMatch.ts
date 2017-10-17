

import {Participant} from "./Participant";

export interface RoundMatch {
  id?: string;
  round: number;

  participantOne: Participant;
  participantTwo: Participant;

  scoreParticipantOne: number;

  scoreParticipantTwo: number;

}

export function getRoundMatchForJSON(id: string, json: any): RoundMatch {
  return {
    id: id,
    round: json.round,

    participantOne: json.participantOne,
    participantTwo: json.participantTwo,

    scoreParticipantOne: json.scoreParticipantOne,

    scoreParticipantTwo: json.scoreParticipantTwo,
  };
}
