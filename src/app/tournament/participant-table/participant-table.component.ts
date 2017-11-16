import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {getParticipantForJSON, Participant} from "../../models/Participant";
import {FieldValues, getColumnsForStandingsExport, getScore} from "../../models/game-systems";
import {DataTable} from "primeng/primeng";
import * as firebase from "firebase";
import CollectionReference = firebase.firestore.CollectionReference;
import {AngularFirestore} from 'angularfire2/firestore';
import {BatchService} from "../../services/batch.service";
import * as _ from 'lodash';
import {Player} from "../../models/Player";

@Component({
  selector: 'ot-participant-table',
  templateUrl: './participant-table.component.html',
  styleUrls: ['./participant-table.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParticipantTableComponent implements OnInit {

  @Input() tournament: any;
  @Input() isOrga: boolean;
  @Input() shownRound: number;
  @Input() gameSystemConfig: any;
  @Input() participants: Participant[];
  @Input() participantsScoreMap: {};

  @Output() onChangeTeamParticipant = new EventEmitter<Participant>();
  @Output() onRemoveParticipant = new EventEmitter<Participant>();

  @ViewChild('standingsTable') standingsTable: DataTable;
  stackedPlayers: boolean;

  protected participantsColRef: CollectionReference;
  protected participantToChange: Participant;


  constructor(protected afs: AngularFirestore,
              protected batchService: BatchService) {}

  ngOnInit() {
    this.participantsColRef = this.afs.firestore.collection('tournaments/' + this.tournament.id + '/participants');
  }

  onEditParticipant(event: any) {

    console.log(event.data);

    const participantDocRef = this.participantsColRef.doc(event.data.id);
    const participant: Participant = getParticipantForJSON(event.data.id, event.data, this.gameSystemConfig);

    this.batchService.update(participantDocRef, participant);

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

    this.onChangeTeamParticipant.emit(participant);
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

  removeParticipant(participant: Participant) {
    this.onRemoveParticipant.emit(participant);

  }

  dropParticipant(participant: Participant) {
    const participantDocRef = this.participantsColRef.doc(participant.id);
    participant.droppedInRound = this.tournament.actualRound;
    this.batchService.update(participantDocRef, participant);
  }

  undoDropParticipant(participant: Participant) {
    const participantDocRef = this.participantsColRef.doc(participant.id);
    participant.droppedInRound = 0;
    this.batchService.update(participantDocRef, this.participantToChange);
  }

}
