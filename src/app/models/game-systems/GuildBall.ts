
import * as _ from 'lodash';
import {SelectItem} from "primeng/primeng";
import {GameSystemConfig} from "../game-systems";
import {Participant} from "../Participant";
import {Team} from "../Team";

export function getGuildBallFieldConfig(): GameSystemConfig {

  const gameConfig: GameSystemConfig = {playerFields: [],
    participantFields: [], scoreFields: [], standingFields: [], choosePlayed: []};

  gameConfig.playerFields.push({
    defaultValue: '',
    type: 'dropDown',
    field: 'Faction',
    fieldValues: getGuildBallFactionsAsSelectItems()
  });
  gameConfig.participantFields.push({
    defaultValue: '',
    type: 'dropDown',
    field: 'Faction',
    fieldValues: getGuildBallFactionsAsSelectItems()
  });

  gameConfig.standingFields.push({
    defaultValue: 0,
    type: 'number',
    field: 'sos',
    isTeam: false,
  }, {
    defaultValue: 0,
    type: 'number',
    field: 'o-sos',
    isTeam: false,
  }, {
    defaultValue: 0,
    type: 'number',
    field: 'vp',
    isTeam: true,
  });

  gameConfig.scoreFields.push({
    defaultValue: 0,
    type: 'number',
    field: 'vp',
    fieldPlayerOne: 'vpParticipantOne',
    fieldPlayerTwo: 'vpParticipantTwo',
    min: 0,
    max: 200
  });

  return gameConfig;
}


export function getGuildBallFactionsAsSelectItems(): SelectItem[] {
  return [{value: 'Alchemists', label: 'Alchemists'},
    {value: 'Blacksmiths', label: 'Blacksmiths'},
    {value: 'Brewers', label: 'Brewers'},
    {value: 'Butchers', label: 'Butchers'},
    {value: 'Engineers', label: 'Engineers'},
    {value: 'Farmers', label: 'Farmers'},
    {value: 'Fishermans', label: 'Fishermans'},
    {value: 'Hunters', label: 'Hunters'},
    {value: 'Masons', label: 'Masons'},
    {value: 'Morticians', label: 'Morticians'},
    {value: 'Union', label: 'Union'}];
}


export function getAllGuildBallGuilds(): string[] {
  return  ['Alchemists', 'Blacksmiths', 'Brewers', 'Butchers', 'Engineers', 'Farmers', 'Fishermans', 'Hunters', 'Masons',
    'Morticians', 'Union'];
}

export function orderParticipantsForGuildBall( participants: Participant[], participantsScoreMap: any): Participant[] {
  return participants.sort((part1, part2) => {

    if ( participantsScoreMap[part1.name] < participantsScoreMap[part2.name]) {
      return 1;
    } else if ( participantsScoreMap[part1.name] > participantsScoreMap[part2.name]) {
      return -1;
    }

    if (getSos(part1, participantsScoreMap) < getSos(part2, participantsScoreMap)) {
      return 1;
    } else if (getSos(part1, participantsScoreMap) > getSos(part2, participantsScoreMap)) {
      return -1;
    }

    if (getOpponentsSos(part1, participantsScoreMap) < getOpponentsSos(part2, participantsScoreMap)) {
      return 1;
    } else if (getOpponentsSos(part1, participantsScoreMap) > getOpponentsSos(part2, participantsScoreMap)) {
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

export function orderTeamsForGuildBall( teams: Team[], teamsScoreMap: any): Team[] {
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

    if (getVP(team1) < getVP(team2)) {
      return 1;
    } else if (getVP(team1) > getVP(team2)) {
      return -1;
    }

    return 0;
  });
}

export function getSos(participant: Participant, participantsScoreMap: any) {

  let sosSum = 0;
  _.forEach(participant.opponentParticipantsNames, function (opponentName: string) {
    if (opponentName !== 'bye') {
      let opponentWinRate = participantsScoreMap[opponentName] / participant.opponentParticipantsNames.length;
      if (opponentWinRate < 0.3333) {
        opponentWinRate = 0.3333;
      }
      sosSum = sosSum + opponentWinRate;
    } else {
      // bye is always 0.333
      sosSum = sosSum + (0.3333);
    }
  });

  const specialSos = sosSum /  (participant.opponentParticipantsNames.length * participant.opponentParticipantsNames.length);
  return Math.round(specialSos * 100) / 100;
}

export function getOpponentsSos(participant: Participant, participantsScoreMap: any) {

  let sosSum = 0;
  _.forEach(participant.opponentParticipantsNames, function (opponentName: string) {
    if (opponentName !== 'bye') {
      let opponentWinRate = participantsScoreMap[opponentName] / participant.opponentParticipantsNames.length;
      if (opponentWinRate < 0.3333) {
        opponentWinRate = 0.3333;
      }
      sosSum = sosSum + opponentWinRate;
    } else {
      // bye is always 0.333
      sosSum = sosSum + (0.3333);
    }
  });

  const specialSos = sosSum /  (participant.opponentParticipantsNames.length * participant.opponentParticipantsNames.length);
  return Math.round(specialSos * 100) / 100;
}

export function getSgw(team: Team) {

  let sgwSum = 0;
  _.forEach(team.sgw, function (sgw: number) {
    sgwSum = sgwSum + sgw;
  });
  return sgwSum;
}

export function getVP(participant: any) {

  let vpSum = 0;
  _.forEach(participant.vp, function (vp: number) {
    vpSum = vpSum + vp;
  });
  return vpSum;
}
