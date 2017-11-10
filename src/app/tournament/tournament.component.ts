import {AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
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
  FieldValues, GameSystemConfig, getColumnsForStandingsExport, getColumnsForTeamStandingsExport, getGameSystemConfig,
  getScore,
  getScoreForTeam, orderParticipantsForGameSystem, orderTeamsForGameSystem
} from "../models/game-systems";
import {MessageService} from "primeng/components/common/messageservice";
import {UUID} from "angular2-uuid";
import {getParticipantMatchForJSON, ParticipantMatch} from "../models/ParticipantMatch";

import {ConfirmationService, DataTable, SelectItem} from "primeng/primeng";
import {ConnectivityService} from "../services/connectivity-service";

import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {BatchService} from "../services/batch.service";
import {Subscription} from "rxjs/Subscription";
import {getTeamForJSON, Team} from "../models/Team";

import {getTeamMatchForJSON, TeamMatch} from "../models/TeamMatch";
import {TeamMatchService} from "../services/team-match.service";
import {ParticipantMatchService} from "../services/participant-match.service";

@Component({
  selector: 'ot-tournament',
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
  loadingParticipants: boolean;
  loadingTeams: boolean;
  swappingPlayer: boolean;

  orgaDialogVisibility: boolean;
  orgaForm: FormGroup;
  @ViewChild('orgaPasswordField') orgaPasswordField: ElementRef;

  isOrga: boolean;
  passwordWrong: boolean;

  tournamentFinished: boolean;
  shownRound: number;

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
  protected participantsMap: {} = {};
  protected participantsScoreMap: {} = {};
  protected participantsChoosePlayedMap: {};

  stackedPlayers: boolean;

  teamCreationDialogVisibility: boolean;
  fullyLoadedTeams: number;
  teamCreationForm: FormGroup;
  teamNameAlreadyTaken: boolean;

  protected teamsColRef: CollectionReference;
  protected teams: Team[] = [];

  protected teamNameSelectItemList: SelectItem[] = [];
  protected teamMemberMap: {} = {};
  protected teamsMap: {} = {};
  protected teamsScoreMap: {} = {};
  protected teamsUnsubscribeFunction: () => void;

  stackedTeams: boolean;

  protected possiblePlayersToAdd: Player[] = [];
  protected allPlayers: Player[] = [];
  protected gameSystemConfig: GameSystemConfig;
  protected playersUnsubscribeFunction: () => void;

  stackedTeamMatches: boolean;

  @ViewChild('standingsTable') standingsTable: DataTable;

  @ViewChild('teamStandingsTable') teamStandingsTable: DataTable;
  @ViewChild('teamMatchesTable') teamMatchesTable: DataTable;

  allMatchesFinished: boolean;
  noMatchFinished: boolean;
  loadingParticipantMatches: boolean;
  protected matchesColRef: CollectionReference;
  protected participantMatches: ParticipantMatch[] = [];
  protected participantMatchesUnsubscribeFunction: () => void;

  loadingTeamMatches: boolean;
  protected teamMatchesColRef: CollectionReference;
  protected teamMatches: TeamMatch[] = [];
  protected teamMatchesUnsubscribeFunction: () => void;

  sameRoundAgain: boolean;
  failedToCreateRound: boolean;
  pairRoundDialogVisibility: boolean;
  roundToPair: number;
  locationRestriction: boolean;

  dataToSave: boolean;
  private batchServiceSub: Subscription;
  updateData: boolean;

  expandedRowsTeamMatchTable: any[] = [];

  constructor(protected afs: AngularFirestore,
              private formBuilder: FormBuilder,
              private messageService: MessageService,
              private activeRouter: ActivatedRoute,
              private confirmationService: ConfirmationService,
              private conService: ConnectivityService,
              private batchService: BatchService,
              private teamMatchService: TeamMatchService,
              private participantMatchService: ParticipantMatchService) {

    this.tournamentId = this.activeRouter.snapshot.paramMap.get('id');

    this.tournamentDocRef = this.afs.firestore.doc('tournaments/' + this.tournamentId);
    this.participantsColRef = this.afs.firestore.collection('tournaments/' + this.tournamentId + '/participants');
    this.teamsColRef = this.afs.firestore.collection('tournaments/' + this.tournamentId + '/teams');
    this.matchesColRef = this.afs.firestore.collection('tournaments/' + this.tournamentId + '/roundMatches');
    this.teamMatchesColRef = this.afs.firestore.collection('tournaments/' + this.tournamentId + '/teamMatches');
    this.isOrga = true;

    this.orgaForm = this.formBuilder.group({
      user: [{value: 'Orga', disabled: true}, Validators.required],
      password: ['', Validators.required],
    });

    this.teamCreationForm = this.formBuilder.group({
      teamName: ['', Validators.required],
      teamLocation: [''],
    });
  }

  ngOnInit() {

    this.batchServiceSub = this.batchService.getBatchEventAsStream().subscribe((batchEvent: string) => {
      if (batchEvent === 'commit') {
        this.dataToSave = false;
      } else if (batchEvent !== 'commit') {
        this.dataToSave = true;
      }
    });

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

            that.gameSystemConfig = getGameSystemConfig(that.tournament.gameSystem);

            that.subscribeOnParticipantsMatches(that.shownRound);
            that.subscribeOnParticipants();

            if (that.tournament.type === 'team') {
              that.subscribeOnTeams();
              that.subscribeOnRoundTeamMatches(that.shownRound);
            }

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
            that.subscribeOnParticipantsMatches(that.shownRound);

            if (that.tournament.type === 'team') {
              that.subscribeOnTeams();
              that.subscribeOnRoundTeamMatches(that.shownRound);
            }
          }

          that.gameSystemConfig = getGameSystemConfig(that.tournament.gameSystem);
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
    if (this.participantMatchesUnsubscribeFunction) {
      this.participantMatchesUnsubscribeFunction();
    }
    if (this.teamMatchesUnsubscribeFunction) {
      this.teamMatchesUnsubscribeFunction();
    }

    if (this.teamsUnsubscribeFunction) {
      this.teamsUnsubscribeFunction();
    }

    if (this.batchServiceSub) {
      this.batchServiceSub.unsubscribe();
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
    that.participantsMap = {};
    that.participantsScoreMap = {};
    that.participantsChoosePlayedMap = {};

    that.teamMemberMap = {};
    that.fullyLoadedTeams = 0;

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
              participant[playerField.field] = change.doc.data()[playerField.field] ?
                change.doc.data()[playerField.field] : playerField.defaultValue;
            });

            _.forEach(that.gameSystemConfig.standingFields, function (standingValue: FieldValues) {
              participant[standingValue.field] = change.doc.data()[standingValue.field] ?
                change.doc.data()[standingValue.field] : [standingValue.defaultValue];
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

            that.participantsMap[participant.name] = participant;
            that.participantsScoreMap[participant.name] = getScore(participant);
            orderParticipantsForGameSystem(that.tournament.gameSystem, newParticipants, that.participantsScoreMap);

            if (that.tournament.type === 'team' && participant.team) {
              // console.log('found player ' + participant.name + ' with team: ' + participant.team);

              if (that.teamMemberMap[participant.team]) {
                that.teamMemberMap[participant.team] =
                  _.concat(that.teamMemberMap[participant.team], participant);

                if (that.teamMemberMap[participant.team].length === that.tournament.teamSize) {
                  // console.log('found fully loaded team: ' + participant.team);
                  that.fullyLoadedTeams = that.fullyLoadedTeams + 1;
                }
              } else {
                that.teamMemberMap[participant.team] = [participant];
              }
            }
          }
          if (change.type === "modified") {

            const newParticipants = _.cloneDeep(that.participants);
            const participant = getParticipantForJSON(change.doc.id, change.doc.data());

            let field;

            _.forEach(that.gameSystemConfig.participantFields, function (participantField: FieldValues) {
              field = change.doc.data()[participantField.field] ?
                change.doc.data()[participantField.field] : participantField.defaultValue;
              participant[participantField.field] = field;
            });

            _.forEach(that.gameSystemConfig.standingFields, function (standingValue: FieldValues) {
              field = change.doc.data()[standingValue.field] ?
                change.doc.data()[standingValue.field] : standingValue.defaultValue;
              participant[standingValue.field] = field;
            });

            const index = _.findIndex(that.participants, ['id', change.doc.id]);
            const oldParticipant = that.participants[index];
            newParticipants[index] = participant;
            that.participants = newParticipants;

            that.participantsMap[participant.name] = participant;
            that.participantsScoreMap[participant.name] = getScore(participant);
            orderParticipantsForGameSystem(that.tournament.gameSystem, newParticipants, that.participantsScoreMap);

            if (that.tournament.type === 'team' && participant.team && oldParticipant.team !== participant.team) {
              console.log('found player with modified team: ' + oldParticipant.team + ' to ' + participant.team);
            }
          }
          if (change.type === "removed") {
            const newParticipants = _.cloneDeep(that.participants);

            const index = _.findIndex(that.participants, ['id', change.doc.id]);
            newParticipants.splice(index, 1);
            that.participants = newParticipants;

            that.participantsMap[that.participants[index].name] = undefined;
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

  subscribeOnTeams() {

    const that = this;

    that.loadingTeams = true;
    that.teams = [];
    that.teamNameSelectItemList = [];

    if (that.teamsUnsubscribeFunction) {
      that.teamsUnsubscribeFunction();
    }

    that.teamNameSelectItemList.push({value: '', label: 'No Team'});

    that.teamsUnsubscribeFunction = this.teamsColRef
      .onSnapshot(function (snapshot) {
        snapshot.docChanges.forEach(function (change) {
          if (change.type === "added") {
            const newTeams = _.cloneDeep(that.teams);
            const team = getTeamForJSON(change.doc.id, change.doc.data());

            _.forEach(that.gameSystemConfig.standingFields, function (standingValue: FieldValues) {
              if (standingValue.isTeam) {
                team[standingValue.field] = change.doc.data()[standingValue.field];
              }
            });
            newTeams.push(team);

            that.teams = newTeams;
            that.teamNameSelectItemList.push({value: team.name, label: team.name});

            console.log('team: ' + JSON.stringify(team));

            const newTeamMap = _.cloneDeep(that.teamsMap);
            newTeamMap[team.name] = team;
            that.teamsMap = newTeamMap;

            that.teamsScoreMap[team.name] = getScoreForTeam(team);
            orderTeamsForGameSystem(that.tournament.gameSystem, newTeams, that.teamsScoreMap);
          }
          if (change.type === "modified") {
            const newTeams = _.cloneDeep(that.teams);
            const team = getTeamForJSON(change.doc.id, change.doc.data());

            _.forEach(that.gameSystemConfig.standingFields, function (standingValue: FieldValues) {
              if (standingValue.isTeam) {
                team[standingValue.field] = change.doc.data()[standingValue.field];
              }
            });
            const index = _.findIndex(that.teams, ['id', change.doc.id]);
            newTeams[index] = team;

            that.teams = newTeams;
            that.teamNameSelectItemList.push({value: team.name, label: team.name});

            const newTeamMap = _.cloneDeep(that.teamsMap);
            newTeamMap[team.name] = team;
            that.teamsMap = newTeamMap;

            that.teamsScoreMap[team.name] = getScoreForTeam(team);
            orderTeamsForGameSystem(that.tournament.gameSystem, newTeams, that.teamsScoreMap);
          }
          if (change.type === "removed") {
            const newTeams = _.cloneDeep(that.teams);

            const index = _.findIndex(that.teams, ['id', change.doc.id]);
            newTeams.splice(index, 1);
            that.teams = newTeams;

            that.teamsMap[that.teams[index].name] = undefined;
          }
        });
        that.loadingTeams = false;
      });

  }

  protected subscribeOnParticipantsMatches(shownRound: number) {

    const that = this;
    that.loadingParticipantMatches = true;
    that.participantMatches = [];

    if (this.participantMatchesUnsubscribeFunction) {
      this.participantMatchesUnsubscribeFunction();
    }

    this.participantMatchesUnsubscribeFunction = this.matchesColRef
      .where('round', '==', shownRound)
      .orderBy('matchDate', 'desc')
      .onSnapshot(function (snapshot) {

        that.updateData = true;

        snapshot.docChanges.forEach(function (change) {
          if (change.type === "added") {
            that.noMatchFinished = true;
            that.allMatchesFinished = true;
            const clonedMatches = _.cloneDeep(that.participantMatches);

            const newMatch = getParticipantMatchForJSON(change.doc.id, change.doc.data());

            let field;

            _.forEach(that.gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
              field = change.doc.data()[scoreField.fieldPlayerOne] ?
                change.doc.data()[scoreField.fieldPlayerOne] : scoreField.defaultValue;
              newMatch[scoreField.fieldPlayerOne] = field;
              field = change.doc.data()[scoreField.fieldPlayerTwo] ?
                change.doc.data()[scoreField.fieldPlayerTwo] : scoreField.defaultValue;
              newMatch[scoreField.fieldPlayerTwo] = field;
            });

            _.forEach(that.gameSystemConfig.choosePlayed, function (choosePlayed: FieldValues) {
              field = change.doc.data()[choosePlayed.fieldPlayerOne] ?
                change.doc.data()[choosePlayed.fieldPlayerOne] : choosePlayed.defaultValue;
              newMatch[choosePlayed.fieldPlayerOne] = field;
              field = change.doc.data()[choosePlayed.fieldPlayerTwo] ?
                change.doc.data()[choosePlayed.fieldPlayerTwo] : choosePlayed.defaultValue;
              newMatch[choosePlayed.fieldPlayerTwo] = field;
            });

            clonedMatches.push(newMatch);
            that.participantMatches = clonedMatches;

            _.forEach(that.participantMatches, function (match: ParticipantMatch) {
              if (match.finished) {
                that.noMatchFinished = false;
              } else {
                that.allMatchesFinished = false;
              }
            });
          }
          if (change.type === "modified") {
            that.noMatchFinished = true;
            that.allMatchesFinished = true;

            const clonedMatches = _.cloneDeep(that.participantMatches);
            const newMatch = getParticipantMatchForJSON(change.doc.id, change.doc.data());
            const index = _.findIndex(that.participantMatches, ['id', change.doc.id]);
            let field;

            _.forEach(that.gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
              field = change.doc.data()[scoreField.fieldPlayerOne] ?
                change.doc.data()[scoreField.fieldPlayerOne] : scoreField.defaultValue;
              newMatch[scoreField.fieldPlayerOne] = field;
              field = change.doc.data()[scoreField.fieldPlayerTwo] ?
                change.doc.data()[scoreField.fieldPlayerTwo] : scoreField.defaultValue;
              newMatch[scoreField.fieldPlayerTwo] = field;
            });

            _.forEach(that.gameSystemConfig.choosePlayed, function (choosePlayed: FieldValues) {
              field = change.doc.data()[choosePlayed.fieldPlayerOne] ?
                change.doc.data()[choosePlayed.fieldPlayerOne] : choosePlayed.defaultValue;
              newMatch[choosePlayed.fieldPlayerOne] = field;
              field = change.doc.data()[choosePlayed.fieldPlayerTwo] ?
                change.doc.data()[choosePlayed.fieldPlayerTwo] : choosePlayed.defaultValue;
              newMatch[choosePlayed.fieldPlayerTwo] = field;
            });

            clonedMatches[index] = newMatch;
            that.participantMatches = clonedMatches;

            _.forEach(that.participantMatches, function (match: ParticipantMatch) {
              if (match.finished) {
                that.noMatchFinished = false;
              } else {
                that.allMatchesFinished = false;
              }
            });
          }
          if (change.type === "removed") {
            const clonedMatches = _.cloneDeep(that.participantMatches);

            const index = _.findIndex(that.participantMatches, ['id', change.doc.id]);
            clonedMatches.splice(index, 1);
            that.participantMatches = clonedMatches;
          }
        });

        that.loadingParticipantMatches = false;
        that.updateData = false;
      });
  }

  protected subscribeOnRoundTeamMatches(shownRound: number) {

    const that = this;
    that.loadingTeamMatches = true;
    that.teamMatches = [];

    if (this.teamMatchesUnsubscribeFunction) {
      this.teamMatchesUnsubscribeFunction();
    }

    this.teamMatchesUnsubscribeFunction = this.teamMatchesColRef
      .where('round', '==', shownRound)
      .orderBy('matchDate', 'desc')
      .onSnapshot(function (snapshot) {

        that.updateData = true;

        snapshot.docChanges.forEach(function (change) {
          if (change.type === "added") {
            that.noMatchFinished = true;
            that.allMatchesFinished = true;
            const cloneTeamMatches = _.cloneDeep(that.teamMatches);
            const newTeamMatch = getTeamMatchForJSON(change.doc.id, change.doc.data());
            let field;

            _.forEach(that.gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
              field = change.doc.data()[scoreField.fieldPlayerOne] ?
                change.doc.data()[scoreField.fieldPlayerOne] : scoreField.defaultValue;
              newTeamMatch[scoreField.fieldPlayerOne] = field;
              field = change.doc.data()[scoreField.fieldPlayerTwo] ?
                change.doc.data()[scoreField.fieldPlayerTwo] : scoreField.defaultValue;
              newTeamMatch[scoreField.fieldPlayerTwo] = field;
            });
            cloneTeamMatches.push(newTeamMatch);
            that.teamMatches = cloneTeamMatches;

            _.forEach(that.teamMatches, function (teamMatch: TeamMatch) {
              if (teamMatch.finished) {
                that.noMatchFinished = false;
              } else {
                that.allMatchesFinished = false;
              }
            });
          }
          if (change.type === "modified") {
            console.log("teamMatch modified");
            that.noMatchFinished = true;
            that.allMatchesFinished = true;

            const cloneTeamMatches = _.cloneDeep(that.teamMatches);
            const newTeamMatch = getTeamMatchForJSON(change.doc.id, change.doc.data());
            const index = _.findIndex(cloneTeamMatches, ['id', change.doc.id]);
            let field;

            _.forEach(that.gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
              field = change.doc.data()[scoreField.fieldPlayerOne] ?
                change.doc.data()[scoreField.fieldPlayerOne] : scoreField.defaultValue;
              newTeamMatch[scoreField.fieldPlayerOne] = field;
              field = change.doc.data()[scoreField.fieldPlayerTwo] ?
                change.doc.data()[scoreField.fieldPlayerTwo] : scoreField.defaultValue;
              newTeamMatch[scoreField.fieldPlayerTwo] = field;
            });
            cloneTeamMatches[index] = newTeamMatch;
            that.teamMatches = cloneTeamMatches;

            _.forEach(that.teamMatches, function (teamMatch: TeamMatch) {
              if (teamMatch.finished) {
                that.noMatchFinished = false;
              } else {
                that.allMatchesFinished = false;
              }
            });
          }
          if (change.type === "removed") {
            const clonedMatches = _.cloneDeep(that.teamMatches);

            const index = _.findIndex(clonedMatches, ['id', change.doc.id]);
            clonedMatches.splice(index, 1);
            that.teamMatches = clonedMatches;
          }
        });

        if (that.isOrga) {
          setTimeout(() => {
            that.expandTeamMatches();
          }, 100);
        }

        that.loadingTeamMatches = false;
        that.updateData = false;
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

  getScoreTillRoundForTeam(team: Team) {

    let scoreSum = 0;
    _.forEach(team.roundScores, function (score: number) {
      scoreSum = scoreSum + score;
    });
    return scoreSum;
  }

  addParticipant(playerToAdd: Player) {

    const that = this;

    const participant: Participant = {
      name: playerToAdd.name,
      location: playerToAdd.location ? playerToAdd.location : '',
      team: playerToAdd.team ? playerToAdd.team : '',
      opponentParticipantsNames: [],
      roundScores: []
    };

    console.log("this.playerToAdd: ", playerToAdd);

    let field;
    _.forEach(that.gameSystemConfig.participantFields, function (participantField: FieldValues) {
      field = playerToAdd[participantField.field] ? playerToAdd[participantField.field] : participantField.defaultValue;
      participant[participantField.field] = field;
    });

    _.forEach(that.gameSystemConfig.standingFields, function (standingValue: FieldValues) {
      participant[standingValue.field] = [standingValue.defaultValue];
    });

    const uuid = UUID.UUID();
    participant.id = uuid;

    this.batchService.set(this.participantsColRef.doc(uuid), participant);


    // modify both lists
    const newParticipants = _.cloneDeep(that.participants);
    newParticipants.push(participant);
    that.participants = newParticipants;

    const newPlayers = _.cloneDeep(that.possiblePlayersToAdd);
    const index = _.findIndex(that.possiblePlayersToAdd, ['id', playerToAdd.id]);
    newPlayers.splice(index, 1);
    that.possiblePlayersToAdd = newPlayers;

    that.messageService.add({
      severity: 'success',
      summary: 'Update', detail: 'Player added. Save to start tournament and publish new list of participants'
    });

    if (this.tournament.type === 'team' && participant.team) {

      if (!this.teamMemberMap[participant.team]) {
        console.log("create team of participant  ", playerToAdd);

        const team: Team = {
          name: participant.team,
          location: participant.team ? participant.team : "",
          sgw: [0],
          opponentTeamNames: [],
          roundScores: []
        };

        _.forEach(that.gameSystemConfig.standingFields, function (standingValue: FieldValues) {
          team[standingValue.field] = [standingValue.defaultValue];
        });

        const teamUuid = UUID.UUID();
        team.id = teamUuid;

        this.batchService.set(this.teamsColRef.doc(teamUuid), team);
      } else {
        that.teamMemberMap[participant.team] =
          _.concat(that.teamMemberMap[participant.team], participant);
      }
    }
  }

  addTeam() {

    const that = this;

    const team: Team = {
      name: this.teamCreationForm.get('teamName').value,
      location: this.teamCreationForm.get('teamLocation').value ? this.teamCreationForm.get('teamLocation').value : "",
      sgw: [0],
      opponentTeamNames: [],
      roundScores: []
    };

    _.forEach(that.gameSystemConfig.standingFields, function (standingValue: FieldValues) {
      team[standingValue.field] = [standingValue.defaultValue];
    });

    that.teamNameAlreadyTaken = false;
    _.forEach(that.teams, function (checkedTeam: Team) {
      if (checkedTeam.name.toLowerCase() === team.name.toLowerCase()) {
        that.teamNameAlreadyTaken = true;
      }
    });

    if (!that.teamNameAlreadyTaken) {

      const uuid = UUID.UUID();
      team.id = uuid;

      this.batchService.set(this.teamsColRef.doc(uuid), team);

      const newTeams = _.cloneDeep(that.teams);
      newTeams.push(team);
      that.teams = newTeams;

      that.messageService.add({severity: 'success', summary: 'Update', detail: 'Team added'});

      that.teamCreationDialogVisibility = false;
      that.teamNameSelectItemList.push({value: team.name, label: team.name});
    }
  }

  deleteParticipant(participant: Participant) {

    const that = this;

    const participantDocRef = this.participantsColRef.doc(participant.id);

    this.batchService.delete(participantDocRef);

    // modify both lists
    const newParticipants = _.cloneDeep(that.participants);
    const indexParticipants = _.findIndex(that.participants, ['id', participant.id]);
    newParticipants.splice(indexParticipants, 1);
    that.participants = newParticipants;

    const newPlayers = _.cloneDeep(that.possiblePlayersToAdd);
    const indexPlayers = _.findIndex(that.allPlayers, ['name', participant.name]);
    newPlayers.splice(indexPlayers, 0, that.allPlayers[indexPlayers]);
    that.possiblePlayersToAdd = newPlayers;

    that.messageService.add({
      severity: 'success',
      summary: 'Update', detail: 'Player removed. Save to start tournament and publish new list of participants'
    });
  }

  deleteTeam(team: Team) {

    const that = this;

    const teamDocRef = this.teamsColRef.doc(team.id);

    const newTeams = _.cloneDeep(that.teams);
    const index = _.findIndex(that.teams, ['id', team.id]);
    newTeams.splice(index, 1);
    that.teams = newTeams;

    this.batchService.delete(teamDocRef);

    that.messageService.add({
      severity: 'success',
      summary: 'Update', detail: 'Team removed.'
    });

  }

  onEditParticipant(event: any) {

    console.log(event.data);

    const participantDocRef = this.participantsColRef.doc(event.data.id);
    const participant: Participant = getParticipantForJSON(event.data.id, event.data);

    this.batchService.update(participantDocRef, participant);

  }

  onEditTeam(event: any) {

    console.log(event.data);

    const teamDocRef = this.teamsColRef.doc(event.data.id);
    const team: Team = getTeamForJSON(event.data.id, event.data);

    this.batchService.update(teamDocRef, team);

  }

  onEditMatch(event: any) {

    console.log(event.data);

    const matchDocRef = this.matchesColRef.doc(event.data.id);
    const match: ParticipantMatch = getParticipantMatchForJSON(event.data.id, event.data);

    this.batchService.update(matchDocRef, match);

  }

  changeParticipant(participant: Participant) {

    console.log("change participant : " + JSON.stringify(participant));
    this.participantToChange = participant;
  }


  updateParticipant() {

    const that = this;

    if (this.participantToChange) {
      const participantDocRef = this.participantsColRef.doc(that.participantToChange.id);
      this.batchService.update(participantDocRef, this.participantToChange);

    }
  }

  changeTeam(participant: Participant) {

    const that = this;

    console.log("change team of participant : " + JSON.stringify(participant));
    this.participantToChange = participant;


    that.teamMemberMap = {};

    _.forEach(that.participants, function (parti: Participant) {
      if (that.teamMemberMap[parti.team]) {
        that.teamMemberMap[parti.team] =
          _.concat(that.teamMemberMap[parti.team], parti);
      } else {
        that.teamMemberMap[parti.team] = [parti];
      }
    });

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

  showPreviousRound() {

    this.shownRound = this.shownRound - 1;

    this.subscribeOnParticipantsMatches(this.shownRound);
  }

  showNextRound() {

    this.shownRound = this.shownRound + 1;

    this.subscribeOnParticipantsMatches(this.shownRound);
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

    let promise: Promise<void>;

    if (this.tournament.type === 'team') {
      promise = that.teamMatchService.createNextTeamRound(
        this.tournament, this.teamMemberMap, this.teams, this.participants, 1, this.locationRestriction);
    } else {
      promise = that.participantMatchService.createNextRound(this.tournament, this.participants, 1, this.locationRestriction);

    }
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

  getActualTeamScore(team: Team) {

    return this.teamsScoreMap[team.name];
  }

  getScoreTeamTooltip(team: Team) {
    let scoreTooltip = '';
    _.forEach(team.roundScores, function (score: number, index) {
      scoreTooltip = scoreTooltip.concat(
        'Round' + (index + 1) + ': ' + score + ' VS ' + team.opponentTeamNames[index] + '\n');
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

  getSgwSum(team: Team) {
    let sgwSum = 0;

    _.forEach(team.sgw, function (field: number) {
      sgwSum = sgwSum + field;
    });

    return sgwSum;
  }

  getSgwSumTooltip(team: Team) {
    let sgwTooltip = '';

    _.forEach(team.sgw, function (sgw: number, index) {
      sgwTooltip = sgwTooltip.concat(
        'Round' + (index + 1) + ': ' + sgw + '\n');
    });

    return sgwTooltip;
  }

  getTeamStandingFieldValue(standingField: FieldValues, team: Team) {

    let standingFieldSum = 0;

    _.forEach(team[standingField.field], function (field: number) {
      standingFieldSum = standingFieldSum + field;
    });

    return standingFieldSum;
  }

  getTeamStandingFieldValueTooltip(standingField: FieldValues, team: Team) {
    let scoreTooltip = '';

    _.forEach(team[standingField.field], function (score: number, index) {
      scoreTooltip = scoreTooltip.concat(
        'Round' + (index + 1) + ': ' + score + '\n');
    });

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

        let promise: Promise<void>;
        if (this.tournament.type === 'team') {
          promise = this.teamMatchService.deleteTeamRound(
            this.tournament, this.participantMatches, this.participants, this.teamMatches, this.teams);
        } else {
          promise = this.participantMatchService.deleteRound(this.tournament, this.participantMatches, this.participants);

        }

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


  getStyleForMatchesRow(rowData: ParticipantMatch) {

    return rowData.finished ? 'row-finished' : '';
  }

  pairAgain() {

    const that = this;
    this.pairingAgain = true;

    let promiseDelete: Promise<void>;

    if (this.tournament.type === 'team') {
      promiseDelete = this.teamMatchService.deleteTeamRound(this.tournament, this.participantMatches,
        this.participants, this.teamMatches, this.teams);
    } else {
      promiseDelete = this.participantMatchService.deleteRound(this.tournament, this.participantMatches, this.participants);
    }
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

      let promiseCreate: Promise<void>;

      if (this.tournament.type === 'team') {
        promiseCreate = this.teamMatchService.createNextTeamRound(this.tournament, this.teamMemberMap,
          this.teams, this.participants, this.tournament.actualRound, this.locationRestriction);
      } else {
        promiseCreate = this.participantMatchService.createNextRound(
          this.tournament, this.participants, this.tournament.actualRound, this.locationRestriction);
      }

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

    const promiseCreate = this.participantMatchService.
      createNextRound(this.tournament, this.participants, nextRound, this.locationRestriction);

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


  exportTeamMatches() {
    this.teamMatchesTable.exportCSV();
  }

  expandTeamMatches() {

    const that = this;

    if (this.teamMatchesTable) {
      console.log("expand all: ");
      that.expandedRowsTeamMatchTable = that.teamMatchesTable.value;
      that.teamMatchesTable.handleDataChange();
    }
  }

  collapseTeamMatches() {
    console.log("collapse all: ");
    this.expandedRowsTeamMatchTable = [];
    this.teamMatchesTable.handleDataChange();
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

  exportTeamStandings() {

    const columns: number[] = getColumnsForTeamStandingsExport(this.tournament.gameSystem);

    let headerString = '';
    const headers = this.teamStandingsTable.el.nativeElement.querySelectorAll('.ui-column-title');
    for (const column of columns) {
      headerString += headers[column - 1].innerText + ';';
    }
    const tableRows = this.teamStandingsTable.el.nativeElement.querySelectorAll('TR');
    const rowsString: string[] = [];
    for (let i = 1; i < tableRows.length; i++) {
      let rowString = '';
      const tableRow = tableRows[i].querySelectorAll('.ui-cell-data');

      let teamName: string;
      for (let j = 0; j < columns.length; j++) {
        if (j === 0) {
          teamName = tableRow[0].innerText;
        }
        if (j === 2) {
          console.log('Team ' + teamName + ' members: ' + this.teamMemberMap[teamName].map((par: Participant) => par.name).join(', '));
          rowString += this.teamMemberMap[teamName] ?
            this.teamMemberMap[teamName].map((par: Participant) => par.name) + ';' : 'No members yet' + ';';
        } else {
          rowString += tableRow[columns[j] - 1].innerText.replace(/[\n\r]+/g, '').replace(/\s{2,}/g, ' ').trim() + ';';
        }
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
    link.setAttribute('download', 'Team_Standings_Round_' + this.shownRound + '.csv');
    document.body.appendChild(link); // Required for FF
    link.click();
  }

  getTeamMemberNames(teamName: string): string {
    if (this.teamMemberMap[teamName]) {
      return this.teamMemberMap[teamName].map((par: Participant) => par.name).join(', ');
    } else {
      return '-';
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
      return 'Final Player Standings';
    } else if (this.shownRound === 0) {
      return 'Players';
    } else {
      return 'Player Standings Round ' + this.shownRound;
    }
  }

  getTeamTableHeading(): string {

    if (this.tournamentFinished) {
      return 'Final Team Standings';
    } else if (this.shownRound === 0) {
      return 'Teams';
    } else {
      return 'Team Standings Round ' + this.shownRound;
    }
  }
}
