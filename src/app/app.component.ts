import {Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFirestore} from "angularfire2/firestore";
import {getGameSystemsAsSelectItems} from "./models/game-systems";
import {Message, SelectItem} from "primeng/primeng";
import {GameSystemService} from "./services/game-system.service";
import {Observable} from 'rxjs/Rx';
import {ConnectivityService} from "./services/connectivity-service";
import {Router} from "@angular/router";
import {BatchService, BatchServiceState} from "./services/batch.service";
import {Subscription} from "rxjs/Subscription";

@Component({
  selector: 'ot-app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {

  sidebarVisible: boolean;

  messages: Message[] = [];

  showSubTopBar: boolean;

  selectedGameSystem: string;

  gameSystems: SelectItem[];
  isConnected$: Observable<boolean>;
  private batchServiceSub: Subscription;

  constructor(private afs: AngularFirestore,
              protected router: Router,
              private connectivityServiceSub: ConnectivityService,
              private batchService: BatchService,
              protected gameSystemService: GameSystemService) {
    connectivityServiceSub.subscribe();

    this.gameSystems = getGameSystemsAsSelectItems();
    this.selectedGameSystem = this.gameSystems[0].value;
    this.gameSystemService.setGameSystem(this.selectedGameSystem);

    this.afs.firestore.enablePersistence()
      .then(function () {
        console.log('offlineMode enabled');
      })
      .catch(function (err) {
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

  ngOnInit() {
    this.isConnected$ = this.connectivityServiceSub.getConnectionStream();

    this.batchServiceSub = this.batchService.getBatchEventAsStream().subscribe((batchEvent: string) => {
      console.log('batchEvent: ' + batchEvent);
      if (batchEvent === BatchServiceState.SET ||
          batchEvent === BatchServiceState.UPDATE ||
          batchEvent === BatchServiceState.DELETE) {
        this.showSubTopBar = true;
      } else if (batchEvent === BatchServiceState.COMMIT_STARTED ||
                 batchEvent === BatchServiceState.COMMIT_COMPLETED) {
        this.showSubTopBar = false;
      }
    });
  }

  ngOnDestroy() {
    this.connectivityServiceSub.unSubscribe();
    this.batchServiceSub.unsubscribe();
  }

  openPlayerWithOpenNewPlayerDialog() {
    this.sidebarVisible = false;
    this.router.navigate(['/players', 'true']);
  }

  openTournamentsWithOpenNewTournamentDialog() {

    this.sidebarVisible = false;
    this.router.navigate(['/tournaments', 'true']);
  }

  gameSystemChanged(event: any) {

    this.gameSystemService.setGameSystem(event.value);
  }

  commitUpdates() {

    this.batchService.commit();
  }
}
