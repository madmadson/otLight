import {Component, EventEmitter, OnDestroy, OnInit, Output} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {SelectItem} from "primeng/primeng";
import {MessageService} from "primeng/components/common/messageservice";
import {AngularFirestore} from "angularfire2/firestore";
import {FieldValues, getGameSystems, getGameSystemsAsSelectItems} from "../../models/game-systems";
import {getPlayerForJSON, Player} from "../../models/Player";
import * as _ from 'lodash';
import * as firebase from "firebase/app";
import CollectionReference = firebase.firestore.CollectionReference;
import {UUID} from "angular2-uuid";
import {ConnectivityService} from "../../services/connectivity-service";

@Component({
  selector: 'app-player-add-dialog',
  templateUrl: './player-add-dialog.component.html',
  styleUrls: ['./player-add-dialog.component.scss']
})
export class PlayerAddDialogComponent implements OnInit, OnDestroy {

  @Output() onPlayerSaved = new EventEmitter<any>();

  protected gameSystemsAsSelectItems: SelectItem[];
  protected gameSystems: string[];
  protected playerForm: FormGroup;

  playerSaving: boolean;

  protected allPlayersToCheck: Player[] = [];
  protected playersColRef: CollectionReference;
  protected playersUnsubscribeFunction: () => void;
  protected playerNameAlreadyTaken: boolean;
  protected byeNameTaken: boolean;

  constructor(private fb: FormBuilder,
              private messageService: MessageService,
              private conService: ConnectivityService,
              private afs: AngularFirestore) {
    this.gameSystemsAsSelectItems = getGameSystemsAsSelectItems();
    this.gameSystems = getGameSystems();
    this.playersColRef = this.afs.firestore.collection('players');
  }

  ngOnInit() {

    const that = this;

    this.playersUnsubscribeFunction = this.playersColRef.onSnapshot(function (querySnapshot) {
      querySnapshot.forEach(function (doc) {

        const player: Player = getPlayerForJSON(doc.id, doc.data());
        that.allPlayersToCheck.push(player);
      });
    });

    this.playerForm = this.fb.group({
      'name': new FormControl('', Validators.compose([Validators.required, Validators.minLength(3), Validators.maxLength(30)])),
      'location': new FormControl('', Validators.maxLength(30)),
      'gameSystems': new FormControl([], Validators.required),
    });
  }

  ngOnDestroy() {
    this.playersUnsubscribeFunction();
  }

  onSubmit() {

    const that = this;

    that.playerNameAlreadyTaken = false;
    that.byeNameTaken = false;

    _.forEach(this.allPlayersToCheck, function (playerToCheck: Player) {
      if (playerToCheck.name.toLowerCase() === that.playerForm.value.name.toLowerCase().trim()) {
        that.playerNameAlreadyTaken = true;
      }
    });

    if (that.playerForm.value.name.toLowerCase().trim() === 'bye') {
      that.byeNameTaken = true;
    }

    if (!this.playerNameAlreadyTaken) {

      this.playerSaving = true;

      const player: Player = {
        name: this.playerForm.value.name,
        location: this.playerForm.value.location,
        gameSystems: {}
      };

      _.forEach(this.gameSystems, function (gameSystem: string) {
        if (_.includes(that.playerForm.value.gameSystems, gameSystem)) {
          player.gameSystems[gameSystem] = true;
        }
      });

      const uuid = UUID.UUID();
      player.id = uuid;

      if (this.conService.isOnline()) {
        this.afs.firestore.doc('players/' + uuid).set(player).then(function () {
          console.log("Player written with ID: ", player.id);

          that.onPlayerSaved.emit();

          that.messageService.add({severity: 'success', summary: 'Creation', detail: 'Player created'});
          that.playerSaving = false;
        }).catch(function (error) {
          console.error("Error writing Player: ", error);
          that.messageService.add({severity: 'error', summary: 'Creation', detail: 'Player creation failed'});
          that.playerSaving = false;
        });
      } else {
        this.afs.firestore.doc('players/' + uuid).set(player).then(function () {
          // ignored is offline :/
        }).catch(function () {
          // ignored is offline :/
        });

        console.log("Player written with ID: ", player.id);

        that.onPlayerSaved.emit();
        that.playerSaving = false;

        that.messageService.add(
          {
            severity: 'success',
            summary: 'Creation',
            detail: 'ATTENTION Player created offline! Go online to sync data'
          }
        );
      }
    }
  }

  nameChanged() {

    this.playerNameAlreadyTaken = false;
  }
}
