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
import {ConnectivityService} from "../services/connectivity-service";
import {MessageService} from "primeng/components/common/messageservice";
import {ActivatedRoute} from "@angular/router";
import {BatchService} from "../services/batch.service";


@Component({
  selector: 'ot-players',
  templateUrl: './players.component.html',
  styleUrls: ['./players.component.scss']
})
export class PlayersComponent implements OnInit, OnDestroy  {

  stacked: boolean;
  playersLoaded: boolean;
  updatePlayer: boolean;
  selectedGameSystem: string;

  protected allPlayers: Player[] = [];
  protected allPlayersForSelectedGameSystem: Player[] = [];
  protected gameSystemSubscription: Subscription;
  protected playersColRef: CollectionReference;
  protected playersUnsubscribeFunction: (() => void);
  protected gameSystemConfig: GameSystemConfig;
  protected gameSystemsAsSelectItems: SelectItem[];
  protected gameSystems: string[];
  protected playerToChange: Player;

  addPlayerDialogVisibility: boolean;
  private routerSub: Subscription;

  constructor(private afs: AngularFirestore,
              private batchService: BatchService,
              private route: ActivatedRoute,
              protected gameSystemService: GameSystemService) {
    this.playersColRef = this.afs.firestore.collection('players');

    this.selectedGameSystem = this.gameSystemService.getGameSystem();

    this.gameSystemConfig = getGameSystemConfig(this.selectedGameSystem);

    this.gameSystemsAsSelectItems = getGameSystemsAsSelectItems();
    this.gameSystems = getGameSystems();

    this.routerSub  = this.route
      .paramMap
      .map(params => {
        console.log('params: ' + JSON.stringify(params));
        if (params.get('new')) {
          this.addPlayerDialogVisibility = true;
        }
      }).subscribe();
  }

  ngOnInit() {

    this.subscribeOnPlayers();

    this.gameSystemSubscription = this.gameSystemService.getGameSystemAsStream().subscribe(gameSystem => {
      console.log("gameSystem updated: " + gameSystem);
      this.selectedGameSystem = gameSystem;
      this.gameSystemConfig = getGameSystemConfig(this.selectedGameSystem);
      this.subscribeOnPlayers();
    });
  }

  ngOnDestroy() {
    this.playersUnsubscribeFunction();
    this.gameSystemSubscription.unsubscribe();
    this.routerSub.unsubscribe();
  }

  protected subscribeOnPlayers() {

    const that = this;
    that.playersLoaded = false;
    that.allPlayers = [];
    that.allPlayersForSelectedGameSystem = [];

    if (this.playersUnsubscribeFunction) {
      this.playersUnsubscribeFunction();
    }

    this.playersUnsubscribeFunction = this.playersColRef.onSnapshot(function (snapshot) {

        snapshot.docChanges.forEach(function (change) {
          if (change.type === "added") {

            const newPlayers = _.cloneDeep(that.allPlayers);
            const newPlayersForSelectedGameSystem = _.cloneDeep(that.allPlayersForSelectedGameSystem);

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
            that.allPlayers = newPlayers;

            if (_.includes(player.myGameSystems, that.selectedGameSystem)) {
              newPlayersForSelectedGameSystem.push(player);
              that.allPlayersForSelectedGameSystem = newPlayersForSelectedGameSystem;
            }
          }
          if (change.type === "modified") {

            const newPlayers = _.cloneDeep(that.allPlayers);
            const newPlayersForSelectedGameSystem = _.cloneDeep(that.allPlayersForSelectedGameSystem);

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
            that.allPlayers = newPlayers;

            if (_.includes(player.myGameSystems, that.selectedGameSystem)) {
              const indexForSelected = _.findIndex(newPlayersForSelectedGameSystem, ['id', change.doc.id]);
              newPlayersForSelectedGameSystem[indexForSelected] = player;
              newPlayersForSelectedGameSystem.push(player);
              that.allPlayersForSelectedGameSystem = newPlayers;
            }
          }
          if (change.type === "removed") {

            const newPlayers = _.cloneDeep(that.allPlayers);
            const newPlayersForSelectedGameSystem = _.cloneDeep(that.allPlayersForSelectedGameSystem);

            const index = _.findIndex(newPlayers, ['id', change.doc.id]);
            newPlayers.splice(index, 1);

            that.allPlayers = newPlayers;

            if (_.includes(change.doc.data().myGameSystems, that.selectedGameSystem)) {
              const indexForSelected = _.findIndex(newPlayers, ['id', change.doc.id]);
              newPlayersForSelectedGameSystem.splice(indexForSelected, 1);
              that.allPlayersForSelectedGameSystem = newPlayersForSelectedGameSystem;
            }
          }
        });

        that.playersLoaded = true;
      });
  }

  changePlayerField(player: Player) {

    console.log('change Player: ' + JSON.stringify(player));

    this.playerToChange = player;
  }


  handlePlayerSaved() {
    this.addPlayerDialogVisibility = false;
  }

  savePlayer() {

    const that = this;

    if (this.playerToChange) {

      console.log('save player: ' + JSON.stringify(this.playerToChange));
      delete this.playerToChange.myGameSystems;

      const playerDocRef = this.playersColRef.doc(this.playerToChange.id);

      that.batchService.set(playerDocRef, this.playerToChange);

      // if (this.conService.isOnline()) {
      //   playerDocRef.update(this.playerToChange).then(function () {
      //     console.log("Player updated");
      //     that.updatePlayer = false;
      //     that.playerToChange = undefined;
      //   }).catch(function (error) {
      //     console.error("Error updating player: ", error);
      //     that.updatePlayer = false;
      //     that.playerToChange = undefined;
      //   });
      // } else {
      //
      //   playerDocRef.update(this.playerToChange).then(function () {
      //     // offline ignored :(
      //   }).catch(function () {
      //   });
      //
      //   console.log("Player updated");
      //   that.updatePlayer = false;
      //   that.playerToChange = undefined;
      //   that.messageService.add(
      //     {
      //       severity: 'success',
      //       summary: 'Update',
      //       detail: 'ATTENTION Player updated offline! Go online to sync data'
      //     }
      //   );
      // }
    }
  }

  onEditPlayer(event: any) {
    console.log(event.data);
    const that = this;

    const playerDocRef = this.playersColRef.doc(event.data.id);
    const player: Player = getPlayerForJSON(event.data.id, event.data);
    delete player.myGameSystems;

    that.batchService.set(playerDocRef, player);

    // if (this.conService.isOnline()) {
    //   playerDocRef.update(player).then(function () {
    //     console.log("Player updated");
    //     that.updatePlayer = false;
    //   }).catch(function (error) {
    //     console.error("Error updating player: ", error);
    //     that.updatePlayer = false;
    //   });
    // } else {
    //   playerDocRef.update(player).then(function () {
    //     // offline ignored :(
    //   }).catch(function () {
    //   });
    //
    //   console.log("Player updated");
    //   that.updatePlayer = false;
    //   that.messageService.add(
    //     {
    //       severity: 'success',
    //       summary: 'Update',
    //       detail: 'ATTENTION Player updated offline! Go online to sync data'
    //     }
    //   );
    // }
  }

  changeGameSystems(event: any, player: Player) {

    console.log("changeGameSystems: " + event.value);

    _.forEach(this.gameSystems, function (gameSystem: string) {
      player.gameSystems[gameSystem] = !!_.includes(event.value, gameSystem);
    });

    this.playerToChange = player;
  }
}
