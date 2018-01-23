import {Component, ElementRef, OnDestroy, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
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
  FieldValues, GameSystemConfig, getColumnsForTeamStandingsExport, getGameSystemConfig,
  getScore,
  getScoreForTeam, orderParticipantsForGameSystem, orderTeamsForGameSystem
} from "../models/game-systems";
import {MessageService} from "primeng/components/common/messageservice";
import {UUID} from "angular2-uuid";
import {getParticipantMatchForJSON, ParticipantMatch} from "../models/ParticipantMatch";

import {ConfirmationService, DataTable, SelectItem} from "primeng/primeng";
import {ConnectivityService} from "../services/connectivity-service";

import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {BatchService, BatchServiceState} from "../services/batch.service";
import {Subscription} from "rxjs/Subscription";
import {getTeamForJSON, Team} from "../models/Team";

import {getTeamMatchForJSON, TeamMatch} from "../models/TeamMatch";
import {TeamMatchService} from "../services/team-match.service";
import {ParticipantMatchService} from "../services/participant-match.service";
import {TopBarMenuService} from "../services/topBarMenu.service";

import WriteBatch = firebase.firestore.WriteBatch;

@Component({
  selector: 'ot-tournament',
  templateUrl: './tournament.component.html',
  styleUrls: ['./tournament.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TournamentComponent implements OnInit, OnDestroy {

  accessAsOrga: boolean;
  addingPlayer: boolean;
  removingPlayer: boolean;
  addingTeam: boolean;
  removingTeam: boolean;
  loadingTournament: boolean;
  loadingPlayers: boolean;
  startingTournament: boolean;
  deletingRound: boolean;
  creatingNextRound: boolean;
  pairingAgain: boolean;
  loadingParticipants: boolean;
  loadingTeams: boolean;
  swappingTeam: boolean;
  savingData: boolean;

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

  protected participants: Participant[] = [];
  protected participantsColRef: CollectionReference;
  protected participantsUnsubscribeFunction: () => void;
  protected participantsMap: {} = {};
  protected participantsScoreMap: {} = {};
  protected participantsChoosePlayedMap: {};

  stackedGlobalPlayers: boolean;
  fullyLoadedTeams: number;
  teamOverloaded: boolean;
  playerWithoutTeam: boolean;

  protected teamsColRef: CollectionReference;
  protected teams: Team[] = [];

  protected teamNameSelectItemList: SelectItem[] = [];
  protected teamsMemberMap: {} = {};
  protected teamsMap: {} = {};
  protected teamsScoreMap: {} = {};
  protected teamsUnsubscribeFunction: () => void;

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

  teamToSwap: Team;
  matchToSwap: TeamMatch;
  teamSwapIndex: number;
  opponentOfTeamToSwap: Team;

  teamOneSwapped: boolean;
  teamTwoSwapped: boolean;
  messageAlreadyPlayed: string;

  constructor(protected afs: AngularFirestore,
              private formBuilder: FormBuilder,
              private messageService: MessageService,
              private activeRouter: ActivatedRoute,
              private confirmationService: ConfirmationService,
              private conService: ConnectivityService,
              private batchService: BatchService,
              private topBarMenuService: TopBarMenuService,
              private teamMatchService: TeamMatchService,
              private participantMatchService: ParticipantMatchService) {

    console.log('tournaments.component.create');

    this.tournamentId = this.activeRouter.snapshot.paramMap.get('id');

    this.tournamentDocRef = this.afs.firestore.doc('tournaments/' + this.tournamentId);
    this.participantsColRef = this.afs.firestore.collection('tournaments/' + this.tournamentId + '/participants');
    this.teamsColRef = this.afs.firestore.collection('tournaments/' + this.tournamentId + '/teams');
    this.matchesColRef = this.afs.firestore.collection('tournaments/' + this.tournamentId + '/roundMatches');
    this.teamMatchesColRef = this.afs.firestore.collection('tournaments/' + this.tournamentId + '/teamMatches');
    // this.isOrga = true;

    this.orgaForm = this.formBuilder.group({
      user: [{value: 'Orga', disabled: true}, Validators.required],
      password: ['', Validators.required],
    });

    this.topBarMenuService.setTopBarVisibility(false);
  }

  ngOnInit() {

    console.log('tournaments.component.init');

    this.batchServiceSub = this.batchService.getBatchEventAsStream().subscribe((batchEvent: string) => {
      if (batchEvent === BatchServiceState.COMMIT_STARTED) {
        this.savingData = true;
      } else if (batchEvent === BatchServiceState.SET ||
        batchEvent === BatchServiceState.DELETE ||
        batchEvent === BatchServiceState.UPDATE) {
        this.dataToSave = true;
      } else if (batchEvent === BatchServiceState.COMMIT_COMPLETED) {
        this.dataToSave = false;
        this.savingData = false;
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

            that.subscribeOnParticipants();

            if (that.tournament.type === 'team') {
              that.subscribeOnTeams();
              that.subscribeOnRoundTeamMatches(that.shownRound);
            } else {
              that.subscribeOnParticipantsMatches(that.shownRound);
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
            if (that.tournament.type === 'team') {
              that.subscribeOnRoundTeamMatches(that.shownRound);
            } else {
              that.subscribeOnParticipantsMatches(that.shownRound);
            }
          }

          that.gameSystemConfig = getGameSystemConfig(that.tournament.gameSystem);
          that.subscribeOnParticipants();
          if (that.tournament.type === 'team') {
            that.subscribeOnTeams();
          }

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

    this.accessAsOrga = true;

    setTimeout(() => {
      this.passwordWrong = false;

      if ((this.orgaForm.get('password').value ? this.orgaForm.get('password').value : "") === this.tournament.password) {
        this.isOrga = true;
        this.orgaDialogVisibility = false;
        this.accessAsOrga = false;
      } else {
        this.passwordWrong = true;
        this.accessAsOrga = false;
      }
    });
  }

  protected subscribeOnParticipants() {

    const that = this;
    that.loadingParticipants = true;
    that.participants = [];
    that.participantsMap = {};
    that.participantsScoreMap = {};
    that.participantsChoosePlayedMap = {};

    that.teamsMemberMap = {};
    that.fullyLoadedTeams = 0;
    that.teamOverloaded = false;
    that.playerWithoutTeam = false;

    if (that.participantsUnsubscribeFunction) {
      that.participantsUnsubscribeFunction();
    }

    that.participantsUnsubscribeFunction = this.participantsColRef
      .orderBy('name', 'desc')
      .onSnapshot(function (snapshot) {

        const clonedParticipants = _.cloneDeep(that.participants);
        const clonedTeamsMemberMap = _.cloneDeep(that.teamsMemberMap);

        snapshot.docChanges.forEach(function (change) {
          if (change.type === "added") {

            if (!that.participantsMap[change.doc.data().name]) {

              const participant = getParticipantForJSON(change.doc.id, change.doc.data(), that.gameSystemConfig);

              _.forEach(that.gameSystemConfig.choosePlayed, function (choosePlayed: FieldValues) {

                const items: SelectItem[] = [];
                _.forEach(participant[choosePlayed.field], function (choosingItem: string) {
                  items.push({label: choosingItem, value: choosingItem});
                });
                that.participantsChoosePlayedMap[participant.name] = items;
              });

              clonedParticipants.push(participant);

              that.participantsMap[participant.name] = participant;
              that.participantsScoreMap[participant.name] = getScore(participant);

              if (that.tournament.type === 'team') {
                // console.log('found player ' + participant.name + ' with team: ' + participant.team);

                if (participant.team !== '') {
                  if (clonedTeamsMemberMap[participant.team]) {
                    clonedTeamsMemberMap[participant.team] =
                      _.concat(clonedTeamsMemberMap[participant.team], participant);

                    const teamMembers = clonedTeamsMemberMap[participant.team];

                    if (teamMembers.length >= that.tournament.teamSize) {
                      console.log('found fully loaded team: ' + participant.team);
                      that.fullyLoadedTeams = that.fullyLoadedTeams + 1;
                    }
                    if (teamMembers.length > that.tournament.teamSize) {
                      console.log('found teamOverloaded: ' + participant.team);
                      that.teamOverloaded = true;
                    }
                  } else {
                    console.log('found player with team: ' + participant.team);
                    clonedTeamsMemberMap[participant.team] = [participant];
                  }
                } else {
                  that.playerWithoutTeam = true;
                }
              }
            }
          }
          if (change.type === "modified") {
            const participant = getParticipantForJSON(change.doc.id, change.doc.data(), that.gameSystemConfig);
            _.forEach(that.gameSystemConfig.choosePlayed, function (choosePlayed: FieldValues) {

              const items: SelectItem[] = [];
              _.forEach(participant[choosePlayed.field], function (choosingItem: string) {
                items.push({label: choosingItem, value: choosingItem});
              });
              that.participantsChoosePlayedMap[participant.name] = items;
            });

            const index = _.findIndex(clonedParticipants, ['id', change.doc.id]);
            clonedParticipants[index] = participant;

            that.participantsMap[participant.name] = participant;
            that.participantsScoreMap[participant.name] = getScore(participant);
          }
          if (change.type === "removed") {

            const index = _.findIndex(clonedParticipants, ['id', change.doc.id]);

            if (index !== -1) {
              clonedParticipants.splice(index, 1);
            }

            if (clonedTeamsMemberMap[change.doc.data().name]) {
              delete clonedTeamsMemberMap[change.doc.data().name];
            }

            _.forEach(clonedTeamsMemberMap[change.doc.data().team], function (member: Participant, i: number) {
              if (member.name === change.doc.data().name) {
                clonedTeamsMemberMap[change.doc.data().team].splice(i, 1);
              }
            });
          }
        });
        orderParticipantsForGameSystem(that.tournament.gameSystem, clonedParticipants, that.participantsScoreMap);
        that.participants = clonedParticipants;
        that.teamsMemberMap = clonedTeamsMemberMap;

        // console.log('teamsMemberMap: ' + JSON.stringify(that.teamsMemberMap));

        that.loadingParticipants = false;
        if (that.tournament.actualRound === 0 && that.allPlayers.length === 0) {
          console.log('round 0: subscribeOnPlayers');
          that.subscribeOnPlayers();

          if (that.tournament.type === 'team') {
            console.log('round 0: subscribeOnTeams');
            that.subscribeOnTeams();
          }
        } else {
          console.log('round > 0: sort participants  with scoring');
          orderParticipantsForGameSystem(that.tournament.gameSystem, that.participants, that.participantsScoreMap);
          if (that.tournament.type === 'team') {
            console.log('round > 0: sort teams  with scoring');
            orderTeamsForGameSystem(that.tournament.gameSystem, that.teams, that.teamsScoreMap);
          }
        }

      });
  }

  subscribeOnPlayers() {

    console.log('subscribeOnPlayers');
    const that = this;

    that.loadingPlayers = true;

    if (that.playersUnsubscribeFunction) {
      that.playersUnsubscribeFunction();
    }

    that.playersUnsubscribeFunction = that.afs.firestore.collection('players')
      .where('gameSystems.' + that.tournament.gameSystem, '==', true)
      .onSnapshot(function (playerCol) {
        that.allPlayers = [];

        playerCol.forEach(function (playerDoc) {
          const player: Player = getPlayerForJSON(playerDoc.id, playerDoc.data());

          _.forEach(that.gameSystemConfig.playerFields, function (playerField: FieldValues) {
            const fieldValue = playerDoc.data()[playerField.field] ? playerDoc.data()[playerField.field] : playerField.defaultValue;
            player[playerField.field] = fieldValue;
          });

          that.allPlayers.push(player);
        });
        that.loadingPlayers = false;
      });

  }

  subscribeOnTeams() {

    console.log('subscribeOnTeams');

    const that = this;

    that.loadingTeams = true;
    that.teams = [];
    that.teamsMap = {};
    that.teamNameSelectItemList = [];

    if (that.teamsUnsubscribeFunction) {
      that.teamsUnsubscribeFunction();
    }

    that.teamNameSelectItemList.push({value: '', label: 'No Team'});

    that.teamsUnsubscribeFunction = this.teamsColRef
      .onSnapshot(function (snapshot) {
        const clonedTeams = _.cloneDeep(that.teams);

        snapshot.docChanges.forEach(function (change) {
          if (change.type === "added") {

            const team = getTeamForJSON(change.doc.id, change.doc.data());
            if (!that.teamsMap[team.name]) {

              _.forEach(that.gameSystemConfig.standingFields, function (standingValue: FieldValues) {
                if (standingValue.isTeam) {
                  team[standingValue.field] = change.doc.data()[standingValue.field];
                }
              });
              clonedTeams.push(team);

              that.teamNameSelectItemList.push({value: team.name, label: team.name});
              that.teamsMap[team.name] = team;
              that.teamsScoreMap[team.name] = getScoreForTeam(team);
            }
          }
          if (change.type === "modified") {
            const team = getTeamForJSON(change.doc.id, change.doc.data());

            _.forEach(that.gameSystemConfig.standingFields, function (standingValue: FieldValues) {
              if (standingValue.isTeam) {
                team[standingValue.field] = change.doc.data()[standingValue.field];
              }
            });
            const index = _.findIndex(clonedTeams, ['id', change.doc.id]);
            clonedTeams[index] = team;

            that.teamNameSelectItemList.push({value: team.name, label: team.name});
            that.teamsMap[team.name] = team;
            that.teamsScoreMap[team.name] = getScoreForTeam(team);

          }
          if (change.type === "removed") {
            const index = _.findIndex(clonedTeams, ['id', change.doc.id]);

            if (index !== -1) {
              clonedTeams.splice(index, 1);
            }

            if (that.teamsMap[change.doc.data().name]) {
              delete that.teamsMap[change.doc.data().name];
            }
          }
        });

        that.loadingTeams = false;
        that.teams = clonedTeams;
        that.teamNameSelectItemList.sort(function (a, b) {
          return a.value < b.value  ? -1 : 1;
        });
        if (that.tournament.actualRound > 0) {
          orderTeamsForGameSystem(that.tournament.gameSystem, that.teams, that.teamsScoreMap);
        }
      });

  }

  protected subscribeOnParticipantsMatches(shownRound: number) {

    console.log('subscribeOnParticipantsMatches');

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

        that.noMatchFinished = true;
        that.allMatchesFinished = true;

        const clonedMatches = _.cloneDeep(that.participantMatches);
        that.updateData = true;

        snapshot.docChanges.forEach(function (change) {
          if (change.type === "added") {
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
          }
          if (change.type === "modified") {

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

            const index = _.findIndex(clonedMatches, ['id', change.doc.id]);
            clonedMatches[index] = newMatch;
          }
          if (change.type === "removed") {
            const index = _.findIndex(clonedMatches, ['id', change.doc.id]);
            clonedMatches.splice(index, 1);
          }
        });

        clonedMatches.sort(function (m1: ParticipantMatch, m2: ParticipantMatch) {
          return (that.getScoreTillRoundForParticipant(m1.participantOne) + that.getScoreTillRoundForParticipant(m1.participantTwo)) <
          (that.getScoreTillRoundForParticipant(m2.participantOne) + that.getScoreTillRoundForParticipant(m2.participantTwo)) ? 1 : -1;
        });

        that.participantMatches = clonedMatches;

        _.forEach(that.participantMatches, function (match: ParticipantMatch) {
          if (match.finished) {
            that.noMatchFinished = false;
          } else {
            that.allMatchesFinished = false;
          }
        });

        that.loadingParticipantMatches = false;
        that.updateData = false;
      });
  }

  protected subscribeOnRoundTeamMatches(shownRound: number) {

    console.log('subscribeOnRoundTeamMatches');

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
        that.noMatchFinished = true;
        that.allMatchesFinished = true;
        const cloneTeamMatches = _.cloneDeep(that.teamMatches);

        snapshot.docChanges.forEach(function (change) {
          if (change.type === "added") {
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
          }
          if (change.type === "modified") {
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
            const index = _.findIndex(cloneTeamMatches, ['id', change.doc.id]);
            cloneTeamMatches[index] = newTeamMatch;
          }
          if (change.type === "removed") {
            const index = _.findIndex(cloneTeamMatches, ['id', change.doc.id]);
            cloneTeamMatches.splice(index, 1);
          }
        });

        that.loadingTeamMatches = false;
        that.updateData = false;

        cloneTeamMatches.sort(function (tm1: TeamMatch, tm2: TeamMatch) {
          return (that.getScoreTillRoundForTeam(tm1.teamOne) + that.getScoreTillRoundForTeam(tm1.teamTwo)) <
                 (that.getScoreTillRoundForTeam(tm2.teamOne) + that.getScoreTillRoundForTeam(tm2.teamTwo)) ? 1 : -1;
        });

        that.teamMatches = cloneTeamMatches;

        _.forEach(that.teamMatches, function (match: TeamMatch) {
          if (match.finished) {
            that.noMatchFinished = false;
          } else {
            that.allMatchesFinished = false;
          }
        });

        // if (that.isOrga) {
        //   setTimeout(() => {
        //     that.expandTeamMatches();
        //   }, 100);
        // }
      });
  }

  checkIfPlayerIsInTournament(player: Player): boolean {

    return this.participantsMap[player.name];
  }

  publishRound() {
    this.tournament.publishedRound = this.tournament.actualRound;

    this.tournamentDocRef.update(this.tournament).then(function () {
      console.log('round published');
    });
  }


  getScoreTillRoundForTeam(team: Team) {

    let scoreSum = 0;
    _.forEach(team.roundScores, function (score: number) {
      scoreSum = scoreSum + score;
    });
    return scoreSum;
  }

  getScoreTillRoundForParticipant(participant: Participant) {

    let scoreSum = 0;
    _.forEach(participant.roundScores, function (score: number) {
      scoreSum = scoreSum + score;
    });
    return scoreSum;
  }

  addParticipant(playerToAdd: Player) {

    this.addingPlayer = true;
    const that = this;

    const participant: Participant = {
      name: playerToAdd.name,
      location: playerToAdd.location ? playerToAdd.location : '',
      team: playerToAdd.team ? playerToAdd.team : '',
      opponentParticipantsNames: [],
      roundScores: [],
      droppedInRound: 0
    };

    console.log("this.playerToAdd: ", playerToAdd);

    let field;
    _.forEach(that.gameSystemConfig.participantFields, function (participantField: FieldValues) {
      if (participantField.field === 'links') {
        field = playerToAdd.links[that.tournament.gameSystem] ? playerToAdd.links[that.tournament.gameSystem] : [];
        participant.links = field;
      } else {
        field = playerToAdd[participantField.field] ? playerToAdd[participantField.field] : participantField.defaultValue;
        participant[participantField.field] = field;
      }
    });

    _.forEach(that.gameSystemConfig.standingFields, function (standingValue: FieldValues) {
      participant[standingValue.field] = [standingValue.defaultValue];
    });

    const uuid = UUID.UUID();
    participant.id = uuid;

    this.batchService.set(this.participantsColRef.doc(uuid), participant);

    const clonedParticipants = _.cloneDeep(that.participants);
    clonedParticipants.push(participant);
    that.participants = clonedParticipants;

    that.participantsMap[participant.name] = participant;

    if (this.tournament.type === 'team') {


      if (participant.team !== '') {
        if (!this.teamsMemberMap[participant.team]) {
          console.log("create team of participant  ", playerToAdd);

          const team: Team = {
            name: participant.team.trim(),
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

          const newTeams = _.cloneDeep(that.teams);
          newTeams.push(team);
          that.teams = newTeams;

          that.teamNameSelectItemList.push({value: team.name, label: team.name});
          that.teamsMap[team.name] = team;
        }
        this.calculateTeamCapacities();
      }
    }

    that.addingPlayer = false;
    that.messageService.add({
      severity: 'success',
      summary: 'Update', detail: 'Player added. Save to start tournament and publish new list of participants'
    });

  }

  handleAddTeam(team: Team) {

    this.addingTeam = true;
    const that = this;

    this.batchService.set(this.teamsColRef.doc(team.id), team);

    const newTeams = _.cloneDeep(that.teams);
    newTeams.push(team);
    that.teams = newTeams;

    that.messageService.add({severity: 'success', summary: 'Update', detail: 'Team added'});

    that.teamNameSelectItemList.push({value: team.name, label: team.name});
    that.teamsMap[team.name] = team;
    that.addingTeam = false;

    this.calculateTeamCapacities();
  }

  handleRemoveParticipant(participant: Participant) {

    this.removingPlayer = true;
    const that = this;

    const participantDocRef = this.participantsColRef.doc(participant.id);

    this.batchService.delete(participantDocRef);

    const clonedParticipants = _.cloneDeep(that.participants);
    const indexParticipants = _.findIndex(that.participants, ['id', participant.id]);
    clonedParticipants.splice(indexParticipants, 1);
    that.participants = clonedParticipants;

    if (that.participantsMap[participant.name]) {
      const clonedParticipantMap = _.cloneDeep(that.participantsMap);
      delete clonedParticipantMap[participant.name];
      that.participantsMap = clonedParticipantMap;
    }

    that.messageService.add({
      severity: 'success',
      summary: 'Update', detail: 'Player removed. Save to start tournament and publish new list of participants'
    });
    that.removingPlayer = false;

    if (this.tournament.type === 'team') {
      this.calculateTeamCapacities();
    }
  }

  handleRemoveTeam(team: Team) {

    const that = this;

    const teamDocRef = this.teamsColRef.doc(team.id);
    this.batchService.delete(teamDocRef);

    const clonedTeams = _.cloneDeep(that.teams);
    const indexTeam = _.findIndex(clonedTeams, ['id', team.id]);
    clonedTeams.splice(indexTeam, 1);
    this.teams = clonedTeams;

    if (that.teamsMap[team.name]) {
      const clonedTeamsMap = _.cloneDeep(that.teamsMap);
      delete clonedTeamsMap[team.name];
      this.teamsMap = clonedTeamsMap;
    }

    _.forEach(that.teamNameSelectItemList, function (obj, index) {
      if (obj.value === team.name) {
        const clonedSelectList = _.cloneDeep(that.teamNameSelectItemList);
        clonedSelectList.splice(index, 1);
        that.teamNameSelectItemList = clonedSelectList;
      }
    });

    that.messageService.add({
      severity: 'success',
      summary: 'Update', detail: 'Team removed.'
    });

    this.calculateTeamCapacities();
  }

  handleChangeTeamParticipant(participant: Participant) {

    const that = this;

    console.log("change team of participant : " + JSON.stringify(participant));

    const clonedParticipants = _.cloneDeep(that.participants);
    const indexParticipants = _.findIndex(that.participants, ['id', participant.id]);
    clonedParticipants[indexParticipants] = participant;
    that.participants = clonedParticipants;

    if (that.participantsMap[participant.name]) {
      const clonedParticipantMap = _.cloneDeep(that.participantsMap);
      clonedParticipantMap[participant.name] = participant;
      that.participantsMap = clonedParticipantMap;
    }

    if (this.tournament.type === 'team') {
      this.calculateTeamCapacities();
    }

  }

  onEditMatch(event: any) {

    console.log(event.data);

    const matchDocRef = this.matchesColRef.doc(event.data.id);
    const match: ParticipantMatch = getParticipantMatchForJSON(event.data.id, event.data);

    this.batchService.update(matchDocRef, match);

  }

  private calculateTeamCapacities() {
    const that = this;
    const newEmptyMap = {};

    that.fullyLoadedTeams = 0;
    that.teamOverloaded = false;
    that.playerWithoutTeam = false;

    _.forEach(that.participants, function (parti: Participant) {
      if (parti.team !== '') {
        if (newEmptyMap[parti.team]) {
          newEmptyMap[parti.team] =
            _.concat(newEmptyMap[parti.team], parti);

          const teamMembers = newEmptyMap[parti.team];
          if (teamMembers.length === that.tournament.teamSize) {
            console.log('team now is  fully loaded: ' + parti.team);
            that.fullyLoadedTeams = that.fullyLoadedTeams + 1;
          }
          if (teamMembers.length > that.tournament.teamSize) {
            console.log('found teamOverloaded: ' + parti.team);
            that.teamOverloaded = true;
          }
        } else {
          newEmptyMap[parti.team] = [parti];
        }
      } else {
        that.playerWithoutTeam = true;
      }

    });
    that.teamsMemberMap = newEmptyMap;
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

    if (this.tournament.type === 'team') {
      this.subscribeOnRoundTeamMatches(this.shownRound);
    } else {
      this.subscribeOnParticipantsMatches(this.shownRound);
    }
  }

  showNextRound() {

    this.shownRound = this.shownRound + 1;

    if (this.tournament.type === 'team') {
      this.subscribeOnRoundTeamMatches(this.shownRound);
    } else {
      this.subscribeOnParticipantsMatches(this.shownRound);
    }
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
        this.tournament, this.teamsMemberMap, this.teams, this.participants, 1, this.locationRestriction);
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
        promiseCreate = this.teamMatchService.createNextTeamRound(this.tournament, this.teamsMemberMap,
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
    let promise: Promise<void>;

    if (this.tournament.type === 'team') {
      promise = that.teamMatchService.createNextTeamRound(
        this.tournament, this.teamsMemberMap, this.teams, this.participants, nextRound, this.locationRestriction);
    } else {
      promise = that.participantMatchService.createNextRound(this.tournament, this.participants, nextRound, this.locationRestriction);

    }

    if (promise != null) {
      that.pairRoundDialogVisibility = false;
      if (this.conService.isOnline()) {
        promise.then(function () {

          that.updateTournamentAfterGenNextRound(nextRound);

          that.messageService.add({severity: 'success', summary: 'Create', detail: 'Next round created successfully'});
          that.creatingNextRound = false;

        }).catch(function (error) {
          console.error("Error create round: ", error);
          that.creatingNextRound = false;
        });
      } else {
        promise.then(function () {
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

      // table, team1, team2
      const columns: number[] = [2, 3, 7];

      let headerString = '';
      const headers = this.teamMatchesTable.el.nativeElement.querySelectorAll('.ui-column-title');
      for (const column of columns) {
        headerString += headers[column - 1].innerText + ';';
      }
      const tableRows = this.teamMatchesTable.el.nativeElement.querySelectorAll('TR');
      const rowsString: string[] = [];
      for (let i = 1; i < tableRows.length; i++) {
        let rowString = '';
        const tableRow = tableRows[i].querySelectorAll('.ui-cell-data');


        rowString += tableRow[0].innerText.replace(/[\n\r]+/g, '').replace(/\s{2,}/g, ' ').trim() + ';';
        rowString += tableRow[1].innerText.replace(/[\n\r]+/g, '').replace(/\s{2,}/g, ' ').trim() + ';';
        rowString += tableRow[5].innerText.replace(/[\n\r]+/g, '').replace(/\s{2,}/g, ' ').trim() + ';';

        rowsString.push(rowString);
      }
      let csv = headerString + '\n';
      for (const row of rowsString) {
        csv += row + '\n';
      }
      const blob = new Blob(['\uFEFF', csv], {type: 'text/csv'});
      const link = document.createElement('a');
      link.setAttribute('href', window.URL.createObjectURL(blob));
      link.setAttribute('download', 'Team_Pairings_Round_' + this.shownRound + '.csv');
      document.body.appendChild(link); // Required for FF
      link.click();
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

  randomResultAllGames() {
    const that = this;
    console.log("random results");

    _.forEach(this.teamMatches, function (teamMatch: TeamMatch) {
      _.forEach(teamMatch.participantMatches, function (partiMatch: ParticipantMatch) {

        if (!partiMatch.finished) {
          const random = that.getRandomIntInclusive(0, 1);
          console.log("random result: " + random);

          if (random === 0) {
            that.teamMatchService.playerOneWon(that.tournament, teamMatch, partiMatch, that.participantsMap, that.teamsMap);
          } else {
            that.teamMatchService.playerTwoWon(that.tournament, teamMatch, partiMatch, that.participantsMap, that.teamsMap);
          }
        }
      });
    });
  }

  private getRandomIntInclusive(min: number, max: number) {
    const _min = Math.ceil(min);
    const _max = Math.floor(max);
    return Math.floor(Math.random() * (_max - _min + 1)) + _min;
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

  swapTeamOne(match: TeamMatch, indexOfTeam: number) {

    this.matchToSwap = match;
    this.teamToSwap = match.teamOne;
    this.teamSwapIndex = indexOfTeam;
    this.opponentOfTeamToSwap = match.teamTwo;

    this.teamOneSwapped = true;
  }

  swapTeamTwo(match: TeamMatch, indexOfTeam: number) {
    this.matchToSwap = match;
    this.teamToSwap = match.teamTwo;
    this.teamSwapIndex = indexOfTeam;
    this.opponentOfTeamToSwap = match.teamOne;

    this.teamTwoSwapped = true;
  }

  stopSwapTeam() {
    this.matchToSwap = null;
    this.teamToSwap = null;
    this.teamSwapIndex = null;
    this.opponentOfTeamToSwap = null;

    this.teamOneSwapped = false;
    this.teamTwoSwapped = false;
  }

  getToolTipForSwap(match: TeamMatch, teamToCheck: Team, opponentOfHovered: Team) {

    const state = this.checkSwap(match, teamToCheck, opponentOfHovered);

    if (state === 'impo') {
      return 'Impossible to swap';
    } else if (state === 'not') {
      return 'ATTENTION! ' + this.messageAlreadyPlayed + '. ' +
        'If you know it better you can SWAP anyway';
    } else if (state === 'swap') {
      return 'Click to SWAP';
    }
  }

  checkSwap(match: TeamMatch, teamToCheck: Team, opponentOfHovered: Team): string {

    if (this.teamToSwap) {
      if (teamToCheck.name === this.teamToSwap.name) {
        return 'impo';
      } else if (match.finishedParticipantGames > 0) {
        return 'impo';
      } else if (teamToCheck.name === this.opponentOfTeamToSwap.name) {
        return 'impo';
      } else if (_.includes(opponentOfHovered.opponentTeamNames, this.teamToSwap.name)) {
        this.messageAlreadyPlayed = opponentOfHovered.name + ' already played against ' + this.teamToSwap.name;
        return 'not';
      } else if (_.includes(this.opponentOfTeamToSwap.opponentTeamNames, teamToCheck.name)) {
        this.messageAlreadyPlayed = this.opponentOfTeamToSwap.name + ' already played against ' + teamToCheck.name;
        return 'not';
      } else {
        return 'swap';
      }
    }
  }

  dropTeam(droppedMatch: TeamMatch, droppedTeam: Team,
           opponentOfDropped: Team, witchTeamDropped: string) {

    if (this.teamToSwap) {
      const that = this;
      const state = this.checkSwap(droppedMatch, droppedTeam, opponentOfDropped);

      if (state !== 'impo') {

        console.log("start swaping");

        that.swappingTeam = true;
        const batch = this.afs.firestore.batch();

        this.clearTeamMatch(this.matchToSwap, batch);
        this.clearTeamMatch(droppedMatch, batch);

        // x VS o
        // x VS o
        if (this.teamOneSwapped && witchTeamDropped === 'one') {
          this.matchToSwap.teamOne = droppedTeam;
          droppedMatch.teamOne = this.teamToSwap;

          _.forEach(this.teamsMemberMap[this.matchToSwap.teamOne.name], function (teamParticipant: Participant, index: number) {
            that.matchToSwap.participantMatches[index].participantOne = teamParticipant;
            that.matchToSwap.participantMatches[index].participantTwo = that.teamsMemberMap[that.matchToSwap.teamTwo.name][index];
          });

          _.forEach(this.teamsMemberMap[droppedMatch.teamOne.name], function (teamParticipant: Participant, index: number) {
            droppedMatch.participantMatches[index].participantOne = teamParticipant;
            droppedMatch.participantMatches[index].participantTwo = that.teamsMemberMap[droppedMatch.teamTwo.name][index];
          });

          // o VS x
          // x VS o
        } else if (this.teamTwoSwapped && witchTeamDropped === 'one') {
          this.matchToSwap.teamTwo = droppedTeam;
          droppedMatch.teamOne = this.teamToSwap;

          _.forEach(this.teamsMemberMap[this.matchToSwap.teamOne.name], function (teamParticipant: Participant, index: number) {
            that.matchToSwap.participantMatches[index].participantOne = teamParticipant;
            that.matchToSwap.participantMatches[index].participantTwo = that.teamsMemberMap[that.matchToSwap.teamTwo.name][index];
          });

          _.forEach(this.teamsMemberMap[droppedMatch.teamOne.name], function (teamParticipant: Participant, index: number) {
            droppedMatch.participantMatches[index].participantOne = teamParticipant;
            droppedMatch.participantMatches[index].participantTwo = that.teamsMemberMap[droppedMatch.teamTwo.name][index];
          });
          // x VS o
          // o VS x
        } else if (this.teamOneSwapped && witchTeamDropped === 'two') {
          this.matchToSwap.teamOne = droppedTeam;
          droppedMatch.teamTwo = this.teamToSwap;

          _.forEach(this.teamsMemberMap[this.matchToSwap.teamOne.name], function (teamParticipant: Participant, index: number) {
            that.matchToSwap.participantMatches[index].participantOne = teamParticipant;
            that.matchToSwap.participantMatches[index].participantTwo = that.teamsMemberMap[that.matchToSwap.teamTwo.name][index];
          });

          _.forEach(this.teamsMemberMap[droppedMatch.teamOne.name], function (teamParticipant: Participant, index: number) {
            droppedMatch.participantMatches[index].participantOne = teamParticipant;
            droppedMatch.participantMatches[index].participantTwo = that.teamsMemberMap[droppedMatch.teamTwo.name][index];
          });
          // o VS x
          // o VS x
        } else if (this.teamTwoSwapped && witchTeamDropped === 'two') {
          this.matchToSwap.teamTwo = droppedTeam;
          droppedMatch.teamTwo = this.teamToSwap;

          _.forEach(this.teamsMemberMap[this.matchToSwap.teamOne.name], function (teamParticipant: Participant, index: number) {
            that.matchToSwap.participantMatches[index].participantOne = teamParticipant;
            that.matchToSwap.participantMatches[index].participantTwo = that.teamsMemberMap[that.matchToSwap.teamTwo.name][index];
          });

          _.forEach(this.teamsMemberMap[droppedMatch.teamOne.name], function (teamParticipant: Participant, index: number) {
            droppedMatch.participantMatches[index].participantOne = teamParticipant;
            droppedMatch.participantMatches[index].participantTwo = that.teamsMemberMap[droppedMatch.teamTwo.name][index];
          });
        }

        const matchOneDocRef = this.afs.firestore.doc('tournaments/' + this.tournament.id + '/teamMatches/' + this.matchToSwap.id);
        batch.update(matchOneDocRef, this.matchToSwap);

        const matchTwoDocRef = this.afs.firestore.doc('tournaments/' + this.tournament.id + '/teamMatches/' + droppedMatch.id);
        batch.update(matchTwoDocRef, droppedMatch);


        this.stopSwapTeam();

        if (this.conService.isOnline()) {
          batch.commit().then(function () {
            that.swappingTeam = false;
            console.log("Swap Team successfully");
            that.messageService.add({severity: 'success', summary: 'Update', detail: 'Swapping successfully'});
          }).catch(function (error) {
            that.swappingTeam = false;
            console.error("Error Swap Team: ", error);
          });
        } else {
          batch.commit().then(function () {
            // offline :/
          }).catch(function () {

          });

          that.swappingTeam = false;
          that.messageService.add({severity: 'success', summary: 'Update', detail: 'Swapping successfully'});
          console.log("Swap Team successfully");
        }
      }
    }
  }

  private clearTeamMatch(teamMatch: TeamMatch, batch: WriteBatch) {

    const that = this;

    // TeamOne
    const teamOneToUpdate: Team = teamMatch.teamOne;
    // TeamTwo
    const teamTwoToUpdate: Team = teamMatch.teamTwo;

    _.forEach(this.gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
      teamMatch[scoreField.fieldPlayerOne] = scoreField.defaultValue;
      teamMatch[scoreField.fieldPlayerTwo] = scoreField.defaultValue;

      if (teamOneToUpdate[scoreField.field]) {
        teamOneToUpdate[scoreField.field][that.shownRound - 1] = scoreField.defaultValue;
      }
      if (teamTwoToUpdate[scoreField.field]) {
        teamTwoToUpdate[scoreField.field][that.shownRound - 1] = scoreField.defaultValue;
      }
    });

    if (teamOneToUpdate.name !== 'bye') {
      const teamOneDocRef = this.afs.firestore
        .doc('tournaments/' + this.tournament.id + '/teams/' + teamOneToUpdate.id);
      batch.update(teamOneDocRef, teamOneToUpdate);
    }

    if (teamTwoToUpdate.name !== 'bye') {
      const teamTwoDocRef = this.afs.firestore
        .doc('tournaments/' + this.tournament.id + '/teams/' + teamTwoToUpdate.id);
      batch.update(teamTwoDocRef, teamTwoToUpdate);
    }

    _.forEach(teamMatch.participantMatches, function (partiMatch: ParticipantMatch) {

      that.clearParticipantMatch(partiMatch, batch);
    });
  }

  private clearParticipantMatch(partiMatch: ParticipantMatch, batch: WriteBatch) {

    const that = this;

    // PlayerOne
    const participantOneToUpdate: Participant = this.participantsMap[partiMatch.participantOne.name];
    // PlayerTwo
    const participantTwoToUpdate: Participant = this.participantsMap[partiMatch.participantTwo.name];

    _.forEach(this.gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
      partiMatch[scoreField.fieldPlayerOne] = scoreField.defaultValue;
      partiMatch[scoreField.fieldPlayerTwo] = scoreField.defaultValue;

      if (participantOneToUpdate) {
        participantOneToUpdate[scoreField.field][that.shownRound - 1] = scoreField.defaultValue;
      }
      if (participantTwoToUpdate) {
        participantTwoToUpdate[scoreField.field][that.shownRound - 1] = scoreField.defaultValue;
      }
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

  }
}
