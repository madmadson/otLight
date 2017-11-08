import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

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
  selector: 'ot-tournament-add-dialog',
  templateUrl: './tournament-add-dialog.component.html',
  styleUrls: ['./tournament-add-dialog.component.scss']
})
export class TournamentAddDialogComponent implements OnInit {

  @Input() gameSystem: string;
  @Input() allTournaments: Tournament[];
  @Output() onTournamentSaved = new EventEmitter<any>();

  tournamentForm: FormGroup;
  tournamentNameAlreadyTaken: boolean;
  allGameSystems: SelectItem[];
  tournamentSaving: boolean;
  selectedTournament: Tournament;
  requestDeleteTournament: boolean;

  protected tournamentsColRef: CollectionReference;

  orgaForm: FormGroup;
  passwordCorrect: boolean;
  passwordCheckIncorrect: boolean;

  constructor(private fb: FormBuilder,
              private messageService: MessageService,
              private afs: AngularFirestore,
              private conService: ConnectivityService) {

    this.tournamentsColRef = this.afs.firestore.collection('tournaments');
    this.allGameSystems = getGameSystemsAsSelectItems();
  }

  ngOnInit() {
    this.tournamentForm = this.fb.group({
      'name': new FormControl('', Validators.required),
      'gameSystem': new FormControl(this.gameSystem, Validators.required),
      'password': new FormControl('', Validators.minLength(6)),
      'type': new FormControl('solo'),
      'teamSize': new FormControl('3'),
    });
    this.orgaForm = this.fb.group({
      user: [{value: 'Orga', disabled: true}, Validators.required],
      password: ['', Validators.required],
    });
  }

  onSubmit() {

    const that = this;
    that.tournamentNameAlreadyTaken = false;

    _.forEach(this.allTournaments, function (tournamentToCheck: Tournament) {

      if (tournamentToCheck.name.toLowerCase() === that.tournamentForm.value.name.trim()) {
        that.tournamentNameAlreadyTaken = true;
      }
    });


    if (!this.tournamentNameAlreadyTaken) {

      this.tournamentSaving = true;

      let tournament: Tournament;

      if (!this.selectedTournament) {

        tournament = {
          name: this.tournamentForm.value.name.trim(),
          password: this.tournamentForm.value.password.trim(),
          gameSystem: this.tournamentForm.value.gameSystem,
          type: this.tournamentForm.value.type,
          teamSize: this.tournamentForm.value.teamSize ? this.tournamentForm.value.teamSize : 0,
          actualRound: 0,
          publishedRound: 0,
          state: 'CREATED',
        };
        const uuid = UUID.UUID();
        tournament.id = uuid;
      } else {
        tournament = {
          id: this.selectedTournament.id,
          name: this.tournamentForm.value.name.trim(),
          password: this.tournamentForm.value.password.trim(),
          gameSystem: this.tournamentForm.value.gameSystem,
          type: this.tournamentForm.value.type,
          teamSize: this.tournamentForm.value.teamSize ? this.tournamentForm.value.teamSize : 0,
          actualRound: this.selectedTournament.actualRound,
          publishedRound: this.selectedTournament.publishedRound,
          state: this.selectedTournament.state,
        };
      }


      if (this.conService.isOnline()) {
        this.afs.firestore.doc('tournaments/' + tournament.id).set(tournament).then(function () {
          console.log("Tournament written with ID: ", tournament.id);

          that.onTournamentSaved.emit();
          that.tournamentSaving = false;

          if (that.selectedTournament) {
            that.messageService.add({severity: 'success', summary: 'Update', detail: 'Tournament updated'});
          } else {
            that.messageService.add({severity: 'success', summary: 'Creation', detail: 'Tournament created'});
          }
        }).catch(function (error) {
          console.error("Error writing tournament: ", error);
          that.tournamentSaving = false;
        });
      } else {
        this.afs.firestore.doc('tournaments/' + tournament.id).set(tournament).then(function () {
          // ignored is offline :/
        }).catch(function () {
        });

        console.log("Tournament written with ID: ", tournament.id);

        that.onTournamentSaved.emit();
        that.tournamentSaving = false;

        if (that.selectedTournament) {
          that.messageService.add({severity: 'success', summary: 'Update', detail: 'Tournament updated'});
        } else {
          that.messageService.add({severity: 'success', summary: 'Creation', detail: 'Tournament created'});
        }
      }
    }
  }

  nameChanged() {

    this.tournamentNameAlreadyTaken = false;
  }

  setTournament(tournament: Tournament) {

    this.selectedTournament = tournament;

    this.tournamentForm = this.fb.group({
      'name': new FormControl(tournament.name, Validators.required),
      'gameSystem': new FormControl(tournament.gameSystem, Validators.required),
      'password': new FormControl(tournament.password, Validators.minLength(6)),
      'type': new FormControl(tournament.type),
      'teamSize': new FormControl(tournament.teamSize),
    });

    this.orgaForm = this.fb.group({
      user: [{value: 'Orga', disabled: true}, Validators.required],
      password: ['', Validators.required],
    });
  }

  checkIfPasswordCorrect() {

    this.passwordCorrect = false;

    if ((this.orgaForm.get('password').value ? this.orgaForm.get('password').value : "") === this.selectedTournament.password) {
      this.passwordCorrect = true;
    } else {
      this.passwordCheckIncorrect = true;
    }
  }

  reset() {
    this.selectedTournament = undefined;
    this.requestDeleteTournament = false;
    this.passwordCorrect = false;
  }

  deleteTournament() {

    const that = this;
    this.tournamentSaving = true;

    const batch = this.afs.firestore.batch();

    const participantsColRef = this.afs.firestore.collection('tournaments/' + this.selectedTournament.id + '/participants');

    participantsColRef.get().then(playersSnapshot => {
      playersSnapshot.docs.forEach(function (doc) {
        batch.delete(doc.ref);
      });

      if (this.selectedTournament.type === 'team') {

        const teamsColRef = this.afs.firestore.collection('tournaments/' + this.selectedTournament.id + '/teams');

        teamsColRef.get().then(teamsSnapshot => {
          teamsSnapshot.docs.forEach(function (doc) {
            batch.delete(doc.ref);
          });

          that.commitTournamentDeletion(batch);
        });

      } else {

        that.commitTournamentDeletion(batch);
      }
    });


  }

  private commitTournamentDeletion(batch: firebase.firestore.WriteBatch) {

    const that = this;

    const tournamentDocRef = this.afs.firestore.doc('tournaments/' + this.selectedTournament.id);
    batch.delete(tournamentDocRef);

    if (this.conService.isOnline()) {
      batch.commit().then(function () {
        console.log("Tournament deleted!");

        that.onTournamentSaved.emit();
        that.tournamentSaving = false;
        that.messageService.add({severity: 'success', summary: 'Deletion', detail: 'Tournament deleted'});
      }).catch(function (error) {
        console.error("Error deleting tournament: ", error);
        that.tournamentSaving = false;
      });
    } else {
      batch.commit().then(function () {
        // ignored is offline :/
      }).catch(function () {
      });

      that.onTournamentSaved.emit();
      that.tournamentSaving = false;
      that.messageService.add(
        {
          severity: 'success',
          summary: 'Deletion',
          detail: 'ATTENTION Tournament deleted offline! Go online to sync data'
        }
      );
    }
  }
}
