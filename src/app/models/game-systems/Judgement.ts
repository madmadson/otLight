

import {GameSystemConfig} from "../game-systems";
import {SelectItem} from "primeng/primeng";

export function getJudgementFieldConfig(type: string): GameSystemConfig {

  const gameConfig: GameSystemConfig = {playerFields: [], participantFields: [], scoreFields: [], standingFields: []};

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

   if (type === 'team') {
    gameConfig.standingFields.push({
      defaultValue: 0,
      type: 'number',
      field: 'sgw',
    });
  }

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

  return gameConfig;
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
