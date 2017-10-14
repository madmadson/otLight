import {Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFirestore} from "angularfire2/firestore";
import {GameSystemService} from "../services/game-system.service";
import {Player} from "../models/Player";
import {Subscription} from "rxjs/Subscription";
import * as firebase from "firebase/app";
import CollectionReference = firebase.firestore.CollectionReference;

import * as _ from 'lodash';

@Component({
  selector: 'app-players',
  templateUrl: './players.component.html',
  styleUrls: ['./players.component.scss']
})
export class PlayersComponent implements OnInit, OnDestroy  {

  protected players: Player[] = [];
  protected playersLoaded: boolean;
  private gameSystemSubscription: Subscription;
  private selectedGameSystem: string;
  private playersColRef: CollectionReference;
  private playersUnsubscribeFunction: (() => void);


  constructor(private afs: AngularFirestore,
              protected gameSystemService: GameSystemService) {
    this.playersColRef = this.afs.firestore.collection('players');
  }

  ngOnInit() {

    this.subscribeOnPlayers();

    this.gameSystemSubscription = this.gameSystemService.getGameSystem().subscribe(gameSystem => {
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
              gameSystems: change.doc.data().gameSystems,
            };

            newPlayers.push(player);
            that.players = newPlayers;
          }
          if (change.type === "modified") {

            const newPlayers = _.cloneDeep(that.players);

            const player: Player = {
              id: change.doc.id,
              name: change.doc.data().name,
              gameSystems: change.doc.data().gameSystems,
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
}
