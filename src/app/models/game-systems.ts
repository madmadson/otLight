import {SelectItem} from "primeng/primeng";
import {getWmHoFieldConfig, orderParticipantsForWmHo, orderTeamsForWmHo} from "./game-systems/WmHo";
import {Participant} from "./Participant";

import * as _ from 'lodash';

import {getJudgementFieldConfig, orderParticipantsForJudgement, orderTeamsForJudgement} from "./game-systems/Judgement";
import {Team} from "./Team";
import {getMalifauxFieldConfig, orderParticipantsForMalifaux, orderTeamsForMalifaux} from "./game-systems/Malifaux";

export function getGameSystemsAsSelectItems(): SelectItem[] {
  return [{
    value: 'WmHo', label: 'WmHo'
  }, {
    value: 'GuildBall', label: 'GuildBall'
  }, {
    value: 'Judgement', label: 'Judgement'
  }, {
    value: 'XWing', label: 'XWing'
  },{
    value: 'Malifaux', label: 'Malifaux'
  }];
}

export function getGameSystems(): string[] {
  return ['WmHo', 'GuildBall', 'Judgement', 'XWing', 'Malifaux'];
}


export interface AllGameSystems {
  WmHo?: boolean;
  GuildBall?: boolean;
  Judgement?: boolean;
  XWing?: boolean;
  Malifaux?: boolean;
}

export interface GameSystemConfig {
  playerFields: FieldValues[];
  participantFields: FieldValues[];
  scoreFields: FieldValues[];
  standingFields: FieldValues[];
  choosePlayed: FieldValues[];
}

export interface FieldValues {
  defaultValue: any;
  type: string;
  field: string;
  isSolo?: boolean;
  isTeam?: boolean;
  fieldPlayerOne?: string;
  fieldPlayerTwo?: string;
  fieldValues?: SelectItem[];
  min?: number;
  max?: number;
}

export function getGameSystemConfig(system: string): GameSystemConfig {
  console.log("getGameSystem: " + system);
  if (system === 'WmHo') {
    return getWmHoFieldConfig();
  } else if (system === 'Judgement') {
    return getJudgementFieldConfig();
  } else if (system === 'Malifaux') {
    return getMalifauxFieldConfig();
  } else {
    return {
      participantFields: [],
      playerFields: [],
      scoreFields: [],
      standingFields: [],
      choosePlayed: [],
    };
  }
}

export function orderParticipantsForGameSystem(gameSystem: string, participants: Participant[], participantsScoreMap: any): Participant[] {

  if (gameSystem === 'WmHo') {
    return orderParticipantsForWmHo(participants, participantsScoreMap);
  } else if (gameSystem === 'Judgement') {
    return orderParticipantsForJudgement(participants, participantsScoreMap);
  } else if (gameSystem === 'Malifaux') {
    return orderParticipantsForMalifaux(participants, participantsScoreMap);
  } else {
    return participants.sort((part1, part2) => {

      let result = 0;

      if (participantsScoreMap[part1.name] < participantsScoreMap[part2.name]) {
        result = 1;
      } else if (participantsScoreMap[part1.name] > participantsScoreMap[part2.name]) {
        result = -1;
      }
      return result;
    });
  }
}

export function orderTeamsForGameSystem(gameSystem: string, teams: Team[], teamsScoreMap: any): Team[] {

  if (gameSystem === 'WmHo') {
    return orderTeamsForWmHo(teams, teamsScoreMap);
  } else if (gameSystem === 'Judgement') {
    return orderTeamsForJudgement(teams, teamsScoreMap);
  } else if (gameSystem === 'Malifaux') {
    return orderTeamsForMalifaux(teams, teamsScoreMap);
  } else {
    return teams.sort((team1, team2) => {

      let result = 0;

      if (teamsScoreMap[team1.name] < teamsScoreMap[team2.name]) {
        result = 1;
      } else if (teamsScoreMap[team1.name] > teamsScoreMap[team2.name]) {
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
  } else if (gameSystem === 'Judgement') {
    // name, location, warband, score, souls, levels
    return [1, 2, 3, 4, 5, 6];
  } else if (gameSystem === 'Malifaux') {
    // name, location, mfFaction, score, diff, vp
    return [1, 2, 3, 4, 5, 6];
  } else {
    // name, location, score
    return [1, 2, 3];
  }
}

export function getColumnsForTeamStandingsExport(gameSystem: string): number[] {

  if (gameSystem === 'WmHo') {
    // name, location, members, score, sgw, cp, vp
    return [1, 2, 3, 4, 5, 6, 7];
  } else if (gameSystem === 'Judgement') {
    // name, location, members, score, sgw, souls, levels
    return [1, 2, 3, 4, 5, 6, 7];
  } else if (gameSystem === 'Malifaux') {
    // name, location, members, score, sgw, diff, vp
    return [1, 2, 3, 4, 5, 6, 7];
  } else {
    // name, location, score, members, sgw
    return [1, 2, 3, 4, 5];
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
  } else if (gameSystem === 'Judgement') {
    return [1, 0, 0];
  } else if (gameSystem === 'Malifaux') {
    return [3, 0, 1];
  } else {
    return [1, 0, 0];
  }
}

export function getByeScoring(gameSystem: string): any {

  if (gameSystem === 'WmHo') {
    return {'score': 1, 'cp': 3, 'vp': 38};
  } else if (gameSystem === 'Judgement') {
    return {'score': 1, 'souls': 2, 'levels': 6};
  } else if (gameSystem === 'Malifaux') {
    return {'score': 1, 'diff': 5, 'vp': 10};
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

export function getScoreForTeam(team: Team) {

  let scoreSum = 0;
  _.forEach(team.roundScores, function (score: number) {
    scoreSum = scoreSum + score;
  });
  return scoreSum;
}
