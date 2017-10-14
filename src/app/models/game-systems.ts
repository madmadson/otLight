

import {SelectItem} from "primeng/primeng";

export function getGameSystems(): SelectItem[] {
  return  [{
    value: 'wmho', label: 'WM/HO'
  }, {
    value: 'guildball', label: 'GuildBall'
  }];
}

export interface AllGameSystems {
  wmho: boolean;
  guildball: boolean;
}
