import {Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFirestore} from "angularfire2/firestore";
import {GameSystemService} from "../services/game-system.service";
import {Player} from "../models/Player";
import {Subscription} from "rxjs/Subscription";
import * as firebase from "firebase/app";
import CollectionReference = firebase.firestore.CollectionReference;

import * as _ from 'lodash';
import {GameSystemConfig, getGameSystemConfig} from "../models/game-systems";


@Component({
  selector: 'app-players',
  templateUrl: './players.component.html',
  styleUrls: ['./players.component.scss']
})
export class PlayersComponent implements OnInit, OnDestroy  {

  protected players: Player[] = [];
  protected playersLoaded: boolean;
  protected gameSystemSubscription: Subscription;
  protected selectedGameSystem: string;
  protected playersColRef: CollectionReference;
  protected playersUnsubscribeFunction: (() => void);
  protected gameSystemConfig: GameSystemConfig;

  constructor(private afs: AngularFirestore,
              protected gameSystemService: GameSystemService) {
    this.playersColRef = this.afs.firestore.collection('players');

    this.selectedGameSystem = this.gameSystemService.getGameSystem();

    this.gameSystemConfig = getGameSystemConfig(this.selectedGameSystem);
  }

  ngOnInit() {

    this.subscribeOnPlayers();

    this.gameSystemSubscription = this.gameSystemService.getGameSystemAsStream().subscribe(gameSystem => {
      console.log("gameSystem updated: " + gameSystem);
      this.selectedGameSystem = gameSystem;
      this.subscribeOnPlayers();
    });
  }

  ngOnDestroy() {
    this.playersUnsubscribeFunction();
    this.gameSystemSubscription.unsubscribe();
  }

  protected subscribeOnPlayers() {

    const that = this;
    that.playersLoaded = false;
    that.players = [];

    if (this.playersUnsubscribeFunction) {
      this.playersUnsubscribeFunction();
    }

    this.playersUnsubscribeFunction = this.playersColRef
      .where('gameSystems.' + this.selectedGameSystem, '==', true).onSnapshot(function (snapshot) {

        snapshot.docChanges.forEach(function (change) {
          if (change.type === "added") {

            const newPlayers = _.cloneDeep(that.players);

            const player: Player = {
              id: change.doc.id,
              name: change.doc.data().name,
              location: change.doc.data().location,
              gameSystems: change.doc.data().gameSystems,
              MainFaction: change.doc.data().MainFaction,
              ArmyLists: change.doc.data().ArmyLists,
            };

            newPlayers.push(player);
            that.players = newPlayers;
          }
          if (change.type === "modified") {

            const newPlayers = _.cloneDeep(that.players);

            const player: Player = {
              id: change.doc.id,
              name: change.doc.data().name,
              location: change.doc.data().location,
              gameSystems: change.doc.data().gameSystems,
              MainFaction: change.doc.data().MainFaction,
              ArmyLists: change.doc.data().ArmyLists,
            };

            const index = _.findIndex(newPlayers, ['id', change.doc.id]);
            newPlayers[index] = player;
            that.players = newPlayers;
          }
          if (change.type === "removed") {

            const newPlayers = _.cloneDeep(that.players);

            const index = _.findIndex(newPlayers, ['id', change.doc.id]);
            newPlayers.splice(index, 1);

            that.players = newPlayers;
          }
        });

        that.playersLoaded = true;
      });
  }

  changePlayerField(player: Player) {

    console.log('save player: ' + JSON.stringify(player));

    const playerDocRef = this.playersColRef.doc(player.id);

    playerDocRef.update(player).then(function () {
      console.log("Player dyn1 updated: " + JSON.stringify(player));
    }).catch(function (error) {
      console.error("Error updating player: ", error);
    });
  }
}
