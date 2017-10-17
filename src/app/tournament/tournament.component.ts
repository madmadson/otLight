import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute} from "@angular/router";
import {AngularFirestore} from "angularfire2/firestore";
import * as firebase from "firebase/app";
import DocumentReference = firebase.firestore.DocumentReference;
import {getTournamentForJSON, Tournament} from "../models/Tournament";
import * as _ from 'lodash';
import {getParticipantForJSON, Participant} from "../models/Participant";
import CollectionReference = firebase.firestore.CollectionReference;
import {Player} from "../models/Player";
import {GameSystemConfig, getGameSystemConfig, getScoreByGameSystem} from "../models/game-systems";
import {MessageService} from "primeng/components/common/messageservice";
import {UUID} from "angular2-uuid";
import {getRoundMatchForJSON, RoundMatch} from "../models/RoundMatch";
import {RoundMatchService} from "../services/round-match.service";

@Component({
  selector: 'app-tournament',
  templateUrl: './tournament.component.html',
  styleUrls: ['./tournament.component.scss']
})
export class TournamentComponent implements OnInit, OnDestroy {
  protected tournamentId: string;
  protected tournamentDocRef: DocumentReference;

  protected tournament: Tournament;
  protected tournamentLoaded: boolean;

  protected orgaDialogVisibility: boolean;

  protected orgaPassword: string;
  protected isOrga: boolean;
  protected passwordWrong: boolean;

  protected shownRound: number;

  protected participantsLoaded: boolean;
  protected participants: Participant[] = [];
  protected participantsNameList: string[] = [];
  protected participantsColRef: CollectionReference;
  protected participantsUnsubscribeFunction: () => void;

  protected playerToAdd: Player;
  protected possiblePlayersToAdd: Player[] = [];
  protected allPlayers: Player[] = [];
  protected gameSystemConfig: GameSystemConfig;

  protected roundLoaded: boolean;
  protected roundsColRef: CollectionReference;
  protected roundMatches: RoundMatch[] = [];
  protected roundUnsubscribeFunction: () => void;

  constructor(protected afs: AngularFirestore,
              private messageService: MessageService,
              private activeRouter: ActivatedRoute,
              private roundMatchService: RoundMatchService) {

    this.tournamentId = this.activeRouter.snapshot.paramMap.get('id');

    this.tournamentDocRef = this.afs.firestore.doc('tournaments/' + this.tournamentId);
    this.participantsColRef = this.afs.firestore.collection('tournaments/' + this.tournamentId + '/participants');
    this.roundsColRef = this.afs.firestore.collection('tournaments/' + this.tournamentId + '/roundMatches');

    this.subscribeOnParticipants();

  }

  ngOnInit() {

    const that = this;

    this.tournamentDocRef.get().then(function (doc) {

      that.tournament = getTournamentForJSON(doc.id, doc.data());
      that.shownRound = that.tournament.actualRound;

      that.subscribeOnRound(that.shownRound);

      that.gameSystemConfig = getGameSystemConfig(that.tournament.gameSystem);

      that.tournamentLoaded = true;

      that.afs.firestore.collection('players')
        .where('gameSystems.' + that.tournament.gameSystem, '==', true)
        .get().then(function (playerCol) {

        playerCol.forEach(function (playerDoc) {
          const player: Player = {
            id: playerDoc.id,
            name: playerDoc.data().name,
            location: playerDoc.data().location,
            gameSystems: playerDoc.data().gameSystems,
          };
          that.allPlayers.push(player);
        });
      });
    });
  }

  ngOnDestroy() {
    this.participantsUnsubscribeFunction();
    this.roundUnsubscribeFunction();
  }

  checkIfPasswordCorrect() {

    this.passwordWrong = false;

    if ((this.orgaPassword ? this.orgaPassword : "") === this.tournament.password) {
      this.isOrga = true;
      this.orgaDialogVisibility = false;
    } else {
      this.passwordWrong = true;
    }
  }

  protected subscribeOnParticipants() {

    const that = this;
    that.participantsLoaded = false;
    that.participants = [];

    if (this.participantsUnsubscribeFunction) {
      this.participantsUnsubscribeFunction();
    }

    this.participantsUnsubscribeFunction = this.participantsColRef
      .onSnapshot(function (snapshot) {

        snapshot.docChanges.forEach(function (change) {
          if (change.type === "added") {

            const newParticipants = _.cloneDeep(that.participants);
            const participant = getParticipantForJSON(change.doc.id, change.doc.data());

            newParticipants.push(participant);
            that.participants = newParticipants;

            that.participantsNameList.push(participant.name.toLowerCase());
          }
          if (change.type === "modified") {

            const newParticipants = _.cloneDeep(that.participants);
            const participant = getParticipantForJSON(change.doc.id, change.doc.data());

            const index = _.findIndex(that.participants, ['id', change.doc.id]);
            newParticipants[index] = participant;
            that.participants = newParticipants;
          }
          if (change.type === "removed") {
            const newParticipants = _.cloneDeep(that.participants);

            const index = _.findIndex(that.participants, ['id', change.doc.id]);
            newParticipants.splice(index, 1);
            that.participants = newParticipants;

            const nameIndex = _.findIndex(that.participants, ['name', change.doc.data().name.toLowerCase()]);
            that.participantsNameList.splice(nameIndex, 1);
          }
        });

        that.participantsLoaded = true;
      });
  }

  protected subscribeOnRound(shownRound: number) {

    const that = this;
    that.roundLoaded = false;
    that.roundMatches = [];

    if (this.roundUnsubscribeFunction) {
      this.roundUnsubscribeFunction();
    }

    this.roundUnsubscribeFunction = this.roundsColRef
      .where('round', '==', shownRound)
      .onSnapshot(function (snapshot) {

        snapshot.docChanges.forEach(function (change) {
          if (change.type === "added") {

            console.log("roundMatch added");

            const newRoundMatches = _.cloneDeep(that.roundMatches);

            const roundMatch = getRoundMatchForJSON(change.doc.id, change.doc.data());

            newRoundMatches.push(roundMatch);
            that.roundMatches = newRoundMatches;

          }
          if (change.type === "modified") {

            console.log("roundMatch modified");

            const newRoundMatches = _.cloneDeep(that.roundMatches);
            const roundMatch = getRoundMatchForJSON(change.doc.id, change.doc.data());

            const index = _.findIndex(that.roundMatches, ['id', change.doc.id]);
            newRoundMatches[index] = roundMatch;
            that.roundMatches = newRoundMatches;
          }
          if (change.type === "removed") {
            const newRoundMatches = _.cloneDeep(that.roundMatches);

            const index = _.findIndex(that.roundMatches, ['id', change.doc.id]);
            newRoundMatches.splice(index, 1);
            that.roundMatches = newRoundMatches;
          }
        });

        that.roundLoaded = true;
      });
  }

  filteredParticipants(event: any) {
    const query = event.query;

    const that = this;

    this.possiblePlayersToAdd = [];

    _.forEach(this.allPlayers, function (player: Player) {

      if (player.name.toLowerCase().indexOf(query.toLowerCase()) === 0 &&
        !_.includes(that.participantsNameList, player.name.toLowerCase())) {
        that.possiblePlayersToAdd.push(player);
      }
    });
  }

  addParticipant() {

    const that = this;

    if (this.playerToAdd) {

      const participant: Participant = {
        name: this.playerToAdd.name,
        location: this.playerToAdd.location ? this.playerToAdd.location : "",
        opponentParticipantsNames: [],
        roundScores: []
      };

      that.playerToAdd = undefined;

      this.participantsColRef.add(participant).then(function (participantDocRef) {
        console.log("Participant written with ID: ", participantDocRef.id);
        that.messageService.add({severity: 'success', summary: 'Creation', detail: 'Participant added'});
      }).catch(function (error) {
        console.error("Error writing participant: ", error);
      });
    }
  }

  deleteParticipant(participant: Participant) {
    const that = this;
    const participantsDocRef = this.participantsColRef.doc(participant.id);

    participantsDocRef.delete().then(function () {
      console.log("Participant successfully deleted!");
      that.messageService.add({severity: 'success', summary: 'Deletion', detail: 'Participant deleted'});
    }).catch(function (error) {
      console.error("Error removing document: ", error);
    });
  }

  changeParticipant(participant: Participant) {
    const that = this;
    const playerDocRef = this.participantsColRef.doc(participant.id);

    playerDocRef.update(participant).then(function () {
      console.log("Participant updated: " + JSON.stringify(participant));
      that.messageService.add({severity: 'success', summary: 'Creation', detail: 'Participant changed'});
    }).catch(function (error) {
      console.error("Error updating player: ", error);
    });
  }

  showOrgaDialog() {
    this.orgaDialogVisibility = true;
  }

  add20ParticipantsBatch(givenNumber: number) {

    const batch = this.afs.firestore.batch();

    let nextPlayerNumber = givenNumber;

    for (let i = 0; i < 20; i++) {

      const uuid = UUID.UUID();
      const newParticipantDocRef = this.afs.firestore.doc('tournaments/' + this.tournament.id + '/participants/' + uuid);

      const participant: Participant = {
        name: 'Player ' + nextPlayerNumber,
        location: 'blub',
        opponentParticipantsNames: [],
        roundScores: [],
      };
      batch.set(newParticipantDocRef, participant);

      nextPlayerNumber++;
    }

    batch.commit().then(function () {
      console.log("BATCH 20 participants!");
    }).catch(function (error) {
      console.error("Error BATCH 200 participants: ", error);
    });
  }

  deleteAllParticipants() {

    const that = this;

    if (this.participants) {

      const batch = that.afs.firestore.batch();

      _.forEach(this.participants, function (participant: Participant) {
        const docRef = that.afs.firestore.doc('tournaments/' + that.tournament.id + '/participants/' + participant.id);

        batch.delete(docRef);
      });
      batch.commit().then(function () {
        console.log('delete ALL batched!');
      }).catch(function (error) {
        console.error("Error deleteALL batched: ", error);
      });
    }
  }

  deleteAndAdd() {

    const nextPlayerNumber = this.participants.length + 1;

    this.deleteAllParticipants();
    this.add20ParticipantsBatch(nextPlayerNumber);
  }

  showLastRound() {

    this.shownRound = this.shownRound - 1;

    this.subscribeOnRound(this.shownRound);
  }

  showNextRound() {

    this.shownRound = this.shownRound + 1;

    this.subscribeOnRound(this.shownRound);
  }

  createFirstRound() {

    this.shownRound = this.shownRound + 1;

    this.subscribeOnRound(this.shownRound);

    this.tournament.actualRound = 1;
    this.tournamentDocRef.update(this.tournament);

    this.roundMatchService.createFirstRound(this.tournament, this.participants);
  }


  participantOneWin(roundMatch: RoundMatch) {

    console.log('parti1 win in match: ' + JSON.stringify(roundMatch));

    roundMatch.participantOne.roundScores[roundMatch.round - 1] = getScoreByGameSystem(this.tournament.gameSystem);
  }

  participantTwoWin(roundMatch: RoundMatch) {
    console.log('parti2 win in match: ' + JSON.stringify(roundMatch));

    roundMatch.participantTwo.roundScores[roundMatch.round - 1] = getScoreByGameSystem(this.tournament.gameSystem);
  }

  getScore(participant: Participant) {

    let scoreSum = 0;
    _.forEach(participant.roundScores, function (score: number) {
      scoreSum = scoreSum + score;
    });
    return scoreSum;
  }

  getScoreTooltip(participant: Participant) {
    let scoreTooltip = '';
    _.forEach(participant.roundScores, function (score: number, index) {
      scoreTooltip = scoreTooltip.concat(
        'Round' + (index + 1) + ': ' + score + ' VS ' + participant.opponentParticipantsNames[index] + '\n');
    });
    return scoreTooltip;
  }
}
