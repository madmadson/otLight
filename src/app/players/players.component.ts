import {Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFirestore} from "angularfire2/firestore";
import {GameSystemService} from "../services/game-system.service";
import {getPlayerForJSON, Player} from "../models/Player";
import {Subscription} from "rxjs/Subscription";
import * as firebase from "firebase/app";
import CollectionReference = firebase.firestore.CollectionReference;

import * as _ from 'lodash';
import {
  FieldValues, GameSystemConfig, getGameSystemConfig, getGameSystems,
  getGameSystemsAsSelectItems
} from "../models/game-systems";
import {SelectItem} from "primeng/primeng";


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
  protected gameSystemsAsSelectItems: SelectItem[];
  protected gameSystems: string[];

  constructor(private afs: AngularFirestore,
              protected gameSystemService: GameSystemService) {
    this.playersColRef = this.afs.firestore.collection('players');

    this.selectedGameSystem = this.gameSystemService.getGameSystem();

    this.gameSystemConfig = getGameSystemConfig(this.selectedGameSystem, '');

    this.gameSystemsAsSelectItems = getGameSystemsAsSelectItems();
    this.gameSystems = getGameSystems();
  }

  ngOnInit() {

    this.subscribeOnPlayers();

    this.gameSystemSubscription = this.gameSystemService.getGameSystemAsStream().subscribe(gameSystem => {
      console.log("gameSystem updated: " + gameSystem);
      this.selectedGameSystem = gameSystem;
      this.gameSystemConfig = getGameSystemConfig(this.selectedGameSystem, '');
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

            const player: Player = getPlayerForJSON(change.doc.id, change.doc.data());

            _.forEach(that.gameSystemConfig.playerFields, function (playerField: FieldValues) {

              const fieldValue = change.doc.data()[playerField.field] ? change.doc.data()[playerField.field] : playerField.defaultValue;
              player[playerField.field] = fieldValue;
            });
            player.myGameSystems = [];
            _.forEach(that.gameSystems, function (gameSystem: string) {
              if (player.gameSystems[gameSystem]) {
                player.myGameSystems.push(gameSystem);
              }
            });

            newPlayers.push(player);
            that.players = newPlayers;
          }
          if (change.type === "modified") {

            const newPlayers = _.cloneDeep(that.players);

            const player: Player = getPlayerForJSON(change.doc.id, change.doc.data());

            _.forEach(that.gameSystemConfig.playerFields, function (playerField: FieldValues) {
              const fieldValue = change.doc.data()[playerField.field] ? change.doc.data()[playerField.field] : playerField.defaultValue;
              player[playerField.field] = fieldValue;
            });
            player.myGameSystems = [];
            _.forEach(that.gameSystems, function (gameSystem: string) {
              if (player.gameSystems[gameSystem]) {
                player.myGameSystems.push(gameSystem);
              }
            });

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
    delete player.myGameSystems;

    playerDocRef.update(player).then(function () {
      console.log("Player updated");
    }).catch(function (error) {
      console.error("Error updating player: ", error);
    });
  }

  onEditPlayer(event: any) {
    console.log(event.data);

    const playerDocRef = this.playersColRef.doc(event.data.id);

    const player: Player = getPlayerForJSON(event.data.id, event.data);

    delete player.myGameSystems;

    playerDocRef.update(player).then(function () {
      console.log("Player updated");
    }).catch(function (error) {
      console.error("Error updating player: ", error);
    });
  }

  changeGameSystems(event: any, player: Player) {

    console.log("changeGameSystems: " + event.value);

    const playerDocRef = this.playersColRef.doc(player.id);

    _.forEach(this.gameSystems, function (gameSystem: string) {
      player.gameSystems[gameSystem] = !!_.includes(event.value, gameSystem);
    });
    delete player.myGameSystems;


    playerDocRef.update(player).then(function () {
      console.log("Player GameSystems updated");
    }).catch(function (error) {
      console.error("Error updating player: ", error);
    });
  }
}
