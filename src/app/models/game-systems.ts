import {SelectItem} from "primeng/primeng";
import {getWmHoFieldConfig} from "./game-systems/WmHo";
import {Participant} from "./Participant";

import * as _ from 'lodash';
import {Tournament} from "./Tournament";

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
  scoreFields: FieldValues[];
  standingFields: FieldValues[];
}
export interface FieldValues {
  type: string;
  field: string;
  fieldPlayerOne?: string;
  fieldPlayerTwo?: string;
  fieldValues?: SelectItem[];
  min?: number;
  max?: number;
}

export function getGameSystemConfig(system: string, tournamentType: string): GameSystemConfig {

  if (system === 'WmHo') {
    return getWmHoFieldConfig(tournamentType);
  } else {
    return {
      participantFields: [],
      playerFields: [],
      scoreFields: [],
      standingFields: [],
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

/**
 * first win score, second loose score, third draw
 *
 * @param {string} gameSystem
 * @returns {number[]}
 */
export function getScoreByGameSystem(gameSystem: string): number[] {

  if (gameSystem === 'WmHo') {
    return [1, 0, 0];
  } else {
    return [1, 0, 0];
  }
}


