import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {FieldValues, getColumnsForTeamStandingsExport, getScore} from "../../models/game-systems";
import {DataTable, OverlayPanel} from "primeng/primeng";
import {Participant} from "../../models/Participant";
import {getTeamForJSON, Team} from "../../models/Team";
import {AngularFirestore} from "angularfire2/firestore";
import {BatchService} from "../../services/batch.service";
import * as firebase from "firebase";
import CollectionReference = firebase.firestore.CollectionReference;
import * as _ from 'lodash';
import {FormGroup, FormBuilder, Validators} from "@angular/forms";
import {UUID} from "angular2-uuid";


@Component({
  selector: 'ot-team-table',
  templateUrl: './team-table.component.html',
  styleUrls: ['./team-table.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamTableComponent implements OnInit {

  @Input() tournament: any;
  @Input() isOrga: boolean;
  @Input() shownRound: number;
  @Input() gameSystemConfig: any;
  @Input() teams: Team[];
  @Input() teamsMemberMap: {};
  @Input() teamsScoreMap: {};

  @Output() onRemoveTeam = new EventEmitter<Team>();
  @Output() onAddTeam = new EventEmitter<Team>();


  @ViewChild('teamStandingsTable') teamStandingsTable: DataTable;
  stackedTeams: boolean;

  protected teamsColRef: CollectionReference;

  somethingToShow: string;

  teamCreationDialogVisibility: boolean;
  teamCreationForm: FormGroup;
  teamNameAlreadyTaken: boolean;

  showOnlyUnfilledTeams: boolean;
  savedTeams: Team[];

  constructor(protected afs: AngularFirestore,
              private formBuilder: FormBuilder,
              protected batchService: BatchService) {
    this.teamCreationForm = this.formBuilder.group({
      teamName: ['', Validators.required],
      teamLocation: [''],
    });
  }

  ngOnInit() {
    this.teamsColRef = this.afs.firestore.collection('tournaments/' + this.tournament.id + '/teams');
  }

  filterUnfilledTeams() {

    const that = this;

    if (!this.savedTeams) {
      this.savedTeams = _.cloneDeep(this.teams);
    }

    this.showOnlyUnfilledTeams = true;
    const filteredTeams = [];

    _.forEach(this.savedTeams, function (team: Team) {
      if (!that.teamsMemberMap[team.name] ||
        that.teamsMemberMap[team.name].length < that.tournament.teamSize) {

        filteredTeams.push(team);
      }
    });
    this.teams = _.cloneDeep(filteredTeams);

  }

  showAllTeams() {
    this.showOnlyUnfilledTeams = false;
    this.teams = _.cloneDeep(this.savedTeams);
  }

  showScore(event, scoreToShow: string, overlayPanel: OverlayPanel) {
    this.somethingToShow = scoreToShow;
    overlayPanel.toggle(event);
  }

  showTeam(event, teamMembers: string, overlayPanel: OverlayPanel) {
    this.somethingToShow = teamMembers;
    overlayPanel.toggle(event);
  }

  onEditTeam(event: any) {

    console.log(event.data);

    const teamDocRef = this.teamsColRef.doc(event.data.id);
    const team: Team = getTeamForJSON(event.data.id, event.data);

    this.batchService.update(teamDocRef, team);
  }

  removeTeam(team: Team) {

      this.onRemoveTeam.emit(team);
  }

  getTeamMemberNames(teamName: string): string {
    if (this.teamsMemberMap[teamName]) {
      return this.teamsMemberMap[teamName].map((par: Participant) => par.name).join(', ');
    } else {
      return '-';
    }
  }


  sortTeamsByScore(event: any) {
    const newTeams = _.cloneDeep(this.teams);

    newTeams.sort((part1, part2) => {

      let result = 0;

      if (getScore(part1) < getScore(part2)) {
        result = -1;
      } else if (getScore(part1) > getScore(part2)) {
        result = 1;
      }
      return result * event.order;
    });

    this.teams = newTeams;
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

      this.onAddTeam.emit(team);

      this.teamCreationDialogVisibility = false;
    }
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
        if (j === 1) {
          teamName = tableRow[1].innerText;
        }
        if (j === 3) {
          console.log('Team ' + teamName + ' members: ' + this.teamsMemberMap[teamName].map((par: Participant) => par.name).join(', '));
          rowString += this.teamsMemberMap[teamName] ?
            this.teamsMemberMap[teamName].map((par: Participant) => par.name) + ';' : 'No members yet' + ';';
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
}
