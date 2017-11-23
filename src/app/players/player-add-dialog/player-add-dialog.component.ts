import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {SelectItem} from "primeng/primeng";
import {MessageService} from "primeng/components/common/messageservice";
import {AngularFirestore} from "angularfire2/firestore";
import {getGameSystems, getGameSystemsAsSelectItems} from "../../models/game-systems";
import {Player} from "../../models/Player";
import * as _ from 'lodash';

import {UUID} from "angular2-uuid";
import {ConnectivityService} from "../../services/connectivity-service";

@Component({
  selector: 'ot-player-add-dialog',
  templateUrl: './player-add-dialog.component.html',
  styleUrls: ['./player-add-dialog.component.scss']
})
export class PlayerAddDialogComponent implements OnInit {

  @Output() onPlayerSaved = new EventEmitter<any>();
  @Input() allPlayersNamesMap: {};

  protected gameSystemsAsSelectItems: SelectItem[];
  protected gameSystems: string[];
  protected playerForm: FormGroup;

  playerSaving: boolean;

  protected playerNameAlreadyTaken: boolean;
  protected byeNameTaken: boolean;
  selectedPlayer: Player;
  requestDeletePlayer: boolean;

  orgaForm: FormGroup;
  passwordCorrect: boolean;
  passwordCheckIncorrect: boolean;

  constructor(private fb: FormBuilder,
              private messageService: MessageService,
              private conService: ConnectivityService,
              private afs: AngularFirestore) {
    this.gameSystemsAsSelectItems = getGameSystemsAsSelectItems();
    this.gameSystems = getGameSystems();
  }

  ngOnInit() {
      this.setEmptyForm();

    this.orgaForm = this.fb.group({
      user: [{value: 'Orga', disabled: true}, Validators.required],
      password: ['', Validators.required],
    });
  }

  setEmptyForm() {
    this.playerForm = this.fb.group({
      'name': new FormControl('', Validators.compose([Validators.required, Validators.minLength(3), Validators.maxLength(30)])),
      'location': new FormControl('', Validators.maxLength(30)),
      'team': new FormControl('', Validators.maxLength(30)),
      'gameSystems': new FormControl([], Validators.required),
    });
  }


  onSubmit() {

    const that = this;

    that.playerNameAlreadyTaken = false;
    that.byeNameTaken = false;


    if (this.allPlayersNamesMap[that.playerForm.value.name.toLowerCase().trim()]) {
      that.playerNameAlreadyTaken = true;
    }

    if (that.playerForm.value.name.toLowerCase().trim() === 'bye') {
      that.byeNameTaken = true;
    }

    if (!this.playerNameAlreadyTaken) {

      this.playerSaving = true;

      const player: Player = {
        name: this.playerForm.value.name,
        location: this.playerForm.value.location,
        team: this.playerForm.value.team,
        gameSystems: {},
        links: {}
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
          that.setEmptyForm();
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
        that.setEmptyForm();

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

  setPlayer(player: Player) {

    this.selectedPlayer = player;

    this.orgaForm = this.fb.group({
      user: [{value: 'Orga', disabled: true}, Validators.required],
      password: ['', Validators.required],
    });
  }

  reset() {
    this.selectedPlayer = undefined;
    this.passwordCorrect = false;
    this.requestDeletePlayer = false;
    this.setEmptyForm();
  }

  checkIfPasswordCorrect() {

    this.passwordCorrect = false;

    if ((this.orgaForm.get('password').value ? this.orgaForm.get('password').value : "") === "ulf123") {
      this.passwordCorrect = true;
    } else {
      this.passwordCheckIncorrect = true;
    }
  }

  deletePlayer() {

    const that = this;
    this.playerSaving = true;

    if (this.conService.isOnline()) {
      this.afs.firestore.doc('players/' + this.selectedPlayer.id).delete().then(function () {
        that.messageService.add({severity: 'success', summary: 'Deletion', detail: 'Player deleted'});
        that.playerSaving = false;
        that.onPlayerSaved.emit();
        that.reset();
      }).catch(function (error) {
        console.error("Error deleting Player: ", error);
        that.messageService.add({severity: 'error', summary: 'Deletion', detail: 'Player creation failed'});
        that.playerSaving = false;
      });
    } else {
      this.afs.firestore.doc('players/' + this.selectedPlayer.id).delete().then(function () {
        // ignored offline
      });
      that.messageService.add({
        severity: 'success',
        summary: 'Deletion',
        detail: 'ATTENTION Player deleted offline! Go online to sync data'
      });
      that.playerSaving = false;
      that.onPlayerSaved.emit();
      that.reset();
    }
  }
}
