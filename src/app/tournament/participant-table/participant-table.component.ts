import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {getParticipantForJSON, Participant} from "../../models/Participant";
import {FieldValues, getColumnsForStandingsExport, getScore} from "../../models/game-systems";
import {DataTable, OverlayPanel, SelectItem} from "primeng/primeng";
import * as firebase from "firebase";
import CollectionReference = firebase.firestore.CollectionReference;
import {AngularFirestore} from 'angularfire2/firestore';
import {BatchService} from "../../services/batch.service";
import * as _ from 'lodash';
import {ParticipantMatch} from "../../models/ParticipantMatch";

@Component({
  selector: 'ot-participant-table',
  templateUrl: './participant-table.component.html',
  styleUrls: ['./participant-table.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParticipantTableComponent implements OnInit, OnChanges {

  @Input() tournament: any;
  @Input() isOrga: boolean;
  @Input() shownRound: number;
  @Input() gameSystemConfig: any;
  @Input() participants: Participant[];
  @Input() participantsMap: {};
  @Input() participantsScoreMap: {};
  @Input() teamNameSelectItemList: SelectItem[];

  @Output() onChangeTeamParticipant = new EventEmitter<Participant>();
  @Output() onRemoveParticipant = new EventEmitter<Participant>();

  @ViewChild('standingsTable') standingsTable: DataTable;
  stackedPlayers: boolean;

  protected participantsColRef: CollectionReference;
  protected participantToChange: Participant;

  scoreToShow: string;

  savedParticipants: Participant[];
  showOnlyPartisWithoutTeam: boolean;

  constructor(protected afs: AngularFirestore,
              protected batchService: BatchService) {
  }

  ngOnInit() {
    this.participantsColRef = this.afs.firestore.collection('tournaments/' + this.tournament.id + '/participants');
  }

  ngOnChanges(changes: SimpleChanges): void {
    for (const propName in changes) {
      if (changes.hasOwnProperty(propName)) {
        const change = changes[propName];
        if (propName === 'participants' && this.savedParticipants) {
          this.savedParticipants = change.currentValue;
        }
      }
    }
  }

  showScore(event, scoreToShow: string, overlayPanel: OverlayPanel) {
    this.scoreToShow = scoreToShow;
    overlayPanel.toggle(event);
  }

  filterOnlyWithoutTeam() {

    if (!this.savedParticipants) {
      this.savedParticipants = _.cloneDeep(this.participants);
    }

    this.showOnlyPartisWithoutTeam = true;
    const filteredPartis = [];

    _.forEach(this.savedParticipants, function (parti: Participant) {
      if (!parti.team || parti.team === '') {

        filteredPartis.push(parti);
      }
    });
    this.participants = _.cloneDeep(filteredPartis);

  }

  showAllParticipants() {
    this.showOnlyPartisWithoutTeam = false;
    this.participants = _.cloneDeep(this.savedParticipants);
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

  changeTeamForParticipant(participant: Participant) {

    console.log("change participant : " + JSON.stringify(participant));

    const participantDocRef = this.participantsColRef.doc(participant.id);
    this.batchService.update(participantDocRef, participant);

    this.showOnlyPartisWithoutTeam = false;

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
        'Round' + (index + 1) + ':' + score + ' VS ' + participant.opponentParticipantsNames[index] + '\n');
    });
    return scoreTooltip;
  }

  getScoreFieldValue(scoreField: FieldValues, participant: Participant) {

    const that = this;
    let scoreFieldSum = 0;
    if (scoreField.field === 'o-sos') {
      _.forEach(participant.opponentParticipantsNames, function (opponentName: string, index) {
        if (opponentName !== 'bye') {
          const opponent: Participant = that.participantsMap[opponentName];

          scoreFieldSum = scoreFieldSum + that.getScoreFieldValue({defaultValue: 0, type: 'number', field: 'sos'}, opponent);

        } else {
          // bye is always 0.333
          scoreFieldSum = scoreFieldSum + (0.3333);
        }
      });
      scoreFieldSum = scoreFieldSum / that.tournament.actualRound;
      scoreFieldSum = Math.round(scoreFieldSum * 100) / 100;
    } else if (scoreField.field === 'sos') {
      if (that.tournament.gameSystem === 'GuildBall') {
        _.forEach(participant.opponentParticipantsNames, function (opponentName: string) {
          if (opponentName !== 'bye') {

            let opponentWinRate = that.participantsScoreMap[opponentName] / that.tournament.actualRound;
            if (opponentWinRate < 0.3333) {
              opponentWinRate = 0.3333;
            }
            scoreFieldSum = scoreFieldSum + opponentWinRate;
          } else {
            // bye is always 0.333
            scoreFieldSum = scoreFieldSum + (0.3333);
          }
        });
        scoreFieldSum = scoreFieldSum / that.tournament.actualRound;
        scoreFieldSum = Math.round(scoreFieldSum * 100) / 100;
      } else {
        _.forEach(participant.opponentParticipantsNames, function (opponentName: string) {
          if (opponentName !== 'bye') {
            scoreFieldSum = scoreFieldSum + that.participantsScoreMap[opponentName];
          }
        });
      }
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
    if (scoreField.field === 'o-sos') {
      _.forEach(participant.opponentParticipantsNames, function (opponentName: string, index) {
        if (opponentName !== 'bye') {
          const opponent: Participant = that.participantsMap[opponentName];

          scoreTooltip = scoreTooltip.concat(
            'Round' + (index + 1) + ':' + opponent.name + '\n');

          const opponentSos = that.getScoreFieldValue({defaultValue: 0, type: 'number', field: 'sos'}, opponent);
          scoreTooltip = scoreTooltip.concat(
            'O-Sos= ' + opponentSos + '\n');
        } else {
          scoreTooltip = scoreTooltip.concat(
            'Round' + (index + 1) + ': 0.33 (BYE)\n');
        }
      });

    } else if (scoreField.field === 'sos') {

      if (that.tournament.gameSystem === 'GuildBall') {
        _.forEach(participant.opponentParticipantsNames, function (opponentName: string, index) {
          if (opponentName !== 'bye') {

            let opponentWinRate = that.participantsScoreMap[opponentName] / that.tournament.actualRound;

            opponentWinRate = Math.round(opponentWinRate * 100) / 100;

            if (opponentWinRate < 0.33) {
              scoreTooltip = scoreTooltip.concat(
                'Round' + (index + 1) + ':' + opponentWinRate + ' -> 0.33 (gbSpecial) (' + opponentName + ')\n');
            } else {
              scoreTooltip = scoreTooltip.concat(
                'Round' + (index + 1) + ':' + opponentWinRate + '(' + opponentName + ')\n');
            }
          } else {
            scoreTooltip = scoreTooltip.concat(
              'Round' + (index + 1) + ': 0.33 (BYE)\n');
          }
        });
      } else {
        _.forEach(participant.opponentParticipantsNames, function (opponentName: string, index) {
          if (opponentName !== 'bye') {
            scoreTooltip = scoreTooltip.concat(
              'Round' + (index + 1) + ':' + that.participantsScoreMap[opponentName] + '(' + opponentName + ')\n');
          } else {
            scoreTooltip = scoreTooltip.concat(
              'Round' + (index + 1) + ': 0 (BYE)\n');
          }
        });
      }
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

    this.showOnlyPartisWithoutTeam = false;
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

  addLinkToParticipant(event, participant: Participant) {
    console.log('addLinkToParticipant: ' + JSON.stringify(participant));

    const linkValue = event.target.value;

    if (linkValue && linkValue !== '') {
      console.log('link: ' + linkValue);

      if (!participant.links) {
        participant.links = [];
      }

      participant.links.push(linkValue);

      const participantDocRef = this.participantsColRef.doc(participant.id);
      this.batchService.set(participantDocRef, participant);

      event.target.value = '';
    }
  }

  removeList(event, participant: Participant, index: number) {

    event.preventDefault();
    event.stopPropagation();

    console.log('removeList: ' + index);

    participant.links.splice(index, 1);
    const participantDocRef = this.participantsColRef.doc(participant.id);
    this.batchService.set(participantDocRef, participant);
  }
}
