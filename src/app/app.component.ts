import { Component } from '@angular/core';
import {AngularFirestore} from "angularfire2/firestore";
import {getGameSystems, getGameSystemsAsSelectItems} from "./models/game-systems";
import {Message, SelectItem} from "primeng/primeng";
import {GameSystemService} from "./services/game-system.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  sidebarVisible: boolean;

  messages: Message[] = [];
  addTournamentDialogVisibility: boolean;
  addPlayerDialogVisibility: boolean;

  protected selectedGameSystem: string;
  protected gameSystems: SelectItem[];

  constructor(private afs: AngularFirestore,
              protected gameSystemService: GameSystemService) {

    this.gameSystems = getGameSystemsAsSelectItems();
    this.selectedGameSystem = this.gameSystems[0].value;
    this.gameSystemService.setGameSystem(this.selectedGameSystem);

    afs.firestore.enablePersistence()
      .then(function() {
        console.log('offlineMode enabled');
      })
      .catch(function(err) {
        if (err.code === 'failed-precondition') {
          // Multiple tabs open, persistence can only be enabled
          // in one tab at a a time.
          // ...
          console.log('Multiple tabs open');

        } else if (err.code === 'unimplemented') {
          // The current browser does not support all of the
          // features required to enable persistence
          // ...
          console.log('offline not supported');
        }
      });

  }


  openNewTournamentDialog() {
    this.sidebarVisible = false;
    this.addTournamentDialogVisibility = true;
  }

  openNewPlayerDialog() {
    this.sidebarVisible = false;
    this.addPlayerDialogVisibility = true;
  }

  handleTournamentSaved() {
    this.addTournamentDialogVisibility = false;
  }

  handlePlayerSaved() {
    this.addPlayerDialogVisibility = false;
  }


  gameSystemChanged(event: any) {

    this.gameSystemService.setGameSystem(event.value);
  }
}
