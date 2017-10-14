import {Component, EventEmitter, OnDestroy, OnInit, Output} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {SelectItem} from "primeng/primeng";
import {MessageService} from "primeng/components/common/messageservice";
import {AngularFirestore} from "angularfire2/firestore";
import {getGameSystems} from "../../models/game-systems";
import {Player} from "../../models/Player";
import * as _ from 'lodash';
import * as firebase from "firebase/app";
import CollectionReference = firebase.firestore.CollectionReference;

@Component({
  selector: 'app-player-add-dialog',
  templateUrl: './player-add-dialog.component.html',
  styleUrls: ['./player-add-dialog.component.scss']
})
export class PlayerAddDialogComponent implements OnInit, OnDestroy {

  @Output() onPlayerSaved = new EventEmitter<any>();

  protected gameSystems: SelectItem[];
  protected playerForm: FormGroup;

  protected allPlayersToCheck: Player[] = [];
  protected playersColRef: CollectionReference;
  protected playersUnsubscribeFunction: () => void;
  protected playerNameAlreadyTaken: boolean;

  constructor(private fb: FormBuilder,
              private messageService: MessageService,
              private afs: AngularFirestore) {
    this.gameSystems = getGameSystems();
    this.playersColRef = this.afs.firestore.collection('players');
  }

  ngOnInit() {

    const that = this;

    this.playersUnsubscribeFunction = this.playersColRef.onSnapshot(function(querySnapshot) {
      querySnapshot.forEach(function(doc) {

        const player: Player = {
          id: doc.id,
          name: doc.data().name,
          location: doc.data().location,
          gameSystems: doc.data().gameSystems,
        };

        console.log('player: ' + JSON.stringify(player));

        that.allPlayersToCheck.push(player);
      });
    });

    this.playerForm = this.fb.group({
      'name': new FormControl('', Validators.compose([Validators.required, Validators.maxLength(30)])),
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

    const player: Player = {
      name: this.playerForm.value.name,
      location: this.playerForm.value.location,
      gameSystems: {
        WmHo: _.includes(this.playerForm.value.gameSystems, 'WmHo'),
        GuildBall: _.includes(this.playerForm.value.gameSystems, 'GuildBall')
      }
    };

    _.forEach(this.allPlayersToCheck, function (playerToCheck: Player) {

      if (playerToCheck.name === player.name) {
        that.playerNameAlreadyTaken = true;
      }

    });

    if (!this.playerNameAlreadyTaken) {

      this.afs.firestore.collection('players').add(player).then(function (docRef) {
        console.log("Player written with ID: ", docRef.id);

        that.onPlayerSaved.emit();

        that.messageService.add({severity: 'success', summary: 'Creation', detail: 'Player created'});
      }).catch(function (error) {
        console.error("Error writing Player: ", error);
      });
    }
  }

  nameChanged() {

    this.playerNameAlreadyTaken = false;
  }
}
