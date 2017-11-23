

import {GameSystemConfig} from "../game-systems";
import {SelectItem} from "primeng/primeng";
import {Team} from "../Team";
import * as _ from 'lodash';
import {Participant} from "../Participant";

export function getMalifauxFieldConfig(): GameSystemConfig {

  const gameConfig: GameSystemConfig = {playerFields: [],
    participantFields: [], scoreFields: [], standingFields: [], choosePlayed: []};

  gameConfig.playerFields.push({
    defaultValue: '',
    type: 'dropDown',
    field: 'mfFaction',
    fieldValues: getMalifauxFactionsAsSelectItems()
  });
  gameConfig.participantFields.push({
    defaultValue: '',
    type: 'dropDown',
    field: 'mfFaction',
    fieldValues: getMalifauxFactionsAsSelectItems()
  }, );

  gameConfig.standingFields.push({
    defaultValue: 0,
    type: 'number',
    field: 'diff',
  }, {
    defaultValue: 0,
    type: 'number',
    field: 'vp',
  });

  gameConfig.scoreFields.push({
    defaultValue: 0,
    type: 'number',
    field: 'diff',
    fieldPlayerOne: 'diffParticipantOne',
    fieldPlayerTwo: 'diffParticipantTwo',
    min: -30,
    max: 30
  }, {
    defaultValue: 0,
    type: 'number',
    field: 'vp',
    fieldPlayerOne: 'vpParticipantOne',
    fieldPlayerTwo: 'vpParticipantTwo',
    min: 0,
    max: 30
  });

  return gameConfig;
}

export function getAllMalifauxFactions(): string[] {
  return  ['The Guild', 'Resurrectionists', 'Neverborn', 'Arcanists', 'Outcasts', 'Ten Thunders', 'Gremlins'];
}

export function getMalifauxFactionsAsSelectItems(): SelectItem[] {
  return [{value: 'The Guild', label: 'The Guild'},
    {value: 'Resurrectionists', label: 'Resurrectionists'},
    {value: 'Neverborn', label: 'Neverborn'},
    {value: 'Arcanists', label: 'Arcanists'},
    {value: 'Outcasts', label: 'Outcasts'},
    {value: 'Ten Thunders', label: 'Ten Thunders'},
    {value: 'Gremlins', label: 'Gremlins'}];
}


export function orderParticipantsForMalifaux( participants: Participant[], participantsScoreMap: any): Participant[] {
  return participants.sort((part1, part2) => {

    if ( participantsScoreMap[part1.name] < participantsScoreMap[part2.name]) {
      return 1;
    } else if ( participantsScoreMap[part1.name] > participantsScoreMap[part2.name]) {
      return -1;
    }

    if (getDiff(part1) < getDiff(part2)) {
      return 1;
    } else if (getDiff(part1) > getDiff(part2)) {
      return -1;
    }

    if (getVP(part1) < getVP(part2)) {
      return 1;
    } else if (getVP(part1) > getVP(part2)) {
      return -1;
    }

    return 0;
  });
}

export function orderTeamsForMalifaux( teams: Team[], teamsScoreMap: any): Team[] {
  return teams.sort((team1, team2) => {

    if (teamsScoreMap[team1.name] < teamsScoreMap[team2.name]) {
      return 1;
    } else if (teamsScoreMap[team1.name] > teamsScoreMap[team2.name]) {
      return -1;
    }

    if (getSgw(team1) < getSgw(team2)) {
      return 1;
    } else if (getSgw(team1) > getSgw(team2)) {
      return -1;
    }

    if (getDiff(team1) < getDiff(team2)) {
      return 1;
    } else if (getDiff(team1) > getDiff(team2)) {
      return -1;
    }

    if (getVP(team1) < getVP(team2)) {
      return 1;
    } else if (getVP(team1) > getVP(team2)) {
      return -1;
    }

    return 0;
  });
}

export function getDiff(participant: any) {

  let cpSum = 0;
  _.forEach(participant.mfDiff, function (cp: number) {
    cpSum = cpSum + cp;
  });
  return cpSum;
}

export function getVP(participant: any) {

  let vpSum = 0;
  _.forEach(participant.mfVP, function (vp: number) {
    vpSum = vpSum + vp;
  });
  return vpSum;
}

export function getSgw(team: Team) {

  let sgwSum = 0;
  _.forEach(team.sgw, function (sgw: number) {
    sgwSum = sgwSum + sgw;
  });
  return sgwSum;
}
