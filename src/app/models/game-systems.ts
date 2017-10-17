import {SelectItem} from "primeng/primeng";
import {getWmHoFieldConfig} from "./game-systems/WmHo";
import {Participant} from "./Participant";

import * as _ from 'lodash';

export function getGameSystemsAsSelectItems(): SelectItem[] {
  return [{
    value: 'WmHo', label: 'WmHo'
  }, {
    value: 'GuildBall', label: 'GuildBall'
  }, {
    value: 'Judgement', label: 'Judgement'
  }];
}
export function getGameSystems(): string[] {
  return ['WmHo', 'GuildBall', 'Judgement'];
}


export interface AllGameSystems {
  WmHo: boolean;
  GuildBall: boolean;
  Judgement: boolean;
}

export interface GameSystemConfig {
  playerFields: FieldValues[];
  participantFields: FieldValues[];
}
export interface FieldValues {
  type: string;
  field: string;
  fieldValues: SelectItem[];
}

export function getGameSystemConfig(gameSystem: string): GameSystemConfig {

  if (gameSystem === 'WmHo') {
    return getWmHoFieldConfig();
  } else {
    return {
      participantFields: [],
      playerFields: []
    };
  }
}

export function orderParticipantsForGameSystem(gameSystem: string, participants: Participant[]): Participant[] {

  if (gameSystem === 'WmHo') {
    return _.orderBy(participants, ['score'], ['desc']);
  } else {
    return _.orderBy(participants, ['score'], ['desc']);
  }
}

export function getScoreByGameSystem(gameSystem: string): number {

  if (gameSystem === 'WmHo') {
    return 1;
  } else {
    return 1;
  }
}


