import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute} from "@angular/router";
import {AngularFirestore} from "angularfire2/firestore";
import * as firebase from "firebase/app";
import DocumentReference = firebase.firestore.DocumentReference;
import {getTournamentForJSON, Tournament} from "../models/Tournament";
import * as _ from 'lodash';
import {getParticipantForJSON, Participant} from "../models/Participant";
import CollectionReference = firebase.firestore.CollectionReference;
import {getPlayerForJSON, Player} from "../models/Player";
import {
  FieldValues, GameSystemConfig, getColumnsForStandingsExport, getGameSystemConfig, getScore,
  getScoreByGameSystem, orderParticipantsForGameSystem
} from "../models/game-systems";
import {MessageService} from "primeng/components/common/messageservice";
import {UUID} from "angular2-uuid";
import {getRoundMatchForJSON, RoundMatch} from "../models/RoundMatch";
import {RoundMatchService} from "../services/round-match.service";
import {ConfirmationService, DataTable, SelectItem} from "primeng/primeng";
import {ConnectivityService} from "../services/connectivity-service";
import WriteBatch = firebase.firestore.WriteBatch;
import {FormBuilder, FormGroup, Validators} from "@angular/forms";


@Component({
  selector: 'app-tournament',
  templateUrl: './tournament.component.html',
  styleUrls: ['./tournament.component.scss']
})
export class TournamentComponent implements OnInit, OnDestroy {

  loadingTournament: boolean;
  loadingPlayers: boolean;
  startingTournament: boolean;
  deletingRound: boolean;
  creatingNextRound: boolean;
  pairingAgain: boolean;
  loadingRound: boolean;
  loadingParticipants: boolean;
  swappingPlayer: boolean;
  updateParticipantList: boolean;
  updateMatchList: boolean;

  orgaDialogVisibility: boolean;
  orgaForm: FormGroup;
  @ViewChild('orgaPasswordField') orgaPasswordField: ElementRef;

  isOrga: boolean;
  passwordWrong: boolean;

  tournamentFinished: boolean;
  shownRound: number;
  clearingMatch: boolean;

  protected initialTournamentLoading: boolean;
  protected tournamentId: string;
  protected tournamentDocRef: DocumentReference;
  protected tournamentUnsubscribeFunction: () => void;
  tournament: Tournament;

  protected participantToChange: Participant;
  protected participants: Participant[] = [];
  protected participantsNameList: string[] = [];
  protected participantsColRef: CollectionReference;
  protected participantsUnsubscribeFunction: () => void;
  protected participantsScoreMap: {} = {};
  protected participantsChoosePlayedMap: {};
  protected participantsUpdateBatch: WriteBatch;
  participantsModified: boolean;

  stackedPlayers: boolean;

  protected possiblePlayersToAdd: Player[] = [];
  protected allPlayers: Player[] = [];
  protected gameSystemConfig: GameSystemConfig;
  protected playersUnsubscribeFunction: () => void;

  stackedMatches: boolean;

  participantOneFilter: string;
  participantTwoFilter: string;
  @ViewChild('matchesTable') matchesTable: DataTable;
  @ViewChild('standingsTable') standingsTable: DataTable;


  allMatchesFinished: boolean;
  noMatchFinished: boolean;
  protected matchesColRef: CollectionReference;
  protected roundMatches: RoundMatch[] = [];
  protected roundUnsubscribeFunction: () => void;
  protected matchesUpdateBatch: WriteBatch;
  matchModified: boolean;

  protected winningOptions: SelectItem[] = [
    {value: 'p1', label: 'P1 WON'},
    {value: 'p2', label: 'P2 WON'},
    {value: 'draw', label: 'DRAW'},
  ];

  sameRoundAgain: boolean;
  failedToCreateRound: boolean;
  pairRoundDialogVisibility: boolean;
  roundToPair: number;
  locationRestriction: boolean;

  playerToSwap: Participant;
  opponentOfPlayerToSwap: Participant;
  matchToSwap: RoundMatch;
  messageAlreadyPlayed: string;
  playerOneSwapped: boolean;
  playerTwoSwapped: boolean;

  constructor(protected afs: AngularFirestore,
              private formBuilder: FormBuilder,
              private messageService: MessageService,
              private activeRouter: ActivatedRoute,
              private confirmationService: ConfirmationService,
              private conService: ConnectivityService,
              private roundMatchService: RoundMatchService) {

    this.tournamentId = this.activeRouter.snapshot.paramMap.get('id');

    this.tournamentDocRef = this.afs.firestore.doc('tournaments/' + this.tournamentId);
    this.participantsColRef = this.afs.firestore.collection('tournaments/' + this.tournamentId + '/participants');
    this.matchesColRef = this.afs.firestore.collection('tournaments/' + this.tournamentId + '/roundMatches');

    this.isOrga = true;

    this.orgaForm = this.formBuilder.group({
      user: [{value: 'Orga', disabled: true}, Validators.required],
      password: ['', Validators.required],
    });

    this.matchesUpdateBatch = this.afs.firestore.batch();
    this.participantsUpdateBatch = this.afs.firestore.batch();
  }

  ngOnInit() {

    const that = this;
    that.loadingTournament = true;
    that.initialTournamentLoading = true;

    this.tournamentUnsubscribeFunction = this.tournamentDocRef
      .onSnapshot(function (doc) {
        if (!that.initialTournamentLoading) {
          console.log('tournament update');
          const tournamentBeforeUpdate: Tournament = _.cloneDeep(that.tournament);

          that.tournament = getTournamentForJSON(doc.id, doc.data());

          that.tournamentFinished = that.tournament.state === 'FINISHED';
          if (that.tournamentFinished) {
            that.shownRound = that.tournament.actualRound + 1;
          } else {
            that.shownRound = that.tournament.actualRound;
          }

          console.log('round before: ' + tournamentBeforeUpdate.actualRound);
          console.log('round now: ' + that.tournament.actualRound);
          if (tournamentBeforeUpdate.actualRound !== that.tournament.actualRound) {
            console.log('round changed. load data');
            that.shownRound = that.tournament.actualRound;

            that.gameSystemConfig = getGameSystemConfig(that.tournament.gameSystem, that.tournament.type);

            that.subscribeOnRoundMatches(that.shownRound);
            that.subscribeOnParticipants();

            that.loadingTournament = false;
          }
        } else {
          console.log('initial loading');
          that.tournament = getTournamentForJSON(doc.id, doc.data());

          that.tournamentFinished = that.tournament.state === 'FINISHED';
          if (that.tournamentFinished) {
            that.shownRound = that.tournament.actualRound + 1;
          } else {
            that.shownRound = that.tournament.actualRound;
            that.subscribeOnRoundMatches(that.shownRound);
          }

          that.gameSystemConfig = getGameSystemConfig(that.tournament.gameSystem, that.tournament.type);
          that.subscribeOnParticipants();

          that.loadingTournament = false;
          that.initialTournamentLoading = false;
        }
      });
  }

  ngOnDestroy() {

    if (this.tournamentUnsubscribeFunction) {
      this.tournamentUnsubscribeFunction();
    }
    if (this.playersUnsubscribeFunction) {
      this.playersUnsubscribeFunction();
    }
    if (this.participantsUnsubscribeFunction) {
      this.participantsUnsubscribeFunction();
    }
    if (this.roundUnsubscribeFunction) {
      this.roundUnsubscribeFunction();
    }
  }

  checkIfPasswordCorrect() {

    this.passwordWrong = false;

    if ((this.orgaForm.get('password').value ? this.orgaForm.get('password').value : "") === this.tournament.password) {
      this.isOrga = true;
      this.orgaDialogVisibility = false;
    } else {
      this.passwordWrong = true;
    }
  }

  protected subscribeOnParticipants() {

    const that = this;
    that.loadingParticipants = true;
    that.participants = [];
    that.participantsChoosePlayedMap = {};

    if (that.participantsUnsubscribeFunction) {
      that.participantsUnsubscribeFunction();
    }

    that.participantsUnsubscribeFunction = this.participantsColRef
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

            _.forEach(that.gameSystemConfig.choosePlayed, function (choosePlayed: FieldValues) {

              const items: SelectItem[] = [];
              _.forEach(participant[choosePlayed.field], function (choosingItem: string) {
                items.push({label: choosingItem, value: choosingItem});
              });
              that.participantsChoosePlayedMap[participant.name] = items;
            });

            newParticipants.push(participant);

            that.participants = newParticipants;
            that.participantsNameList.push(participant.name.toLowerCase());

            that.participantsScoreMap[participant.name] = getScore(participant);
            orderParticipantsForGameSystem(that.tournament.gameSystem, newParticipants, that.participantsScoreMap);
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

            that.participantsScoreMap[participant.name] = getScore(participant);
            orderParticipantsForGameSystem(that.tournament.gameSystem, newParticipants, that.participantsScoreMap);
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

        that.loadingParticipants = false;
        if (that.tournament.actualRound === 0) {
          console.log('round 0: subscribeOnPlayers');
          that.subscribeOnPlayers();
        }

      });
  }

  subscribeOnPlayers() {

    const that = this;

    that.loadingPlayers = true;

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
        that.loadingPlayers = false;
      });

  }

  protected subscribeOnRoundMatches(shownRound: number) {

    const that = this;
    that.loadingRound = true;
    that.roundMatches = [];

    if (this.roundUnsubscribeFunction) {
      this.roundUnsubscribeFunction();
    }

    this.roundUnsubscribeFunction = this.matchesColRef
      .where('round', '==', shownRound)
      .orderBy('matchDate', 'desc')
      .onSnapshot(function (snapshot) {

        snapshot.docChanges.forEach(function (change) {
          if (change.type === "added") {
            that.noMatchFinished = true;
            that.allMatchesFinished = true;
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

            _.forEach(that.gameSystemConfig.choosePlayed, function (choosePlayed: FieldValues) {
              const fieldPlayerOneValue = change.doc.data()[choosePlayed.fieldPlayerOne] ?
                change.doc.data()[choosePlayed.fieldPlayerOne] : choosePlayed.defaultValue;
              roundMatch[choosePlayed.fieldPlayerOne] = fieldPlayerOneValue;
              const fieldPlayerTwoValue = change.doc.data()[choosePlayed.fieldPlayerTwo] ?
                change.doc.data()[choosePlayed.fieldPlayerTwo] : choosePlayed.defaultValue;
              roundMatch[choosePlayed.fieldPlayerTwo] = fieldPlayerTwoValue;
            });

            newRoundMatches.push(roundMatch);
            that.roundMatches = newRoundMatches;

            _.forEach(that.roundMatches, function (match: RoundMatch) {
              if (match.finished) {
                that.noMatchFinished = false;
              } else {
                that.allMatchesFinished = false;
              }
            });
          }
          if (change.type === "modified") {
            console.log("roundMatch modified");
            that.noMatchFinished = true;
            that.allMatchesFinished = true;

            const newMatches = _.cloneDeep(that.roundMatches);
            const newMatch = getRoundMatchForJSON(change.doc.id, change.doc.data());
            const index = _.findIndex(that.roundMatches, ['id', change.doc.id]);

            _.forEach(that.gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
              const fieldPlayerOneValue = change.doc.data()[scoreField.fieldPlayerOne] ?
                change.doc.data()[scoreField.fieldPlayerOne] : scoreField.defaultValue;
              newMatch[scoreField.fieldPlayerOne] = fieldPlayerOneValue;


              const fieldPlayerTwoValue = change.doc.data()[scoreField.fieldPlayerTwo] ?
                change.doc.data()[scoreField.fieldPlayerTwo] : scoreField.defaultValue;
              newMatch[scoreField.fieldPlayerTwo] = fieldPlayerTwoValue;
            });

            _.forEach(that.gameSystemConfig.choosePlayed, function (choosePlayed: FieldValues) {
              const fieldPlayerOneValue = change.doc.data()[choosePlayed.fieldPlayerOne] ?
                change.doc.data()[choosePlayed.fieldPlayerOne] : choosePlayed.defaultValue;
              newMatch[choosePlayed.fieldPlayerOne] = fieldPlayerOneValue;
              const fieldPlayerTwoValue = change.doc.data()[choosePlayed.fieldPlayerTwo] ?
                change.doc.data()[choosePlayed.fieldPlayerTwo] : choosePlayed.defaultValue;
              newMatch[choosePlayed.fieldPlayerTwo] = fieldPlayerTwoValue;
            });

            newMatches[index] = newMatch;
            that.roundMatches = newMatches;

            _.forEach(that.roundMatches, function (match: RoundMatch) {
              if (match.finished) {
                that.noMatchFinished = false;
              } else {
                that.allMatchesFinished = false;
              }
            });
          }
          if (change.type === "removed") {
            const newRoundMatches = _.cloneDeep(that.roundMatches);

            const index = _.findIndex(that.roundMatches, ['id', change.doc.id]);
            newRoundMatches.splice(index, 1);
            that.roundMatches = newRoundMatches;
          }
        });

        that.loadingRound = false;
      });
  }

  publishRound() {
    this.tournament.publishedRound = this.tournament.actualRound;

    this.tournamentDocRef.update(this.tournament).then(function () {
      console.log('round published');
    });
  }

  sortByScore(event: any) {
    const newParticipants = _.cloneDeep(this.participants);

    newParticipants.sort((part1, part2) => {

      let result = 0;

      if (getScore(part1) < getScore(part2)) {
        result = -1;
      } else if (getScore(part1) > getScore(part2)) {
        result = 1;
      }
      return result * event.order;
    });

    this.participants = newParticipants;
  }

  addParticipant(playerToAdd: Player) {

    const that = this;

    const participant: Participant = {
      name: playerToAdd.name,
      location: playerToAdd.location ? playerToAdd.location : '',
      type: 'single',
      opponentParticipantsNames: [],
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

    this.participantsUpdateBatch.set(this.participantsColRef.doc(uuid), participant);
    this.participantsModified = true;

    // modify both lists
    const newParticipants = _.cloneDeep(that.participants);
    newParticipants.push(participant);
    that.participants = newParticipants;

    const newPlayers = _.cloneDeep(that.possiblePlayersToAdd);
    const index = _.findIndex(that.possiblePlayersToAdd, ['id', playerToAdd.id]);
    newPlayers.splice(index, 1);
    that.possiblePlayersToAdd = newPlayers;

    that.messageService.add({severity: 'success',
      summary: 'Update', detail: 'Player added. Save to start tournament and publish new list of participants'});
  }

  deleteParticipant(participant: Participant) {

    const that = this;

    const participantsDocRef = this.participantsColRef.doc(participant.id);

    this.participantsUpdateBatch.delete(participantsDocRef);
    this.participantsModified = true;

    // modify both lists
    const newParticipants = _.cloneDeep(that.participants);
    const indexParticipants = _.findIndex(that.participants, ['id', participant.id]);
    newParticipants.splice(indexParticipants, 1);
    that.participants = newParticipants;

    const newPlayers = _.cloneDeep(that.possiblePlayersToAdd);
    const indexPlayers = _.findIndex(that.allPlayers, ['name', participant.name]);
    newPlayers.splice(indexPlayers, 0, that.allPlayers[indexPlayers]);
    that.possiblePlayersToAdd = newPlayers;

    that.messageService.add({severity: 'success',
      summary: 'Update', detail: 'Player removed. Save to start tournament and publish new list of participants'});

  }

  onEditParticipant(event: any) {

    console.log(event.data);

    const participantDocRef = this.participantsColRef.doc(event.data.id);
    const participant: Participant = getParticipantForJSON(event.data.id, event.data);

    this.participantsUpdateBatch.update(participantDocRef, participant);
    this.participantsModified = true;
  }

  onEditMatch(event: any) {

    console.log(event.data);

    const matchDocRef = this.matchesColRef.doc(event.data.id);
    const match: RoundMatch = getRoundMatchForJSON(event.data.id, event.data);

    this.matchesUpdateBatch.update(matchDocRef, match);
    this.matchModified = true;
  }

  changeParticipant(participant: Participant) {

    console.log("change participant : " + JSON.stringify(participant));
    this.participantToChange = participant;
  }


  updateParticipant() {

    const that = this;

    if (this.participantToChange) {
      const participantDocRef = this.participantsColRef.doc(that.participantToChange.id);
      this.participantsUpdateBatch.update(participantDocRef, this.participantToChange);
      this.participantsModified = true;
    }
  }

  showOrgaDialog() {
    this.orgaDialogVisibility = true;

    setTimeout(() => {
      const element = this.orgaPasswordField.nativeElement;
      if (element) {
        element.focus();
      }
    }, 200);
  }

  getScoreTillRoundForParticipant(participant: Participant) {

    let scoreSum = 0;
    _.forEach(participant.roundScores, function (score: number) {
      scoreSum = scoreSum + score;
    });
    return scoreSum;
  }


  showPreviousRound() {

    this.shownRound = this.shownRound - 1;

    this.subscribeOnRoundMatches(this.shownRound);
  }

  showNextRound() {

    this.shownRound = this.shownRound + 1;

    this.subscribeOnRoundMatches(this.shownRound);
  }

  pairRound(sameRoundAgain: boolean) {

    this.locationRestriction = false;
    this.sameRoundAgain = sameRoundAgain;
    this.pairRoundDialogVisibility = true;
    if (sameRoundAgain) {
      this.roundToPair = this.tournament.actualRound;
    } else {
      this.roundToPair = this.tournament.actualRound + 1;
    }
  }

  createFirstRound() {

    const that = this;

    that.failedToCreateRound = false;
    that.startingTournament = true;

    const promise = that.roundMatchService.createNextRound(this.tournament, this.participants, 1, this.locationRestriction);

    if (promise != null) {
      that.pairRoundDialogVisibility = false;
      if (that.conService.isOnline()) {
        promise.then(function () {

          that.updateTournamentAfterStartTournament();
          that.startingTournament = false;
          that.messageService.add(
            {
              severity: 'success',
              summary: 'Create',
              detail: 'Round created'
            }
          );
        }).catch(function (error) {
          console.error("Failed to save round: ", error);
          that.startingTournament = false;

        });
      } else {
        promise.then(function () {
          // offline .. :/
        }).catch(function () {
        });
        that.startingTournament = false;

        that.updateTournamentAfterStartTournament();

        that.messageService.add(
          {
            severity: 'success',
            summary: 'Create',
            detail: 'ATTENTION Round created offline! Go online to sync data'
          }
        );
      }
    } else {
      console.error("Failed to generate round: ");
      that.startingTournament = false;
      that.failedToCreateRound = true;
    }
  }

  private updateTournamentAfterStartTournament() {

    const cloneTournament: Tournament = _.cloneDeep(this.tournament);
    cloneTournament.publishedRound = 0;
    cloneTournament.actualRound = 1;
    cloneTournament.state = 'STARTED';

    this.tournamentDocRef.update(cloneTournament);
  }


  getActualScore(participant: Participant) {

    return this.participantsScoreMap[participant.name];
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

    const that = this;
    let scoreFieldSum = 0;
    if (scoreField.field === 'sos') {
      _.forEach(participant.opponentParticipantsNames, function (opponentName: string) {
        if (opponentName !== 'bye') {
          scoreFieldSum = scoreFieldSum + that.participantsScoreMap[opponentName];
        }
      });
    } else {
      _.forEach(participant[scoreField.field], function (score: number) {
        scoreFieldSum = scoreFieldSum + score;
      });

    }
    return scoreFieldSum;
  }

  getScoreFieldValueTooltip(scoreField: FieldValues, participant: Participant) {
    const that = this;
    let scoreTooltip = '';
    if (scoreField.field === 'sos') {
      _.forEach(participant.opponentParticipantsNames, function (opponentName: string, index) {
        if (opponentName !== 'bye') {
          scoreTooltip = scoreTooltip.concat(
            'Round' + (index + 1) + ': ' + that.participantsScoreMap[opponentName] + '(' + opponentName + ')\n');
        }
      });
    } else {
      _.forEach(participant[scoreField.field], function (score: number, index) {
        scoreTooltip = scoreTooltip.concat(
          'Round' + (index + 1) + ': ' + score + '\n');
      });
    }
    return scoreTooltip;
  }

  deleteRound() {
    const that = this;

    this.confirmationService.confirm({
      icon: 'fa fa-exclamation-triangle fa-2x fail-color',
      header: 'Kill Round with Fire??',
      message: 'You cannot undo this action!',
      accept: () => {
        this.deletingRound = true;

        const promise = this.roundMatchService.deleteRound(this.tournament, this.roundMatches, this.participants);

        if (this.conService.isOnline()) {
          promise.then(function () {
            console.log('delete Round');

            that.updateTournamentAfterRoundDelete();

            that.deletingRound = false;
            that.messageService.add({severity: 'success', summary: 'Deletion', detail: 'Round deleted'});
          }).catch(function (error) {
            console.error("Error delete round: ", error);
            that.deletingRound = false;
          });
        } else {
          promise.then(function () {
            // offline :/
          }).catch(function () {

          });
          console.log('delete Round');
          that.updateTournamentAfterRoundDelete();

          that.deletingRound = false;
          that.messageService.add(
            {
              severity: 'success',
              summary: 'Create',
              detail: 'ATTENTION Round deleted offline! Go online to sync data'
            }
          );
        }
      }
    });
  }

  private updateTournamentAfterRoundDelete() {

    const cloneTournament: Tournament = _.cloneDeep(this.tournament);
    cloneTournament.publishedRound = (cloneTournament.actualRound - 2) < 0 ? 0 : (cloneTournament.actualRound - 2);
    cloneTournament.actualRound = (cloneTournament.actualRound - 1);
    if (cloneTournament.actualRound === 0) {
      cloneTournament.state = 'CREATED';
    }
    this.tournamentDocRef.update(cloneTournament);
  }

  changeWinner(event: any, roundMatch: RoundMatch) {

    const cloneMatch: RoundMatch = _.cloneDeep(roundMatch);

    console.log('Match winner changed: ' + event.value);

    this.matchModified = true;

    if (event.value === 'p1') {
      this.roundMatchService.playerOneWon(this.tournament, roundMatch, this.participants, this.matchesUpdateBatch);

      if (cloneMatch.finished) {
        this.roundMatchService.playerTwoLost(this.tournament, roundMatch, this.participants, this.matchesUpdateBatch);
      }
    }

    if (event.value === 'p2') {
      this.roundMatchService.playerTwoWon(this.tournament, roundMatch, this.participants, this.matchesUpdateBatch);

      if (cloneMatch.finished) {
        this.roundMatchService.playerOneLost(this.tournament, roundMatch, this.participants, this.matchesUpdateBatch);
      }
    }

    if (event.value === 'draw') {
      this.roundMatchService.resultDraw(this.tournament, roundMatch, this.participants, this.matchesUpdateBatch);
    }
  }

  getStyleForMatchesRow(rowData: RoundMatch) {

    return rowData.finished ? 'row-finished' : '';
  }

  forceBlurForScore(event: any) {
    if (event.target) {
      event.target.blur();
    }
  }

  changeScoringForPlayerOne(roundMatch: RoundMatch, field: string, value: number) {

    const batch = this.afs.firestore.batch();

    const participantToUpdate: Participant = _.find(this.participants, function (par: Participant) {
      return par.id === roundMatch.participantOne.id;
    });

    if (participantToUpdate) {
      participantToUpdate[field][this.shownRound - 1] = value;
      const participantTwoDocRef = this.afs.firestore.doc('tournaments/' + this.tournament.id + '/participants/' + participantToUpdate.id);
      batch.update(participantTwoDocRef, participantToUpdate);
    }
    const matchDocRef = this.afs.firestore.doc('tournaments/' + this.tournament.id + '/roundMatches/' + roundMatch.id);
    batch.update(matchDocRef, roundMatch);

    if (this.conService.isOnline()) {
      batch.commit().then(function () {
        console.log("update scoring: " + value);
      }).catch(function (error) {
        console.error("Error update winner: ", error);
      });
    } else {
      batch.commit().then(function () {
        // offline :/
      }).catch(function () {

      });
      console.log("update scoring");
    }
  }

  changeScoringPlayerTwo(roundMatch: RoundMatch, field: string, value: number) {
    const batch = this.afs.firestore.batch();

    const participantToUpdate: Participant = _.find(this.participants, function (par: Participant) {
      return par.id === roundMatch.participantTwo.id;
    });

    if (participantToUpdate) {
      participantToUpdate[field][this.shownRound - 1] = value;

      const participantTwoDocRef = this.afs.firestore.doc('tournaments/' + this.tournament.id + '/participants/' + participantToUpdate.id);
      batch.update(participantTwoDocRef, participantToUpdate);
    }
    const matchDocRef = this.afs.firestore.doc('tournaments/' + this.tournament.id + '/roundMatches/' + roundMatch.id);
    batch.update(matchDocRef, roundMatch);

    if (this.conService.isOnline()) {
      batch.commit().then(function () {
        console.log("update scoring");
      }).catch(function (error) {
        console.error("Error update winner: ", error);
      });
    } else {
      batch.commit().then(function () {
        // offline :/
      }).catch(function () {

      });
      console.log("update scoring");
    }
  }

  clearMatch(roundMatch: RoundMatch) {

    this.clearingMatch = true;
    const that = this;
    console.log('clear Match: ' + JSON.stringify(roundMatch));

    const batch = this.afs.firestore.batch();

    if (roundMatch.finished) {

      const scorePerGameSystem = getScoreByGameSystem(this.tournament.gameSystem);

      if (roundMatch.scoreParticipantOne === scorePerGameSystem[0]) {
        this.roundMatchService.playerOneLost(this.tournament, roundMatch, this.participants, batch);
      }
      if (roundMatch.scoreParticipantTwo === scorePerGameSystem[0]) {
        this.roundMatchService.playerTwoLost(this.tournament, roundMatch, this.participants, batch);
      }
    }

    const participantOneToUpdate: Participant = _.find(this.participants, function (par: Participant) {
      return par.id === roundMatch.participantOne.id;
    });

    const participantTwoToUpdate: Participant = _.find(this.participants, function (par: Participant) {
      return par.id === roundMatch.participantTwo.id;
    });

    _.forEach(this.gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
      roundMatch[scoreField.fieldPlayerOne] = scoreField.defaultValue;
      roundMatch[scoreField.fieldPlayerTwo] = scoreField.defaultValue;

      if (participantOneToUpdate) {
        participantOneToUpdate[scoreField.field][that.shownRound - 1] = scoreField.defaultValue;
      }
      if (participantTwoToUpdate) {
        participantTwoToUpdate[scoreField.field][that.shownRound - 1] = scoreField.defaultValue;
      }
    });

    _.forEach(this.gameSystemConfig.choosePlayed, function (choosePlayed: FieldValues) {
      roundMatch[choosePlayed.fieldPlayerOne] = choosePlayed.defaultValue;
      roundMatch[choosePlayed.fieldPlayerTwo] = choosePlayed.defaultValue;
    });

    if (participantOneToUpdate) {
      participantOneToUpdate.opponentParticipantsNames.splice(that.shownRound - 1, 1);
      participantOneToUpdate.roundScores.splice(that.shownRound - 1, 1);
      const participantOneDocRef = this.afs.firestore
        .doc('tournaments/' + this.tournament.id + '/participants/' + participantOneToUpdate.id);
      batch.update(participantOneDocRef, participantOneToUpdate);
    }

    if (participantTwoToUpdate) {
      participantTwoToUpdate.opponentParticipantsNames.splice(that.shownRound - 1, 1);
      participantTwoToUpdate.roundScores.splice(that.shownRound - 1, 1);
      const participantTwoDocRef = this.afs.firestore
        .doc('tournaments/' + this.tournament.id + '/participants/' + participantTwoToUpdate.id);
      batch.update(participantTwoDocRef, participantTwoToUpdate);
    }

    roundMatch.finished = false;
    roundMatch.result = '';

    const matchDocRef = this.afs.firestore.doc('tournaments/' + this.tournament.id + '/roundMatches/' + roundMatch.id);
    batch.update(matchDocRef, roundMatch);

    if (this.conService.isOnline()) {
      batch.commit().then(function () {
        that.clearingMatch = false;
        console.log("clear game successfully");
        that.messageService.add({severity: 'success', summary: 'Update', detail: 'Match cleared'});
      }).catch(function (error) {
        that.clearingMatch = false;
        console.error("Error update winner: ", error);
      });
    } else {
      batch.commit().then(function () {
        // offline :/
      }).catch(function () {

      });

      that.clearingMatch = false;
      that.messageService.add({severity: 'success', summary: 'Update', detail: 'Match cleared'});
      console.log("clear game successfully");
    }
  }

  pairAgain() {

    const that = this;
    this.pairingAgain = true;

    const promiseDelete = this.roundMatchService.deleteRound(this.tournament, this.roundMatches, this.participants);

    if (this.conService.isOnline()) {
      promiseDelete.then(function () {
        console.log('delete Round');
        that.pairingAgain = false;

      }).catch(function (error) {
        console.error("Error delete round: ", error);
        that.pairingAgain = false;
      });
    } else {
      promiseDelete.then(function () {
        // offline :/
      });
      console.log('delete Round');
      that.pairingAgain = false;
    }

    if (promiseDelete != null) {

      const promiseCreate = this.roundMatchService.createNextRound(
        this.tournament, this.participants, this.tournament.actualRound, this.locationRestriction);

      if (promiseCreate != null) {
        if (this.conService.isOnline()) {
          promiseCreate.then(function () {
            console.log('create Round');
          }).catch(function (error) {
            console.error("Error create round: ", error);
          });
        } else {
          promiseCreate.then(function () {
            // offline :/
          });
          console.log('create Round');
        }
        that.pairingAgain = false;
        that.pairRoundDialogVisibility = false;
        this.messageService.add({severity: 'success', summary: 'Create', detail: 'Round paired again'});
      } else {
        console.error("Failed to generate round: ");
        that.pairingAgain = false;
        that.failedToCreateRound = true;
      }
    } else {
      console.error("Failed to delete round: ");
      that.pairingAgain = false;
      that.failedToCreateRound = true;
    }
  }

  nextRound() {
    const that = this;
    this.creatingNextRound = true;

    const nextRound = (that.tournament.actualRound + 1);

    console.log('create next Round: ' + nextRound);

    const promiseCreate = this.roundMatchService.createNextRound(this.tournament, this.participants, nextRound, this.locationRestriction);

    if (promiseCreate != null) {
      that.pairRoundDialogVisibility = false;
      if (this.conService.isOnline()) {
        promiseCreate.then(function () {

          that.updateTournamentAfterGenNextRound(nextRound);

          that.messageService.add({severity: 'success', summary: 'Create', detail: 'Next round created successfully'});
          that.creatingNextRound = false;

        }).catch(function (error) {
          console.error("Error create round: ", error);
          that.creatingNextRound = false;
        });
      } else {
        promiseCreate.then(function () {
          // offline :/
        });
        that.updateTournamentAfterGenNextRound(nextRound);

        that.creatingNextRound = false;

        that.messageService.add(
          {
            severity: 'success',
            summary: 'Create',
            detail: 'ATTENTION next round created offline! Go online to sync data'
          }
        );
      }
    } else {
      console.error("Failed to generate round: ");
      that.creatingNextRound = false;
      that.failedToCreateRound = true;
    }
  }

  private updateTournamentAfterGenNextRound(nextRound: number) {

    const cloneTournament: Tournament = _.cloneDeep(this.tournament);

    cloneTournament.publishedRound = cloneTournament.actualRound;
    cloneTournament.actualRound = nextRound;
    this.tournamentDocRef.update(cloneTournament);
  }

  filterParticipantOneMatchesTable() {

    this.matchesTable.filter(this.participantOneFilter, 'participantOne.name', 'startsWith');
  }

  filterParticipantTwoMatchesTable() {

    this.matchesTable.filter(this.participantTwoFilter, 'participantTwo.name', 'startsWith');
  }

  exportMatches() {
    this.matchesTable.exportCSV();
  }

  exportStandings() {

    const columns: number[] = getColumnsForStandingsExport(this.tournament.gameSystem);

    let headerString = '';
    const headers = this.standingsTable.el.nativeElement.querySelectorAll('.ui-column-title');
    for (const column of columns) {
      headerString += headers[column - 1].innerText + ';';
    }
    const tableRows = this.standingsTable.el.nativeElement.querySelectorAll('TR');
    const rowsString: string[] = [];
    for (let i = 1; i < tableRows.length; i++) {
      let rowString = '';
      const tableRow = tableRows[i].querySelectorAll('.ui-cell-data');
      for (const column of columns) {
        rowString += tableRow[column - 1].innerText.replace(/[\n\r]+/g, '').replace(/\s{2,}/g, ' ').trim() + ';';
      }
      rowsString.push(rowString);
    }
    let csv = headerString + '\n';
    for (const row of rowsString) {
      csv += row + '\n';
    }
    const blob = new Blob(['\uFEFF', csv], {type: 'text/csv'});
    const link = document.createElement('a');
    link.setAttribute('href', window.URL.createObjectURL(blob));
    link.setAttribute('download', 'Standings_Round_' + this.shownRound + '.csv');
    document.body.appendChild(link); // Required for FF
    link.click();
  }


  swapPlayerOne(roundMatch: RoundMatch) {

    this.matchToSwap = roundMatch;
    this.playerToSwap = roundMatch.participantOne;
    this.opponentOfPlayerToSwap = roundMatch.participantTwo;

    this.playerOneSwapped = true;
  }

  swapPlayerTwo(roundMatch: RoundMatch) {
    this.matchToSwap = roundMatch;
    this.playerToSwap = roundMatch.participantTwo;
    this.opponentOfPlayerToSwap = roundMatch.participantOne;

    this.playerTwoSwapped = true;
  }

  stopSwapPlayer() {
    this.matchToSwap = null;
    this.playerToSwap = null;
    this.opponentOfPlayerToSwap = null;

    this.playerOneSwapped = false;
    this.playerTwoSwapped = false;
  }

  checkSwap(roundMatchToCheck: RoundMatch, participantToCheck: Participant, opponentOfHovered: Participant): string {

    if (this.playerToSwap) {
      if (participantToCheck.name === this.playerToSwap.name) {
        return 'impo';
      } else if (roundMatchToCheck.finished) {
        return 'impo';
      } else if (participantToCheck.name === this.opponentOfPlayerToSwap.name) {
        return 'impo';
      } else if (_.includes(opponentOfHovered.opponentParticipantsNames, this.playerToSwap.name)) {
        this.messageAlreadyPlayed = opponentOfHovered.name + ' already played against ' + this.playerToSwap.name;
        return 'not';
      } else if (_.includes(this.opponentOfPlayerToSwap.opponentParticipantsNames, participantToCheck.name)) {
        this.messageAlreadyPlayed = this.opponentOfPlayerToSwap.name + ' already played against ' + participantToCheck.name;
        return 'not';
      } else {
        return 'swap';
      }
    }
  }

  getToolTipForSwap(roundMatchToCheck: RoundMatch, participantToCheck: Participant, opponentOfHovered: Participant) {

    const state = this.checkSwap(roundMatchToCheck, participantToCheck, opponentOfHovered);

    if (state === 'impo') {
      return 'Impossible to swap';
    } else if (state === 'not') {
      return 'ATTENTION! ' + this.messageAlreadyPlayed + '. ' +
        'If you know it better you can SWAP anyway';
    } else if (state === 'swap') {
      return 'Click to SWAP';
    }
  }

  dropPlayer(droppedMatch: RoundMatch, droppedParticipant: Participant, opponentOfDropped: Participant, witchPlayerDropped: string) {

    if (this.playerToSwap) {
      const that = this;
      const state = this.checkSwap(droppedMatch, droppedParticipant, opponentOfDropped);

      if (state !== 'impo') {
        console.log("start swaping");

        that.swappingPlayer = true;
        const batch = this.afs.firestore.batch();

        this.clearSubScores(this.matchToSwap, batch);
        this.clearSubScores(droppedMatch, batch);

        // x VS o
        // x VS o
        if (this.playerOneSwapped && witchPlayerDropped === 'one') {
          this.matchToSwap.participantOne = droppedParticipant;
          droppedMatch.participantOne = this.playerToSwap;
          // o VS x
          // x VS o
        } else if (this.playerTwoSwapped && witchPlayerDropped === 'one') {
          this.matchToSwap.participantTwo = droppedParticipant;
          droppedMatch.participantOne = this.playerToSwap;
          // x VS o
          // o VS x
        } else if (this.playerOneSwapped && witchPlayerDropped === 'two') {
          this.matchToSwap.participantOne = droppedParticipant;
          droppedMatch.participantTwo = this.playerToSwap;
          // o VS x
          // o VS x
        } else if (this.playerTwoSwapped && witchPlayerDropped === 'two') {
          this.matchToSwap.participantTwo = droppedParticipant;
          droppedMatch.participantTwo = this.playerToSwap;
        }

        const matchOneDocRef = this.afs.firestore.doc('tournaments/' + this.tournament.id + '/roundMatches/' + this.matchToSwap.id);
        batch.update(matchOneDocRef, this.matchToSwap);

        const matchTwoDocRef = this.afs.firestore.doc('tournaments/' + this.tournament.id + '/roundMatches/' + droppedMatch.id);
        batch.update(matchTwoDocRef, droppedMatch);

        this.stopSwapPlayer();

        if (this.conService.isOnline()) {
          batch.commit().then(function () {
            that.swappingPlayer = false;
            console.log("Swap Player successfully");
            that.messageService.add({severity: 'success', summary: 'Update', detail: 'Swapping successfully'});
          }).catch(function (error) {
            that.swappingPlayer = false;
            console.error("Error Swap Player: ", error);
          });
        } else {
          batch.commit().then(function () {
            // offline :/
          }).catch(function () {

          });

          that.swappingPlayer = false;
          that.messageService.add({severity: 'success', summary: 'Update', detail: 'Swapping successfully'});
          console.log("Swap Player successfully");
        }
      }
    }
  }

  private clearSubScores(roundMatch: RoundMatch, batch: WriteBatch) {

    const that = this;

    const participantOneToUpdate: Participant = _.find(this.participants, function (par: Participant) {
      return par.id === roundMatch.participantOne.id;
    });

    const participantTwoToUpdate: Participant = _.find(this.participants, function (par: Participant) {
      return par.id === roundMatch.participantTwo.id;
    });

    _.forEach(this.gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
      roundMatch[scoreField.fieldPlayerOne] = scoreField.defaultValue;
      roundMatch[scoreField.fieldPlayerTwo] = scoreField.defaultValue;

      if (participantOneToUpdate) {
        participantOneToUpdate[scoreField.field][that.shownRound - 1] = scoreField.defaultValue;
      }
      if (participantTwoToUpdate) {
        participantTwoToUpdate[scoreField.field][that.shownRound - 1] = scoreField.defaultValue;
      }
    });

    _.forEach(this.gameSystemConfig.choosePlayed, function (choosePlayed: FieldValues) {
      roundMatch[choosePlayed.fieldPlayerOne] = choosePlayed.defaultValue;
      roundMatch[choosePlayed.fieldPlayerTwo] = choosePlayed.defaultValue;
    });

    if (participantOneToUpdate) {
      participantOneToUpdate.opponentParticipantsNames.splice(that.shownRound - 1, 1);
      participantOneToUpdate.roundScores.splice(that.shownRound - 1, 1);
      const participantOneDocRef = this.afs.firestore
        .doc('tournaments/' + this.tournament.id + '/participants/' + participantOneToUpdate.id);
      batch.update(participantOneDocRef, participantOneToUpdate);
    }

    if (participantTwoToUpdate) {
      participantTwoToUpdate.opponentParticipantsNames.splice(that.shownRound - 1, 1);
      participantTwoToUpdate.roundScores.splice(that.shownRound - 1, 1);
      const participantTwoDocRef = this.afs.firestore
        .doc('tournaments/' + this.tournament.id + '/participants/' + participantTwoToUpdate.id);
      batch.update(participantTwoDocRef, participantTwoToUpdate);
    }

    const matchDocRef = this.afs.firestore.doc('tournaments/' + this.tournament.id + '/roundMatches/' + roundMatch.id);
    batch.update(matchDocRef, roundMatch);
  }


  saveChoosePlayed(roundMatch: RoundMatch) {

    console.log('save choose played: ' + JSON.stringify(roundMatch));

    const matchDocRef = this.afs.firestore.doc('tournaments/' + this.tournament.id + '/roundMatches/' + roundMatch.id);

    if (this.conService.isOnline()) {
      matchDocRef.update(roundMatch).then(function () {
        console.log("update choosePlayed");
      }).catch(function (error) {
        console.error("Error update winner: ", error);
      });
    } else {
      matchDocRef.update(roundMatch).then(function () {
        // offline :/
      }).catch(function () {

      });
      console.log("update choosePlayed");
    }
  }


  finishTournament() {
    const that = this;

    this.confirmationService.confirm({
      header: 'Really finish Tournament?',
      message: 'You can undo this action',
      accept: () => {

        console.log("finish Tournament");

        that.tournament.publishedRound = that.tournament.actualRound;
        that.tournament.state = 'FINISHED';
        that.tournamentDocRef.update(that.tournament);

        that.messageService.add({severity: 'success', summary: 'Update', detail: 'Tournament finished'});
      }
    });
  }

  undoFinishTournament() {
    const that = this;
    console.log("undo finish Tournament");

    that.tournament.publishedRound = that.tournament.actualRound;
    that.tournament.state = 'STARTED';
    that.tournamentDocRef.update(that.tournament);

    that.messageService.add({severity: 'success', summary: 'Update', detail: 'Undo finish Tournament'});
  }

  getPlayerTableHeading(): string {

    if (this.tournamentFinished) {
      return 'Final Standings';
    } else if (this.shownRound === 0) {
      return 'Players';
    } else {
      return 'Standings Round ' + this.shownRound;
    }
  }

  saveMatches() {

    const that = this;

    if (this.matchModified) {
      this.publishRound();
      this.updateMatchList = true;
      this.matchModified = false;
      if (this.conService.isOnline()) {
        this.matchesUpdateBatch.commit().then(function () {
          that.messageService.add({severity: 'success', summary: 'Update', detail: 'Update Matches'});
          that.updateMatchList = false;
        }).catch(function (error) {
          console.error("Error update winner: ", error);
        });
      } else {
        this.matchesUpdateBatch.commit().then(function () {
          // offline :/
        }).catch(function () {
        });
        that.messageService.add({severity: 'success', summary: 'Update', detail: 'Update Matches'});
        that.updateMatchList = false;
      }

      this.matchesUpdateBatch = this.afs.firestore.batch();
    }


  }

  saveParticipants() {

    const that = this;

    if (this.participantsModified) {

      this.updateParticipantList = true;
      this.participantsModified = false;
      if (this.conService.isOnline()) {
        this.participantsUpdateBatch.commit().then(function () {
          that.messageService.add({severity: 'success', summary: 'Update', detail: 'Update Players'});
          that.updateParticipantList = false;
        }).catch(function (error) {
          console.error("Error update winner: ", error);
          that.updateParticipantList = false;
        });
      } else {
        this.participantsUpdateBatch.commit().then(function () {
          // offline :/
        }).catch(function () {
        });
        that.messageService.add({severity: 'success', summary: 'Update', detail: 'Update Players'});
        that.updateParticipantList = false;
      }

      this.participantsUpdateBatch = this.afs.firestore.batch();
    }


  }
}
