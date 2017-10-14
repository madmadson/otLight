


import {Participant} from "./Participant";

export interface Tournament {
  id?: string;
  name: string;
  gameSystem: string;
  password?: string;
  participants?: Participant[];
}
