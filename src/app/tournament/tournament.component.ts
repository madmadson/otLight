import { Component, OnInit } from '@angular/core';
import {ActivatedRoute} from "@angular/router";
import {AngularFirestore} from "angularfire2/firestore";
import * as firebase from "firebase/app";
import DocumentReference = firebase.firestore.DocumentReference;
import {Tournament} from "../models/Tournament";

@Component({
  selector: 'app-tournament',
  templateUrl: './tournament.component.html',
  styleUrls: ['./tournament.component.scss']
})
export class TournamentComponent implements OnInit {
  protected tournamentId: string;
  protected tournamentDocRef: DocumentReference;

  protected tournament: Tournament;
  protected tournamentLoaded: boolean;

  public orgaDialogVisibility: boolean;

  protected orgaPassword: string;
  protected isOrga: boolean;
  protected passwordWrong: boolean;

  constructor(protected afs: AngularFirestore,
              private activeRouter: ActivatedRoute) {

    this.tournamentId = this.activeRouter.snapshot.paramMap.get('id');

    this.tournamentDocRef = this.afs.firestore.doc('tournaments/' + this.tournamentId);
  }

  ngOnInit() {

    const that = this;

    this.tournamentDocRef.get().then(function (doc) {

      console.log('load tournament!');
      that.tournament = {
        id: doc.id,
        name: doc.data().name,
        gameSystem: doc.data().gameSystem,
        password: doc.data().password
      };

      that.tournamentLoaded = true;
    });
  }

  checkIfPasswordCorrect() {

    this.passwordWrong = false;

    if (this.orgaPassword === this.tournament.password) {
      this.isOrga = true;
      this.orgaDialogVisibility = false;
    } else {
      this.passwordWrong = true;
    }
  }
}
