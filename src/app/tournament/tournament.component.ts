import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute} from "@angular/router";
import {AngularFirestore} from "angularfire2/firestore";
import * as firebase from "firebase/app";
import DocumentReference = firebase.firestore.DocumentReference;
import {getTournamentForJSON, Tournament} from "../models/Tournament";
import * as _ from 'lodash';
import {getParticipantForJSON, Participant} from "../models/Participant";
import CollectionReference = firebase.firestore.CollectionReference;
import {getPlayerForJSON, Player} from "../models/Player";
import {FieldValues, GameSystemConfig, getGameSystemConfig} from "../models/game-systems";
import {MessageService} from "primeng/components/common/messageservice";
import {UUID} from "angular2-uuid";
import {getRoundMatchForJSON, RoundMatch} from "../models/RoundMatch";
import {RoundMatchService} from "../services/round-match.service";
import {SelectItem} from "primeng/primeng";
import {ConnectivityService} from "../services/connectivity-service";

@Component({
  selector: 'app-tournament',
  templateUrl: './tournament.component.html',
  styleUrls: ['./tournament.component.scss']
})
export class TournamentComponent implements OnInit, OnDestroy {
  protected tournamentId: string;
  protected tournamentDocRef: DocumentReference;

  protected tournament: Tournament;
  tournamentLoaded: boolean;

  orgaDialogVisibility: boolean;

  orgaPassword: string;
  isOrga: boolean;
  passwordWrong: boolean;

  shownRound: number;

  participantsLoaded: boolean;
  protected addingPlayer: boolean;
  protected removingPlayer: boolean;
  protected participants: Participant[] = [];
  protected participantsNameList: string[] = [];
  protected participantsColRef: CollectionReference;
  protected participantsUnsubscribeFunction: () => void;


  protected possiblePlayersToAdd: Player[] = [];
  protected allPlayers: Player[] = [];
  protected gameSystemConfig: GameSystemConfig;
  protected playersUnsubscribeFunction: () => void;

  stacked: boolean;
  roundLoaded: boolean;
  protected roundsColRef: CollectionReference;
  protected roundMatches: RoundMatch[] = [];
  protected roundUnsubscribeFunction: () => void;


  protected winningOptions: SelectItem[] = [
    {value: 'p1', label: 'P1 WON'},
    {value: 'p2', label: 'P2 WON'},
    {value: 'draw', label: 'DRAW'},
  ];

  constructor(protected afs: AngularFirestore,
              private messageService: MessageService,
              private activeRouter: ActivatedRoute,
              private conService: ConnectivityService,
              private roundMatchService: RoundMatchService) {

    this.tournamentId = this.activeRouter.snapshot.paramMap.get('id');

    this.tournamentDocRef = this.afs.firestore.doc('tournaments/' + this.tournamentId);
    this.participantsColRef = this.afs.firestore.collection('tournaments/' + this.tournamentId + '/participants');
    this.roundsColRef = this.afs.firestore.collection('tournaments/' + this.tournamentId + '/roundMatches');

    this.isOrga = true;
  }

  ngOnInit() {

    const that = this;

    this.tournamentDocRef.get().then(function (doc) {

      that.tournament = getTournamentForJSON(doc.id, doc.data());
      that.shownRound = that.tournament.actualRound;

      that.subscribeOnRound(that.shownRound);

      that.gameSystemConfig = getGameSystemConfig(that.tournament.gameSystem, that.tournament.type);

      that.subscribeOnParticipants();

      that.tournamentLoaded = true;

      if (that.playersUnsubscribeFunction) {
        that.playersUnsubscribeFunction();
      }

      that.playersUnsubscribeFunction = that.afs.firestore.collection('players')
        .where('gameSystems.' + that.tournament.gameSystem, '==', true)
        .onSnapshot(function (playerCol) {
          that.allPlayers = [];
          that.possiblePlayersToAdd = [];

          playerCol.forEach(function (playerDoc) {
            const player: Player = getPlayerForJSON(playerDoc.id, playerDoc.data());

            _.forEach(that.gameSystemConfig.playerFields, function (playerField: FieldValues) {
              player[playerField.field] = playerDoc.data()[playerField.field];
            });

            that.allPlayers.push(player);

            if (!_.includes(that.participantsNameList, player.name.toLowerCase())) {
              that.possiblePlayersToAdd.push(player);
            }
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

            _.forEach(that.gameSystemConfig.participantFields, function (playerField: FieldValues) {
              participant[playerField.field] = change.doc.data()[playerField.field];
            });

            _.forEach(that.gameSystemConfig.standingFields, function (standingValue: FieldValues) {
              participant[standingValue.field] = change.doc.data()[standingValue.field];
            });

            newParticipants.push(participant);
            that.participants = newParticipants;

            that.participantsNameList.push(participant.name.toLowerCase());
          }
          if (change.type === "modified") {

            const newParticipants = _.cloneDeep(that.participants);
            const participant = getParticipantForJSON(change.doc.id, change.doc.data());

            _.forEach(that.gameSystemConfig.participantFields, function (participantField: FieldValues) {
              const fieldValue = change.doc.data()[participantField.field] ?
                change.doc.data()[participantField.field] : participantField.defaultValue;
              participant[participantField.field] = fieldValue;
            });

            _.forEach(that.gameSystemConfig.standingFields, function (standingValue: FieldValues) {
              const fieldValue = change.doc.data()[standingValue.field] ?
                change.doc.data()[standingValue.field] : standingValue.defaultValue;
              participant[standingValue.field] = fieldValue;
            });

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

            _.forEach(that.gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
              const fieldPlayerOneValue = change.doc.data()[scoreField.fieldPlayerOne] ?
                change.doc.data()[scoreField.fieldPlayerOne] : scoreField.defaultValue;
              roundMatch[scoreField.fieldPlayerOne] = fieldPlayerOneValue;
              const fieldPlayerTwoValue = change.doc.data()[scoreField.fieldPlayerTwo] ?
                change.doc.data()[scoreField.fieldPlayerTwo] : scoreField.defaultValue;
              roundMatch[scoreField.fieldPlayerTwo] = fieldPlayerTwoValue;
            });

            newRoundMatches.push(roundMatch);
            that.roundMatches = newRoundMatches;

          }
          if (change.type === "modified") {

            console.log("roundMatch modified");

            const newRoundMatches = _.cloneDeep(that.roundMatches);
            const roundMatch = getRoundMatchForJSON(change.doc.id, change.doc.data());

            _.forEach(that.gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
              const fieldPlayerOneValue = change.doc.data()[scoreField.fieldPlayerOne] ?
                change.doc.data()[scoreField.fieldPlayerOne] : scoreField.defaultValue;
              roundMatch[scoreField.fieldPlayerOne] = fieldPlayerOneValue;
              const fieldPlayerTwoValue = change.doc.data()[scoreField.fieldPlayerTwo] ?
                change.doc.data()[scoreField.fieldPlayerTwo] : scoreField.defaultValue;
              roundMatch[scoreField.fieldPlayerTwo] = fieldPlayerTwoValue;
            });

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

  sortByScore(event: any) {

    const that = this;

    const newParticipants = _.cloneDeep(this.participants);

    newParticipants.sort((part1, part2) => {

      let result = 0;

      if (that.getScore(part1) < that.getScore(part2)) {
        result = -1;
      } else if (that.getScore(part1) > that.getScore(part2))  {
        result = 1;
      }
      return result * event.order;
    });

    this.participants = newParticipants;
  }

  addParticipant(playerToAdd: Player) {

    const that = this;

    this.addingPlayer = true;

    const participant: Participant = {
      name: playerToAdd.name,
      location: playerToAdd.location ? playerToAdd.location : '',
      type: 'single',
      opponentParticipantsNames: [],
      opponentParticipantsIds: [],
      roundScores: []
    };

    console.log("this.playerToAdd: ", playerToAdd);

    _.forEach(that.gameSystemConfig.participantFields, function (participantField: FieldValues) {
      const fieldValue = playerToAdd[participantField.field] ? playerToAdd[participantField.field] : participantField.defaultValue;
      participant[participantField.field] = fieldValue;
    });

    _.forEach(that.gameSystemConfig.standingFields, function (standingValue: FieldValues) {
      participant[standingValue.field] = [standingValue.defaultValue];
    });

    const uuid = UUID.UUID();
    participant.id = uuid;

    if (this.conService.isOnline()) {

      that.participantsColRef.doc(uuid).set(participant).then(function () {
        console.log("Participant written with ID: ", participant.id);
        that.messageService.add({severity: 'success', summary: 'Creation', detail: 'Participant added'});

        const newPossiblePlayersToAdd = _.cloneDeep(that.possiblePlayersToAdd);
        const index = _.findIndex(that.possiblePlayersToAdd, ['id', playerToAdd.id]);
        newPossiblePlayersToAdd.splice(index, 1);
        that.possiblePlayersToAdd = newPossiblePlayersToAdd;

        that.addingPlayer = false;
      }).catch(function (error) {
        console.error("Error writing participant: ", error);
        that.addingPlayer = false;
      });
    }  else {
      that.participantsColRef.doc(uuid).set(participant).then(function () {
        // ignored is offline :/
      }).catch(function () {
        // ignored is offline :/
      });
      console.log("Participant written with ID: ", participant.id);

      const newPossiblePlayersToAdd = _.cloneDeep(that.possiblePlayersToAdd);
      const index = _.findIndex(that.possiblePlayersToAdd, ['id', playerToAdd.id]);
      newPossiblePlayersToAdd.splice(index, 1);
      that.possiblePlayersToAdd = newPossiblePlayersToAdd;

      that.addingPlayer = false;

      that.messageService.add(
        {
          severity: 'success',
          summary: 'Creation',
          detail: 'ATTENTION Participant added offline! Go online to sync data'
        }
      );
    }
  }

  deleteParticipant(participant: Participant) {
    const that = this;
    this.removingPlayer = true;

    const participantsDocRef = this.participantsColRef.doc(participant.id);

    participantsDocRef.delete().then(function () {
      console.log("Participant successfully deleted!");
      that.messageService.add({severity: 'success', summary: 'Deletion', detail: 'Player removed'});

      const newPossiblePlayersToAdd = _.cloneDeep(that.possiblePlayersToAdd);
      const index = _.findIndex(that.allPlayers, ['name', participant.name]);
      newPossiblePlayersToAdd.push(that.allPlayers[index]);
      that.possiblePlayersToAdd = newPossiblePlayersToAdd;
      that.removingPlayer = false;
    }).catch(function (error) {
      console.error("Error removing player: ", error);
      that.removingPlayer = false;
    });
  }

  onEditParticipant(event: any) {

    console.log(event.data);

    const participantDocRef = this.participantsColRef.doc(event.data.id);

    const participant: Participant = getParticipantForJSON(event.data.id, event.data);

    participantDocRef.update(participant).then(function () {
      console.log("Participant updated");
    }).catch(function (error) {
      console.error("Error updating participant: ", error);
    });
  }

  changeParticipant(participant: Participant) {

    const participantDocRef = this.participantsColRef.doc(participant.id);

    console.log("change data : " + JSON.stringify(participant));

    participantDocRef.update(participant).then(function () {
      console.log("Participant updated: ");

    }).catch(function (error) {
      console.error("Error updating participant: ", error);
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
        type: 'single',
        location: 'blub',
        opponentParticipantsNames: [],
        opponentParticipantsIds: [],
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

  deleteAndAddParticipants() {

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


    this.tournament.actualRound = 1;
    this.tournamentDocRef.update(this.tournament);

    this.roundMatchService.createFirstRound(this.tournament, this.participants);

    this.showNextRound();
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

  getScoreFieldValue(scoreField: FieldValues, participant: Participant) {
    let scoreFieldSum = 0;
    _.forEach(participant[scoreField.field], function (score: number) {
      scoreFieldSum = scoreFieldSum + score;
    });
    return scoreFieldSum;
  }

  getScoreFieldValueTooltip(scoreField: FieldValues, participant: Participant) {
    let scoreTooltip = '';
    _.forEach(participant[scoreField.field], function (score: number, index) {
      scoreTooltip = scoreTooltip.concat(
        'Round' + (index + 1) + ': ' + score + '\n');
    });
    return scoreTooltip;
  }

  deleteRound() {
    const that = this;

    this.roundMatchService.deleteRound(this.tournament, this.roundMatches, this.participants).then(function () {
      console.log('delete Round');
      that.tournament.actualRound = (that.tournament.actualRound - 1);
      that.tournamentDocRef.update(that.tournament);

      that.showLastRound();
      that.messageService.add({severity: 'success', summary: 'Deletion', detail: 'Round deleted'});

    }).catch(function (error) {
      console.error("Error delete round: ", error);
    });
  }


  changeWinner(event: any, roundMatch: RoundMatch) {


    console.log('Match winner changed: ' + event.value);

    if (event.value === 'p1') {

      this.roundMatchService.playerOneWon(this.tournament, roundMatch, this.participants);

      if (roundMatch.finished) {
        this.roundMatchService.playerTwoLost(this.tournament, roundMatch, this.participants);
      }
    }

    if (event.value === 'p2') {

      this.roundMatchService.playerTwoWon(this.tournament, roundMatch, this.participants);

      if (roundMatch.finished) {
        this.roundMatchService.playerOneLost(this.tournament, roundMatch, this.participants);
      }
    }

    if (event.value === 'draw') {
      this.roundMatchService.resultDraw(this.tournament, roundMatch, this.participants);

    }
  }

  getStyleForMatchesRow(rowData: RoundMatch) {

    return rowData.finished ? 'row-finished' : '';
  }

  changeScoringForPlayerOne(roundMatch: RoundMatch, field: string, value: number) {

    const participantToUpdate: Participant = _.find(this.participants, function (par: Participant) {
      return par.id === roundMatch.participantOne.id;
    });

    participantToUpdate[field][this.shownRound - 1] = value;
    this.roundMatchService.updateDataForParticipate(this.tournament, participantToUpdate);
    this.roundMatchService.updateDataForMatch(this.tournament, roundMatch);
  }

  changeScoringPlayerTwo(roundMatch: RoundMatch, field: string, value: number) {

    const participantToUpdate: Participant = _.find(this.participants, function (par: Participant) {
      return par.id === roundMatch.participantTwo.id;
    });

    participantToUpdate[field][this.shownRound - 1] = value;
    this.roundMatchService.updateDataForParticipate(this.tournament, participantToUpdate);
    this.roundMatchService.updateDataForMatch(this.tournament, roundMatch);
  }
}
