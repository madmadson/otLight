import {Component, OnDestroy, OnInit} from '@angular/core';

import {AngularFirestore} from "angularfire2/firestore";
import {UUID} from "angular2-uuid";
import * as _ from 'lodash';

import {Tournament} from "../../models/Tournament";
import {Participant} from "../../models/Participant";
import * as firebase from "firebase/app";
import CollectionReference = firebase.firestore.CollectionReference;

import 'rxjs/add/observable/from';
import {GameSystemService} from "../../services/game-system.service";
import {Subscription} from "rxjs/Subscription";
import {getGameSystems} from "../../models/game-systems";
import {SelectItem} from "primeng/primeng";
import {Router} from "@angular/router";

@Component({
  selector: 'app-tournaments',
  templateUrl: './tournaments.component.html',
  styleUrls: ['./tournaments.component.scss']
})
export class TournamentsComponent implements OnInit, OnDestroy {

  protected selectedTournament: Tournament;

  protected newParticipantName: string;
  protected selectedGameSystem: string;

  protected playerCounter = 1;

  protected participants: Participant[] = [];
  protected tournaments: Tournament[] = [];

  protected tournamentsLoaded: boolean;

  protected tournamentsColRef: CollectionReference;
  protected tournamentsUnsubscribeFunction: () => void;
  protected gameSystemSubscription: Subscription;
  protected gameSystems: SelectItem[];

  constructor(protected afs: AngularFirestore,
              protected router: Router,
              protected gameSystemService: GameSystemService) {

    this.tournamentsColRef = this.afs.firestore.collection('tournaments');

     this.gameSystems = getGameSystems();
    this.selectedGameSystem = this.gameSystems[0].value;
  }

  ngOnInit() {

    this.subscribeOnTournaments();

    this.gameSystemSubscription = this.gameSystemService.getGameSystem().subscribe(gameSystem => {
      console.log("gameSystem updated: " + gameSystem);
      this.selectedGameSystem = gameSystem;
      this.subscribeOnTournaments();
    });
  }

  ngOnDestroy() {
    this.tournamentsUnsubscribeFunction();
    this.gameSystemSubscription.unsubscribe();
  }


  showTournament(tournament: Tournament) {

    const that = this;

    this.participants = [];

    this.selectedTournament = tournament;

    const participantsCollectionRef = this.afs.firestore.collection('tournaments/' + this.selectedTournament.id + '/participants');

    participantsCollectionRef.onSnapshot(function (snapshot) {

      snapshot.docChanges.forEach(function (change) {
        if (change.type === "added") {

          const participant: Participant = {
            id: change.doc.id,
            firstName: change.doc.data().firstName,
            nickName: change.doc.data().nickName,
            lastName: change.doc.data().lastName,
          };

          that.participants.push(participant);
        }
        if (change.type === "modified") {

          const participant: Participant = {
            id: change.doc.id,
            firstName: change.doc.data().firstName,
            nickName: change.doc.data().nickName,
            lastName: change.doc.data().lastName,
          };

          const index = _.findIndex(that.participants, ['id', change.doc.id]);
          that.participants[index] = participant;
        }
        if (change.type === "removed") {

          const index = _.findIndex(that.participants, ['id', change.doc.id]);
          that.participants.splice(index, 1);
        }
      });
    });
  }

  editTournament(event: any) {

    const tournament: Tournament = {
      id: event.data.id,
      name: event.data.name,
      gameSystem: event.data.gameSystem
    };

    const tournamentDocRef = this.afs.firestore.doc('tournaments/' + tournament.id);

    tournamentDocRef.update(tournament).then(function () {
      console.log("Tournament updated");
    }).catch(function (error) {
      console.error("Error updating tournament: ", error);
    });
  }

  changeTournamentGameSystem(event: any, tournament: Tournament) {

    tournament.gameSystem = event.value;

    const tournamentDocRef = this.afs.firestore.doc('tournaments/' + tournament.id);

    tournamentDocRef.update(tournament).then(function () {
      console.log("Tournament GameSystem updated");
    }).catch(function (error) {
      console.error("Error updating tournament: ", error);
    });
  }


  addParticipant() {

    if (this.newParticipantName) {

      const participant: Participant = {
        firstName: this.newParticipantName,
        nickName: 'Nickname',
        lastName: 'Lastname'
      };

      const participantsDocRef = this.tournamentsColRef.doc(this.selectedTournament.id).collection('participants');
      participantsDocRef.add(participant).then(function (participantDocRef) {
        console.log("Participant written with ID: ", participantDocRef.id);
      }).catch(function (error) {
        console.error("Error writing participant: ", error);
      });
    }
  }

  deleteAndAdd() {

    this.deleteAllParticipantBatched2();
    this.add200ParticipantBatch();
  }

  add200ParticipantBatch() {

    const batch = this.afs.firestore.batch();

    for (let i = 0; i < 20; i++) {

      const uuid = UUID.UUID();
      const newParticipantDocRef = this.afs.firestore.doc('tournaments/' + this.selectedTournament.id + '/participants/' + uuid);

      const participant: Participant = {
        firstName: 'Player ' + this.playerCounter,
        nickName: 'Nickname',
        lastName: 'Lastname'
      };

      this.playerCounter++;
      batch.set(newParticipantDocRef, participant);
    }

    batch.commit().then(function () {
      console.log("BATCH 200 participants!");
    }).catch(function (error) {
      console.error("Error BATCH 200 participants: ", error);
    });
  }

  add200Participant() {

    for (let i = 0; i < 20; i++) {

      const participantsRef = this.afs.firestore.collection('tournaments/' + this.selectedTournament.id + '/participants');

      const participant: Participant = {
        firstName: 'Player ' + this.playerCounter,
        nickName: 'Nickname',
        lastName: 'Lastname'
      };

      this.playerCounter++;
      participantsRef.add(participant).then(function () {
        // console.log(" 200 participants!");
      }).catch(function (error) {
        console.error("Error 200 participants: ", error);
      });
    }
  }


  deleteParticipant(participant: Participant) {
    const participantsDocRef = this.tournamentsColRef.doc(this.selectedTournament.id).collection('participants').doc(participant.id);
    participantsDocRef.delete().then(function () {
      console.log("Participant successfully deleted!");
    }).catch(function (error) {
      console.error("Error removing document: ", error);
    });
  }

  deleteAllParticipantBatched(): Promise<void> {

    const that = this;

    return this.afs.firestore.collection('tournaments/' + this.selectedTournament.id + '/participants')
      .get()
      .then(function (querySnapshot) {

        const batch = that.afs.firestore.batch();

        querySnapshot.forEach(function (doc) {
          batch.delete(doc.ref);
        });

        return batch.commit();

        // batch.commit().then(function () {
        //   console.log('delete ALL batched!');
        // }).catch(function(error) {
        //   console.error("Error deleteALL batched: ", error);
        // });
      });
  }

  deleteAllParticipant() {

    const that = this;

    if (this.participants) {

      _.forEach(this.participants, function (participant: Participant) {
        that.afs.firestore.doc('tournaments/' + that.selectedTournament.id + '/participants/' + participant.id).delete().then(function () {
          console.log("Participant successfully deleted!");
        }).catch(function (error) {
          console.error("Error removing document: ", error);
        });
      });

    }
  }

  deleteAllParticipantBatched2() {

    const that = this;

    if (this.participants) {

      const batch = that.afs.firestore.batch();

      _.forEach(this.participants, function (participant: Participant) {
        const docRef = that.afs.firestore.doc('tournaments/' + that.selectedTournament.id + '/participants/' + participant.id);

        batch.delete(docRef);
      });
      batch.commit().then(function () {
        console.log('delete ALL batched!');
      }).catch(function (error) {
        console.error("Error deleteALL batched: ", error);
      });
    }
  }


  protected subscribeOnTournaments() {

    const that = this;
    that.tournamentsLoaded = false;
    that.tournaments = [];

    if (this.tournamentsUnsubscribeFunction) {
      this.tournamentsUnsubscribeFunction();
    }

    this.tournamentsUnsubscribeFunction = this.tournamentsColRef
      .where('gameSystem', '==', this.selectedGameSystem)
      .onSnapshot(function (snapshot) {

        snapshot.docChanges.forEach(function (change) {
          if (change.type === "added") {

            const newTournaments = _.cloneDeep(that.tournaments);

            const tournament: Tournament = {
              id: change.doc.id,
              name: change.doc.data().name,
              gameSystem: change.doc.data().gameSystem,
              password: change.doc.data().password
            };

            newTournaments.push(tournament);
            that.tournaments = newTournaments;
          }
          if (change.type === "modified") {

            const newTournaments = _.cloneDeep(that.tournaments);

            const tournament: Tournament = {
              id: change.doc.id,
              name: change.doc.data().name,
              gameSystem: change.doc.data().gameSystem,
              password: change.doc.data().password
            };

            const index = _.findIndex(newTournaments, ['id', change.doc.id]);
            newTournaments[index] = tournament;
            that.tournaments = newTournaments;
          }
          if (change.type === "removed") {

            const newTournaments = _.cloneDeep(that.tournaments);

            const index = _.findIndex(newTournaments, ['id', change.doc.id]);
            newTournaments.splice(index, 1);

            that.tournaments = newTournaments;
          }
        });

        that.tournamentsLoaded = true;
      });
  }

}
