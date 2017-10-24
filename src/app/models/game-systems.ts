import {SelectItem} from "primeng/primeng";
import {getWmHoFieldConfig} from "./game-systems/WmHo";
import {Participant} from "./Participant";

import * as _ from 'lodash';
import {Tournament} from "./Tournament";
import {getJudgementFieldConfig} from "./game-systems/Judgement";

export function getGameSystemsAsSelectItems(): SelectItem[] {
  return [{
    value: 'WmHo', label: 'WmHo'
  }, {
    value: 'GuildBall', label: 'GuildBall'
  }, {
    value: 'Judgement', label: 'Judgement'
  }, {
    value: 'XWing', label: 'XWing'
  }];
}
export function getGameSystems(): string[] {
  return ['WmHo', 'GuildBall', 'Judgement', 'XWing'];
}


export interface AllGameSystems {
  WmHo?: boolean;
  GuildBall?: boolean;
  Judgement?: boolean;
  XWing?: boolean;
}

export interface GameSystemConfig {
  playerFields: FieldValues[];
  participantFields: FieldValues[];
  scoreFields: FieldValues[];
  standingFields: FieldValues[];
}
export interface FieldValues {
  defaultValue: any;
  type: string;
  field: string;
  fieldPlayerOne?: string;
  fieldPlayerTwo?: string;
  fieldValues?: SelectItem[];
  min?: number;
  max?: number;
}

export function getGameSystemConfig(system: string, tournamentType: string): GameSystemConfig {
  console.log("getGameSystem: " + system);
  if (system === 'WmHo') {
    return getWmHoFieldConfig(tournamentType);
  } else if (system === 'Judgement') {
    return getJudgementFieldConfig(tournamentType);
  } else {
    return {
      participantFields: [],
      playerFields: [],
      scoreFields: [],
      standingFields: [],
    };
  }
}



export function orderParticipantsForGameSystem(gameSystem: string, participants: Participant[], participantsScoreMap: any): Participant[] {

  if (gameSystem === 'WmHo') {
     return participants.sort((part1, part2) => {

      let result = 0;

      if (participantsScoreMap[part1.name] < participantsScoreMap[part2.name]) {
        result = 1;
      } else if (participantsScoreMap[part1.name] > participantsScoreMap[part2.name]) {
        result = -1;
      } else {
        if (getSos(part1, participantsScoreMap) < getSos(part2, participantsScoreMap)) {
          result = 1;
        } else if (getSos(part1, participantsScoreMap) > getSos(part2, participantsScoreMap)) {
          result = -1;
        } else {
          if (getCP(part1) < getCP(part2)) {
            result = 1;
          } else if (getCP(part1) > getCP(part2)) {
            result = -1;
          } else {
            if (getVP(part1) < getVP(part2)) {
              result = 1;
            } else if (getVP(part1) > getVP(part2)) {
              result = -1;
            }
          }
        }
      }
      return result;
    });
  } else {
    return participants.sort((part1, part2) => {

      let result = 0;

      if (getScore(part1) < getScore(part2)) {
        result = 1;
      } else if (getScore(part1) > getScore(part2)) {
        result = -1;
      }
      return result;
    });
  }
}

export function getColumnsForStandingsExport(gameSystem: string): number[] {

  if (gameSystem === 'WmHo') {
    // name, location, faction, armyLists, score, sos, cp, vp
    return [1, 2, 3, 4, 5, 6, 7, 8];
  } else {
    // name, location, score
    return [1, 2, 3];
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

export function getByeScoring(gameSystem: string): any {

  if (gameSystem === 'WmHo') {
    return {'score': 1, 'cp': 3, 'vp': 38};
  } else {
    return {'score': 1};
  }
}

export function getScore(participant: Participant) {

  let scoreSum = 0;
  _.forEach(participant.roundScores, function (score: number) {
    scoreSum = scoreSum + score;
  });
  return scoreSum;
}

export function getSos(participant: Participant, participantsScoreMap: any) {

  let sosSum = 0;
  _.forEach(participant.opponentParticipantsNames, function (opponentName: string) {
    sosSum = sosSum + participantsScoreMap[opponentName];
  });
  return sosSum;
}

export function getCP(participant: Participant) {

  let cpSum = 0;
  _.forEach(participant.cp, function (cp: number) {
    cpSum = cpSum + cp;
  });
  return cpSum;
}

export function getVP(participant: Participant) {

  let vpSum = 0;
  _.forEach(participant.vp, function (vp: number) {
    vpSum = vpSum + vp;
  });
  return vpSum;
}



