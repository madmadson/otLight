

import {GameSystemConfig} from "../game-systems";
import {SelectItem} from "primeng/primeng";
import {Participant} from "../Participant";

import * as _ from 'lodash';
import {Team} from "../Team";

export function getJudgementFieldConfig(): GameSystemConfig {

  const gameConfig: GameSystemConfig = {playerFields: [], participantFields: [], scoreFields: [], standingFields: [], choosePlayed: []};

  gameConfig.playerFields.push({
    defaultValue: [],
    type: 'multiSelect',
    field: 'Warband',
    fieldValues: getJudgementHeroesAsSelectItem()
  });
  gameConfig.participantFields.push({
    defaultValue: [],
    type: 'multiSelect',
    field: 'Warband',
    fieldValues: getJudgementHeroesAsSelectItem()
  });

  gameConfig.standingFields.push({
    defaultValue: 0,
    type: 'number',
    field: 'souls',
  }, {
    defaultValue: 0,
    type: 'number',
    field: 'levels',
  });

  gameConfig.scoreFields.push({
    defaultValue: 0,
    type: 'number',
    field: 'souls',
    fieldPlayerOne: 'soulsParticipantOne',
    fieldPlayerTwo: 'soulsParticipantTwo',
    min: 0,
    max: 30
  }, {
    defaultValue: 0,
    type: 'number',
    field: 'levels',
    fieldPlayerOne: 'levelsParticipantOne',
    fieldPlayerTwo: 'levelsParticipantTwo',
    min: 0,
    max: 30
  });

  gameConfig.choosePlayed.push({
    defaultValue: [],
    type: 'multiSelect',
    field: 'Warband',
    fieldPlayerOne: 'warbandParticipantOne',
    fieldPlayerTwo: 'warbandParticipantTwo',
  });

  return gameConfig;
}

export function orderParticipantsForJudgement( participants: Participant[], participantsScoreMap: any): Participant[] {
  return participants.sort((part1, part2) => {

    let result = 0;

    if (participantsScoreMap[part1.name] < participantsScoreMap[part2.name]) {
      result = 1;
    } else if (participantsScoreMap[part1.name] > participantsScoreMap[part2.name]) {
      result = -1;
    } else {
      if (getSouls(part1) < getSouls(part2)) {
        result = 1;
      } else if (getSouls(part1) > getSouls(part2)) {
        result = -1;
      } else {
        if (getLevels(part1) < getLevels(part2)) {
          result = 1;
        } else if (getLevels(part1) > getLevels(part2)) {
          result = -1;
        }
      }
    }
    return result;
  });
}

export function orderTeamsForJudgement( teams: Team[], teamsScoreMap: any): Team[] {
  return teams.sort((team1, team2) => {

    let result = 0;

    if (teamsScoreMap[team1.name] < teamsScoreMap[team2.name]) {
      result = 1;
    } else if (teamsScoreMap[team1.name] > teamsScoreMap[team2.name]) {
      result = -1;
    } else {
      if (getSgw(team1) < getSgw(team2)) {
        result = 1;
      } else if (getSgw(team1) > getSgw(team2)) {
        result = -1;
      } else {
        if (getSouls(team1) < getSouls(team2)) {
          result = 1;
        } else if (getSouls(team1) > getSouls(team2)) {
          result = -1;
        } else {
          if (getLevels(team1) < getLevels(team2)) {
            result = 1;
          } else if (getLevels(team1) > getLevels(team2)) {
            result = -1;
          }
        }
      }
    }
    return result;
  });
}

export function getSgw(team: Team) {

  let sgwSum = 0;
  _.forEach(team.sgw, function (sgw: number) {
    sgwSum = sgwSum + sgw;
  });
  return sgwSum;
}

export function getSouls(participant: any) {

  let soulsSum = 0;
  _.forEach(participant.souls, function (souls: number) {
    soulsSum = soulsSum + souls;
  });
  return soulsSum;
}

export function getLevels(participant: any) {

  let levelsSum = 0;
  _.forEach(participant.levels, function (levels: number) {
    levelsSum = levelsSum + levels;
  });
  return levelsSum;
}

export function getJudgementHeroesAsSelectItem(): SelectItem[] {
  return [{value: 'Kvarto', label: 'Kvarto'},
    {value: 'Piper', label: 'Piper'},
    {value: 'Brok', label: 'Brok'},
    {value: 'Skoll', label: 'Skoll'},
    {value: 'Zaron', label: 'Zaron'},
    {value: 'Bastian', label: 'Bastian'},
    {value: 'Doenrakkar', label: 'Doenrakkar'},
    {value: 'Istariel', label: 'Istariel'},
    {value: 'Kruul', label: 'Kruul'},
    {value: 'Thorgar', label: 'Thorgar'},
    {value: 'Rakkir', label: 'Rakkir'},
    {value: 'Saiyin', label: 'Saiyin'},
    {value: 'Sir Marcus', label: 'Sir Marcus'},
    {value: 'Thrommel', label: 'Thrommel'},
  ];
}
