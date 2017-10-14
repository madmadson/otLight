import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {getGameSystems} from "../../models/game-systems";
import {SelectItem} from "primeng/primeng";
import {Tournament} from "../../models/Tournament";
import {AngularFirestore} from "angularfire2/firestore";
import {FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {MessageService} from "primeng/components/common/messageservice";
import * as firebase from "firebase/app";
import CollectionReference = firebase.firestore.CollectionReference;
import * as _ from 'lodash';

@Component({
  selector: 'app-tournament-add-dialog',
  templateUrl: './tournament-add-dialog.component.html',
  styleUrls: ['./tournament-add-dialog.component.scss']
})
export class TournamentAddDialogComponent implements OnInit, OnDestroy {

  @Input() gameSystem: string;
  @Output() onTournamentSaved = new EventEmitter<any>();


  protected gameSystems: SelectItem[];
  protected tournamentForm: FormGroup;

  protected allTournamentsToCheck: Tournament[] = [];
  protected tournamentsColRef: CollectionReference;
  protected tournamentsUnsubscribeFunction: () => void;
  protected tournamentNameAlreadyTaken: boolean;

  constructor(private fb: FormBuilder,
              private  messageService: MessageService,
              private afs: AngularFirestore) {
    this.gameSystems = getGameSystems();
    this.tournamentsColRef = this.afs.firestore.collection('tournaments');
  }

  ngOnInit() {

    const that = this;

    this.tournamentsUnsubscribeFunction = this.tournamentsColRef.onSnapshot(function(querySnapshot) {
        querySnapshot.forEach(function(doc) {

          const tournament: Tournament = {
            id: doc.id,
            name: doc.data().name,
            gameSystem: doc.data().gameSystem,
            password: doc.data().password
          };
          that.allTournamentsToCheck.push(tournament);
        });
      });

    this.tournamentForm = this.fb.group({
      'name': new FormControl('', Validators.required),
      'gameSystem': new FormControl({value: this.gameSystem, disabled: true}, Validators.required),
      'password': new FormControl('', Validators.minLength(6))
    });

  }

  ngOnDestroy() {
    this.tournamentsUnsubscribeFunction();
  }

  onSubmit() {

    const that = this;

    that.tournamentNameAlreadyTaken = false;

    const tournament: Tournament = {
      name: this.tournamentForm.value.name,
      password: this.tournamentForm.value.password,
      gameSystem: this.gameSystem
    };

    _.forEach(this.allTournamentsToCheck, function (tournamentToCheck: Tournament) {

      if (tournamentToCheck.name === tournament.name) {
        that.tournamentNameAlreadyTaken = true;
      }
    });


    if (!this.tournamentNameAlreadyTaken) {
      this.afs.firestore.collection('tournaments').add(tournament).then(function (docRef) {
        console.log("Tournament written with ID: ", docRef.id);

        that.onTournamentSaved.emit();

        that.messageService.add({severity: 'success', summary: 'Creation', detail: 'Tournament created'});
      }).catch(function (error) {
        console.error("Error writing tournament: ", error);
      });
    }
  }

  nameChanged() {

    this.tournamentNameAlreadyTaken = false;
  }
}
