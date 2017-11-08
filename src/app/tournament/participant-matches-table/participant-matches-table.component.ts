import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {DataTable, SelectItem} from "primeng/primeng";
import {getParticipantMatchForJSON, ParticipantMatch} from "../../models/ParticipantMatch";
import * as firebase from "firebase/app";
import CollectionReference = firebase.firestore.CollectionReference;
import {BatchService} from "../../services/batch.service";
import {AngularFirestore} from "angularfire2/firestore";
import {ParticipantMatchService} from "../../services/participant-match.service";
import {Participant} from "../../models/Participant";
import {FieldValues, getScoreByGameSystem} from "../../models/game-systems";
import * as _ from 'lodash';
import {MessageService} from "primeng/components/common/messageservice";
import {ConnectivityService} from "../../services/connectivity-service";
import WriteBatch = firebase.firestore.WriteBatch;

@Component({
  selector: 'ot-participant-matches-table',
  templateUrl: './participant-matches-table.component.html',
  styleUrls: ['./participant-matches-table.component.scss']
})
export class ParticipantMatchesTableComponent implements OnInit {

  @Input() participantMatches: ParticipantMatch[];
  @Input() participants: Participant[];
  @Input() tournament: any;
  @Input() isOrga: boolean;
  @Input() shownRound: number;
  @Input() gameSystemConfig: any;
  @Input() participantsChoosePlayedMap: {};

  swappingPlayer: boolean;

  stackedMatches: boolean;
  participantOneFilter: string;
  participantTwoFilter: string;
  @ViewChild('matchesTable') matchesTable: DataTable;

  protected winningOptions: SelectItem[] = [
    {value: 'p1', label: 'P1 WON'},
    {value: 'p2', label: 'P2 WON'},
    {value: 'draw', label: 'DRAW'},
  ];

  playerToSwap: Participant;
  opponentOfPlayerToSwap: Participant;
  matchToSwap: ParticipantMatch;
  messageAlreadyPlayed: string;
  playerOneSwapped: boolean;
  playerTwoSwapped: boolean;

  protected matchesColRef: CollectionReference;

  constructor(protected afs: AngularFirestore,
              protected batchService: BatchService,
              protected conService: ConnectivityService,
              protected messageService: MessageService,
              protected participantMatchService: ParticipantMatchService) {}

  ngOnInit() {
    this.matchesColRef = this.afs.firestore.collection('tournaments/' + this.tournament.id + '/roundMatches');

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

  onEditMatch(event: any) {

    console.log(event.data);

    const matchDocRef = this.matchesColRef.doc(event.data.id);
    const match: ParticipantMatch = getParticipantMatchForJSON(event.data.id, event.data);

    this.batchService.update(matchDocRef, match);

  }

  getStyleForMatchesRow(rowData: ParticipantMatch) {

    return rowData.finished ? 'row-finished' : '';
  }

  changeWinner(event: any, roundMatch: ParticipantMatch) {

    const cloneMatch: ParticipantMatch = _.cloneDeep(roundMatch);

    console.log('Match winner changed: ' + event.value);

    if (event.value === 'p1') {
      this.participantMatchService.playerOneWon(this.tournament, roundMatch, this.participants);

      if (cloneMatch.finished) {
        this.participantMatchService.playerTwoLost(this.tournament, roundMatch, this.participants);
      }
    }

    if (event.value === 'p2') {
      this.participantMatchService.playerTwoWon(this.tournament, roundMatch, this.participants);

      if (cloneMatch.finished) {
        this.participantMatchService.playerOneLost(this.tournament, roundMatch, this.participants);
      }
    }

    if (event.value === 'draw') {
      this.participantMatchService.resultDraw(this.tournament, roundMatch, this.participants);
    }
  }

  clearMatch(roundMatch: ParticipantMatch) {

    const that = this;
    console.log('clear Match: ' + JSON.stringify(roundMatch));

    if (roundMatch.finished) {

      const scorePerGameSystem = getScoreByGameSystem(this.tournament.gameSystem);

      if (roundMatch.scoreParticipantOne === scorePerGameSystem[0]) {
        this.participantMatchService.playerOneLost(this.tournament, roundMatch, this.participants);
      }
      if (roundMatch.scoreParticipantTwo === scorePerGameSystem[0]) {
        this.participantMatchService.playerTwoLost(this.tournament, roundMatch, this.participants);
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
      this.batchService.update(participantOneDocRef, participantOneToUpdate);
    }

    if (participantTwoToUpdate) {
      participantTwoToUpdate.opponentParticipantsNames.splice(that.shownRound - 1, 1);
      participantTwoToUpdate.roundScores.splice(that.shownRound - 1, 1);
      const participantTwoDocRef = this.afs.firestore
        .doc('tournaments/' + this.tournament.id + '/participants/' + participantTwoToUpdate.id);
      this.batchService.update(participantTwoDocRef, participantTwoToUpdate);
    }

    roundMatch.finished = false;
    roundMatch.result = '';

    const matchDocRef = this.afs.firestore.doc('tournaments/' + this.tournament.id + '/roundMatches/' + roundMatch.id);
    this.batchService.update(matchDocRef, roundMatch);
  }

  getToolTipForSwap(roundMatchToCheck: ParticipantMatch, participantToCheck: Participant, opponentOfHovered: Participant) {

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

  checkSwap(roundMatchToCheck: ParticipantMatch, participantToCheck: Participant, opponentOfHovered: Participant): string {

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

  dropPlayer(droppedMatch: ParticipantMatch, droppedParticipant: Participant, opponentOfDropped: Participant, witchPlayerDropped: string) {

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

  private clearSubScores(roundMatch: ParticipantMatch, batch: WriteBatch) {

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

  getScoreTillRoundForParticipant(participant: Participant) {

    let scoreSum = 0;
    _.forEach(participant.roundScores, function (score: number) {
      scoreSum = scoreSum + score;
    });
    return scoreSum;
  }

  swapPlayerOne(roundMatch: ParticipantMatch) {

    this.matchToSwap = roundMatch;
    this.playerToSwap = roundMatch.participantOne;
    this.opponentOfPlayerToSwap = roundMatch.participantTwo;

    this.playerOneSwapped = true;
  }

  swapPlayerTwo(roundMatch: ParticipantMatch) {
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

  saveChoosePlayed(roundMatch: ParticipantMatch) {

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
      }).catch(function () {});
      console.log("update choosePlayed");
    }
  }

  forceBlurForScore(event: any) {
    if (event.target) {
      event.target.blur();
    }
  }

  changeScoringForPlayerOne(roundMatch: ParticipantMatch, field: string, value: number) {


    const participantToUpdate: Participant = _.find(this.participants, function (par: Participant) {
      return par.id === roundMatch.participantOne.id;
    });

    if (participantToUpdate) {
      participantToUpdate[field][this.shownRound - 1] = value;
      const participantTwoDocRef = this.afs.firestore.doc('tournaments/' + this.tournament.id + '/participants/' + participantToUpdate.id);
      this.batchService.update(participantTwoDocRef, participantToUpdate);
    }
    const matchDocRef = this.afs.firestore.doc('tournaments/' + this.tournament.id + '/roundMatches/' + roundMatch.id);
    this.batchService.update(matchDocRef, roundMatch);

  }

  changeScoringPlayerTwo(roundMatch: ParticipantMatch, field: string, value: number) {


    const participantToUpdate: Participant = _.find(this.participants, function (par: Participant) {
      return par.id === roundMatch.participantTwo.id;
    });

    if (participantToUpdate) {
      participantToUpdate[field][this.shownRound - 1] = value;

      const participantTwoDocRef = this.afs.firestore.doc('tournaments/' + this.tournament.id + '/participants/' + participantToUpdate.id);
      this.batchService.update(participantTwoDocRef, participantToUpdate);

    }
    const matchDocRef = this.afs.firestore.doc('tournaments/' + this.tournament.id + '/roundMatches/' + roundMatch.id);
    this.batchService.update(matchDocRef, roundMatch);

  }
}
