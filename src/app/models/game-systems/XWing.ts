

import {GameSystemConfig} from "../game-systems";
import {SelectItem} from "primeng/primeng";
import {Participant} from "../Participant";
import * as _ from 'lodash';
import {Team} from "../Team";

export function getXWingFieldConfig(): GameSystemConfig {

  const gameConfig: GameSystemConfig = {playerFields: [],
    participantFields: [], scoreFields: [], standingFields: [], choosePlayed: []};

  gameConfig.playerFields.push({
    defaultValue: '',
    type: 'dropDown',
    field: 'Faction',
    fieldValues: getXWingFactionsAsSelectItems()
  }, {
    defaultValue: '',
    type: 'links',
    field: 'links'
  });
  gameConfig.participantFields.push({
    defaultValue: '',
    type: 'dropDown',
    field: 'Faction',
    fieldValues: getXWingFactionsAsSelectItems()
  });

  gameConfig.standingFields.push({
    defaultValue: 0,
    type: 'number',
    field: 'mov',
    isTeam: true,
  },{
    defaultValue: 0,
    type: 'number',
    field: 'sos',
    isTeam: false,
  });

  gameConfig.scoreFields.push({
    defaultValue: 0,
    type: 'number',
    field: 'mov',
    fieldPlayerOne: 'movParticipantOne',
    fieldPlayerTwo: 'movParticipantTwo',
    min: 0,
    max: 500
  });
  return gameConfig;
}

export function getXWingFactionsAsSelectItems(): SelectItem[] {
  return [{value: 'Rebels', label: 'Rebels'},
    {value: 'Empire', label: 'Empire'},
    {value: 'Scum', label: 'Scum'}];
}


export function orderParticipantsForXWing( participants: Participant[], participantsScoreMap: any): Participant[] {
  return participants.sort((part1, part2) => {

    if ( participantsScoreMap[part1.name] < participantsScoreMap[part2.name]) {
      return 1;
    } else if ( participantsScoreMap[part1.name] > participantsScoreMap[part2.name]) {
      return -1;
    }

    if (getMoV(part1) < getMoV(part2)) {
      return 1;
    } else if (getMoV(part1) > getMoV(part2)) {
      return -1;
    }

    if (getSos(part1, participantsScoreMap) < getSos(part2, participantsScoreMap)) {
      return 1;
    } else if (getSos(part1, participantsScoreMap) > getSos(part2, participantsScoreMap)) {
      return -1;
    }

    return 0;
  });
}


export function orderTeamsForXWing( teams: Team[], teamsScoreMap: any): Team[] {
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

    if (getMoV(team1) < getMoV(team2)) {
      return 1;
    } else if (getMoV(team1) > getMoV(team2)) {
      return -1;
    }

    return 0;
  });
}

export function getSos(participant: Participant, participantsScoreMap: any) {

  let sosSum = 0;
  _.forEach(participant.opponentParticipantsNames, function (opponentName: string) {
    if (opponentName !== 'bye') {
      sosSum = sosSum + participantsScoreMap[opponentName];
    }
  });
  return sosSum;
}

export function getSgw(team: Team) {

  let sgwSum = 0;
  _.forEach(team.sgw, function (sgw: number) {
    sgwSum = sgwSum + sgw;
  });
  return sgwSum;
}

export function getMoV(participant: any) {

  let vpSum = 0;
  _.forEach(participant.mov, function (vp: number) {
    vpSum = vpSum + vp;
  });
  return vpSum;
}
