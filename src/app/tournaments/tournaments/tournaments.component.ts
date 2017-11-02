import {Component, OnDestroy, OnInit} from '@angular/core';

import {AngularFirestore} from "angularfire2/firestore";
import * as _ from 'lodash';

import {getTournamentForJSON, Tournament} from "../../models/Tournament";
import {Participant} from "../../models/Participant";
import * as firebase from "firebase/app";
import CollectionReference = firebase.firestore.CollectionReference;

import 'rxjs/add/observable/from';
import {GameSystemService} from "../../services/game-system.service";
import {Subscription} from "rxjs/Subscription";

import {SelectItem} from "primeng/primeng";
import {ActivatedRoute, ParamMap, Router} from "@angular/router";
import {Observable} from "rxjs/Observable";

@Component({
  selector: 'app-tournaments',
  templateUrl: './tournaments.component.html',
  styleUrls: ['./tournaments.component.scss']
})
export class TournamentsComponent implements OnInit, OnDestroy {

  stacked: boolean;
  tournamentsLoaded: boolean;

  protected selectedGameSystem: string;
  protected tournaments: Tournament[] = [];

  protected tournamentsColRef: CollectionReference;
  protected tournamentsUnsubscribeFunction: () => void;
  protected gameSystemSubscription: Subscription;
  protected gameSystems: SelectItem[];

  addTournamentDialogVisibility: boolean;
  private routerSub: Subscription;

  constructor(protected afs: AngularFirestore,
              protected router: Router,
              private route: ActivatedRoute,
              protected gameSystemService: GameSystemService) {

    this.routerSub  = this.route
      .paramMap
      .map(params => {
        console.log('params: ' + JSON.stringify(params));
        if (params.get('new')) {
          this.addTournamentDialogVisibility = true;
        }
      }).subscribe();

    this.tournamentsColRef = this.afs.firestore.collection('tournaments');

    this.selectedGameSystem = this.gameSystemService.getGameSystem();
  }

  ngOnInit() {

    this.subscribeOnTournaments();

    this.gameSystemSubscription = this.gameSystemService.getGameSystemAsStream().subscribe(gameSystem => {
      console.log("gameSystem updated: " + gameSystem);
      this.selectedGameSystem = gameSystem;
      this.subscribeOnTournaments();
    });
  }

  ngOnDestroy() {
    this.tournamentsUnsubscribeFunction();
    this.gameSystemSubscription.unsubscribe();
    this.routerSub.unsubscribe();
  }

  handleTournamentSaved() {
    this.addTournamentDialogVisibility = false;
  }


  protected subscribeOnTournaments() {

    const that = this;
    that.tournamentsLoaded = false;
    that.tournaments = [];

    if (this.tournamentsUnsubscribeFunction) {
      this.tournamentsUnsubscribeFunction();
    }

    this.tournamentsUnsubscribeFunction = this.tournamentsColRef
      .where('gameSystem', '==', this.selectedGameSystem)
      .onSnapshot(function (snapshot) {

        snapshot.docChanges.forEach(function (change) {
          if (change.type === "added") {

            const newTournaments = _.cloneDeep(that.tournaments);

            const tournament: Tournament = getTournamentForJSON(change.doc.id, change.doc.data());

            newTournaments.push(tournament);
            that.tournaments = newTournaments;
          }
          if (change.type === "modified") {

            const newTournaments = _.cloneDeep(that.tournaments);

            const tournament: Tournament = getTournamentForJSON(change.doc.id, change.doc.data());

            const index = _.findIndex(newTournaments, ['id', change.doc.id]);
            newTournaments[index] = tournament;
            that.tournaments = newTournaments;
          }
          if (change.type === "removed") {

            const newTournaments = _.cloneDeep(that.tournaments);

            const index = _.findIndex(newTournaments, ['id', change.doc.id]);
            newTournaments.splice(index, 1);

            that.tournaments = newTournaments;
          }
        });

        that.tournamentsLoaded = true;
      });
  }

}
