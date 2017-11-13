
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
export class BatchService {

  private batch: WriteBatch;
  private updateAvailable: boolean;

  private batchEventStream: Subject<BatchServiceState>;

  constructor(private afs: AngularFirestore,
              private conService: ConnectivityService,
              private messageService: MessageService) {

    this.batchEventStream = new Subject<BatchServiceState>();
  }

  getBatchEventAsStream() {
   return this.batchEventStream;
  }


  update(docRef: DocumentReference, updateData: UpdateData) {

    if (!this.batch) {
      this.batch = this.afs.firestore.batch();
    }

    this.updateAvailable = true;
    this.batch.update(docRef, updateData);

    this.batchEventStream.next(BatchServiceState.UPDATE);
  }


  set(docRef: DocumentReference, updateData: UpdateData) {
    if (!this.batch) {
      this.batch = this.afs.firestore.batch();
    }

    this.updateAvailable = true;
    this.batch.set(docRef, updateData);

    this.batchEventStream.next(BatchServiceState.SET);
  }

  delete(docRef: DocumentReference) {
    if (!this.batch) {
      this.batch = this.afs.firestore.batch();
    }

    this.updateAvailable = true;
    this.batch.delete(docRef);

    this.batchEventStream.next(BatchServiceState.DELETE);
  }

  commit() {

    const that = this;

    if (that.updateAvailable) {

      that.updateAvailable = false;
      this.batchEventStream.next(BatchServiceState.COMMIT_STARTED);

      if (this.conService.isOnline()) {
        this.batch.commit().then(function () {
         that.afterCommitBatch();

        }).catch(function (error) {
          console.error("Error update data: ", error);
          this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to save data.'});
        });
      } else {
        this.batch.commit().then(function () {
          // offline :/
        }).catch(function () {
        });
        that.afterCommitBatch();

      }

    }
  }

  private afterCommitBatch() {
    this.messageService.add({severity: 'success', summary: 'Update', detail: 'Update Data'});
    this.batchEventStream.next(BatchServiceState.COMMIT_COMPLETED);
    this.batch = this.afs.firestore.batch();
  }

}
export enum BatchServiceState {
  UPDATE = 'update',
  SET = 'set',
  DELETE = 'delete',
  COMMIT_STARTED = 'commit_started',
  COMMIT_COMPLETED = 'commit_completed'

}
