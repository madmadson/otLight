import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';

import {SelectItem} from "primeng/primeng";
import {getTournamentForJSON, Tournament} from "../../models/Tournament";
import {AngularFirestore} from "angularfire2/firestore";
import {FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {MessageService} from "primeng/components/common/messageservice";
import * as firebase from "firebase/app";
import CollectionReference = firebase.firestore.CollectionReference;
import * as _ from 'lodash';
import {getGameSystemsAsSelectItems} from "../../models/game-systems";
import {UUID} from "angular2-uuid";
import {ConnectivityService} from "../../services/connectivity-service";

@Component({
  selector: 'app-tournament-add-dialog',
  templateUrl: './tournament-add-dialog.component.html',
  styleUrls: ['./tournament-add-dialog.component.scss']
})
export class TournamentAddDialogComponent implements OnInit, OnDestroy {

  @Input() gameSystem: string;
  @Output() onTournamentSaved = new EventEmitter<any>();

  tournamentForm: FormGroup;
  tournamentNameAlreadyTaken: boolean;
  allGameSystems: SelectItem[];
  tournamentSaving: boolean;

  protected allTournamentsToCheck: Tournament[] = [];
  protected tournamentsColRef: CollectionReference;
  protected tournamentsUnsubscribeFunction: () => void;

  constructor(private fb: FormBuilder,
              private messageService: MessageService,
              private afs: AngularFirestore,
              private conService: ConnectivityService) {

    this.tournamentsColRef = this.afs.firestore.collection('tournaments');

    this.allGameSystems = getGameSystemsAsSelectItems();
  }

  ngOnInit() {

    const that = this;

    this.tournamentsUnsubscribeFunction = this.tournamentsColRef.onSnapshot(function (querySnapshot) {
      querySnapshot.forEach(function (doc) {

        const tournament: Tournament = getTournamentForJSON(doc.id, doc.data());
        that.allTournamentsToCheck.push(tournament);
      });
    });

    this.tournamentForm = this.fb.group({
      'name': new FormControl('', Validators.required),
      'gameSystem': new FormControl(this.gameSystem, Validators.required),
      'password': new FormControl('', Validators.minLength(6)),
      'type': new FormControl('solo'),
    });

  }

  ngOnDestroy() {
    this.tournamentsUnsubscribeFunction();
  }

  onSubmit() {

    const that = this;
    this.tournamentSaving = true;

    that.tournamentNameAlreadyTaken = false;

    const tournament: Tournament = {
      name: this.tournamentForm.value.name.trim(),
      password: this.tournamentForm.value.password.trim(),
      gameSystem: this.tournamentForm.value.gameSystem,
      type: this.tournamentForm.value.type,
      actualRound: 0,
      publishedRound: 0,
      status: 'CREATED',
    };

    _.forEach(this.allTournamentsToCheck, function (tournamentToCheck: Tournament) {

      if (tournamentToCheck.name === tournament.name) {
        that.tournamentNameAlreadyTaken = true;
      }
    });


    if (!this.tournamentNameAlreadyTaken) {

      const uuid = UUID.UUID();
      tournament.id = uuid;

      if (this.conService.isOnline()) {
        this.afs.firestore.doc('tournaments/' + uuid).set(tournament).then(function () {
          console.log("Tournament written with ID: ", tournament.id);

          that.onTournamentSaved.emit();
          that.tournamentSaving = false;

          that.messageService.add({severity: 'success', summary: 'Creation', detail: 'Tournament created'});
        }).catch(function (error) {
          console.error("Error writing tournament: ", error);
          that.tournamentSaving = false;
        });
      } else {
        this.afs.firestore.doc('tournaments/' + uuid).set(tournament).then(function () {
          // ignored is offline :/
        }).catch(function () {
          // ignored is offline :/
        });

        console.log("Tournament written with ID: ", tournament.id);

        that.onTournamentSaved.emit();
        that.tournamentSaving = false;

        that.messageService.add(
          {
            severity: 'success',
            summary: 'Creation',
            detail: 'ATTENTION Tournament created offline! Go online to sync data'
          }
        );
      }
    }
  }

  nameChanged() {

    this.tournamentNameAlreadyTaken = false;
  }
}
