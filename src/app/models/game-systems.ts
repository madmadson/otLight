

import {SelectItem} from "primeng/primeng";

export function getGameSystems(): SelectItem[] {
  return  [{
    value: 'WmHo', label: 'WmHo'
  }, {
    value: 'GuildBall', label: 'GuildBall'
  }];
}

export interface AllGameSystems {
  WmHo: boolean;
  GuildBall: boolean;
}
