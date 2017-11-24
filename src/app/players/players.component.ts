import {Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
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
import {ActivatedRoute} from "@angular/router";
import {BatchService} from "../services/batch.service";
import {TopBarMenuService} from "../services/topBarMenu.service";
import {PlayerAddDialogComponent} from "./player-add-dialog/player-add-dialog.component";


@Component({
  selector: 'ot-players',
  templateUrl: './players.component.html',
  styleUrls: ['./players.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class PlayersComponent implements OnInit, OnDestroy {

  stacked: boolean;
  playersLoaded: boolean;
  updatePlayer: boolean;
  selectedGameSystem: string;

  @ViewChild('playerDialog') playerDialog: PlayerAddDialogComponent;

  protected allPlayers: Player[] = [];
  protected allPlayersForSelectedGameSystem: Player[] = [];
  protected gameSystemSubscription: Subscription;
  protected playersColRef: CollectionReference;
  protected playersUnsubscribeFunction: (() => void);
  protected gameSystemConfig: GameSystemConfig;
  protected gameSystemsAsSelectItems: SelectItem[];
  protected gameSystems: string[];
  protected playerToChange: Player;

  protected playerNamesMap: {};
  protected displayedPlayerNamesMap: {};

  addPlayerDialogVisibility: boolean;
  private routerSub: Subscription;

  constructor(private afs: AngularFirestore,
              private batchService: BatchService,
              private route: ActivatedRoute,
              private topBarMenuService: TopBarMenuService,
              protected gameSystemService: GameSystemService) {
    this.playersColRef = this.afs.firestore.collection('players');

    this.selectedGameSystem = this.gameSystemService.getGameSystem();

    this.gameSystemConfig = getGameSystemConfig(this.selectedGameSystem);

    this.gameSystemsAsSelectItems = getGameSystemsAsSelectItems();
    this.gameSystems = getGameSystems();

    this.routerSub = this.route
      .paramMap
      .map(params => {
        console.log('params: ' + JSON.stringify(params));
        if (params.get('new')) {
          this.addPlayerDialogVisibility = true;
        }
      }).subscribe();

    this.topBarMenuService.setTopBarVisibility(true);
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
    that.playerNamesMap = {};
    that.displayedPlayerNamesMap = {};

    if (this.playersUnsubscribeFunction) {
      this.playersUnsubscribeFunction();
    }

    this.playersUnsubscribeFunction = this.playersColRef
      .orderBy('name', 'asc')
      .onSnapshot(function (snapshot) {
        const clonedPlayers = _.cloneDeep(that.allPlayers);
        const clonedPlayersForSelectedGameSystem = _.cloneDeep(that.allPlayersForSelectedGameSystem);

        snapshot.docChanges.forEach(function (change) {
          if (change.type === "added") {
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

            clonedPlayers.push(player);
            that.playerNamesMap[player.name.toLowerCase()] = player;

            if (_.includes(player.myGameSystems, that.selectedGameSystem)) {
              clonedPlayersForSelectedGameSystem.push(player);
              that.displayedPlayerNamesMap[player.name.toLowerCase()] = player;
            }
          }
          if (change.type === "modified") {

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

            const index = _.findIndex(clonedPlayers, ['id', change.doc.id]);
            clonedPlayers[index] = player;

            if (that.displayedPlayerNamesMap[player.name.toLowerCase()]) {
              const indexForSelected = _.findIndex(clonedPlayersForSelectedGameSystem, ['id', change.doc.id]);
              clonedPlayersForSelectedGameSystem[indexForSelected] = player;
            }
          }
          if (change.type === "removed") {
            const index = _.findIndex(clonedPlayers, ['id', change.doc.id]);
            const playerToDelete = clonedPlayers[index];
            clonedPlayers.splice(index, 1);

            if (that.displayedPlayerNamesMap[playerToDelete.name.toLowerCase()]) {
              const indexForSelected = _.findIndex(clonedPlayersForSelectedGameSystem, ['id', change.doc.id]);
              clonedPlayersForSelectedGameSystem.splice(indexForSelected, 1);
            }
          }
        });
        that.allPlayers = clonedPlayers;
        that.allPlayersForSelectedGameSystem = clonedPlayersForSelectedGameSystem;

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
    }
  }

  onEditPlayer(event: any) {
    console.log(event.data);
    const that = this;

    const playerDocRef = this.playersColRef.doc(event.data.id);
    const player: Player = getPlayerForJSON(event.data.id, event.data);
    delete player.myGameSystems;

    that.batchService.set(playerDocRef, player);
  }

  addLinkToPlayer(event, player: Player) {
    console.log('addLinkToPlayer: ' + JSON.stringify(player));

    const linkValue = event.target.value;

    if (linkValue && linkValue !== '') {
      console.log('link: ' + linkValue);

      if (!player.links) {
        player.links = {};
      }
      if (!player.links[this.selectedGameSystem]) {
        player.links[this.selectedGameSystem] = [];
      }
      player.links[this.selectedGameSystem].push(linkValue);

      const playerDocRef = this.playersColRef.doc(player.id);
      this.batchService.set(playerDocRef, player);

      event.target.value = '';
    }
  }

  removeList(event, player: Player, index: number) {

    event.preventDefault();
    event.stopPropagation();

    console.log('removeList: ' + index);

    player.links[this.selectedGameSystem].splice(index, 1);
    const playerDocRef = this.playersColRef.doc(player.id);
    this.batchService.set(playerDocRef, player);

  }

  changeGameSystems(event: any, player: Player) {

    console.log("changeGameSystems: " + event.value);

    _.forEach(this.gameSystems, function (gameSystem: string) {
      player.gameSystems[gameSystem] = !!_.includes(event.value, gameSystem);
    });

    this.playerToChange = player;
  }

  openPlayerEdit(player: Player) {

    this.addPlayerDialogVisibility = true;
    this.playerDialog.setPlayer(player);
  }

  onHidePlayerDialog() {

    this.playerDialog.reset();
  }
}
