import {FieldValues, GameSystemConfig} from "./game-systems";
import * as _ from 'lodash';
import {SelectItem} from "primeng/primeng";

export interface Participant {
  id?: string;
  name: string;
  location?: string;
  team?: string;
  droppedInRound: number;

  opponentParticipantsNames: string[];
  roundScores: number[];

  // WARMACHINE
  cp?: number[];
  vp?: number[];
  MainFaction?: string;
  ArmyLists?: string[];

  // JUDGEMENT
  levels?: number[];
  souls?: number[];
  Warband?: string[];

  // Malifaux
  mfDiff?: number[];
  mfVp?: number[];
  MfFaction?: string[];

  // GuildBall
  gbVp?: number[];
  gbFaction?: string[];

  // XWing
  mov?: number[];
  xwFaction?: string[];
}


export function getParticipantForJSON(id: string, json: any, gameSystemConfig: GameSystemConfig): Participant {

  const participant: Participant = {
    id: id,
    name: json.name,
    location: json.location ? json.location : '',
    team: json.team ? json.team : '',
    droppedInRound: json.droppedInRound ? json.droppedInRound : 0,

    opponentParticipantsNames: json.opponentParticipantsNames ? json.opponentParticipantsNames : [],
    roundScores: json.roundScores ? json.roundScores : [],
  };

  _.forEach(gameSystemConfig.participantFields, function (playerField: FieldValues) {
    participant[playerField.field] = json[playerField.field] ?
      json[playerField.field] : playerField.defaultValue;
  });

  _.forEach(gameSystemConfig.standingFields, function (standingValue: FieldValues) {
    participant[standingValue.field] = json[standingValue.field] ?
      json[standingValue.field] : [standingValue.defaultValue];
  });

  _.forEach(gameSystemConfig.choosePlayed, function (standingValue: FieldValues) {
    participant[standingValue.field] = json[standingValue.field] ?
      json[standingValue.field] : [standingValue.defaultValue];
  });

  return participant;
}
