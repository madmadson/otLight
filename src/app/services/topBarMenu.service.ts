
import { Injectable } from '@angular/core';
import {AngularFirestore} from "angularfire2/firestore";

import WriteBatch = firebase.firestore.WriteBatch;

import * as firebase from "firebase/app";
import DocumentReference = firebase.firestore.DocumentReference;
import UpdateData = firebase.firestore.UpdateData;
import {ConnectivityService} from "./connectivity-service";
import {MessageService} from "primeng/components/common/messageservice";
import {Subject} from "rxjs/Subject";


@Injectable()
export class TopBarMenuService {

  private showTopBar: Subject<boolean>;

  constructor() {

    this.showTopBar = new Subject<boolean>();
  }

  getTopBarMenuVisibilityAsStream() {
   return this.showTopBar;
  }

  setTopBarVisibility(visi: boolean) {

    this.showTopBar.next(visi);
  }
}

