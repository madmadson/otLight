import {Component, OnInit, ViewEncapsulation} from '@angular/core';
import {ActivatedRoute} from "@angular/router";
import {AngularFirestore} from "angularfire2/firestore";
import * as firebase from "firebase";
import DocumentReference = firebase.firestore.DocumentReference;
import {getTournamentForJSON, Tournament} from "../../models/Tournament";
import {TopBarMenuService} from "../../services/topBarMenu.service";
import * as _ from 'lodash';

@Component({
  selector: 'ot-tournament-chart',
  templateUrl: './tournament-chart.component.html',
  styleUrls: ['./tournament-chart.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TournamentChartComponent implements OnInit {

  data: any;
  protected tournamentId: string;
  protected tournamentDocRef: DocumentReference;
  protected tournamentUnsubscribeFunction: () => void;
  tournament: Tournament;

  constructor(protected afs: AngularFirestore,
              private activeRouter: ActivatedRoute,
              private topBarMenuService: TopBarMenuService) {

    this.tournamentId = this.activeRouter.snapshot.paramMap.get('id');
    this.tournamentDocRef = this.afs.firestore.doc('tournaments/' + this.tournamentId);
    this.data = {
      labels: ['A', 'B', 'C'],
      datasets: [
        {
          data: [300, 50, 100],
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56"
          ],
          hoverBackgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56"
          ]
        }]
    };

    this.topBarMenuService.setTopBarVisibility(false);
  }

  ngOnInit() {

    const that = this;

    this.tournamentUnsubscribeFunction = this.tournamentDocRef
      .onSnapshot(function (doc) {

        that.tournament = getTournamentForJSON(doc.id, doc.data());
      });

  }
}
