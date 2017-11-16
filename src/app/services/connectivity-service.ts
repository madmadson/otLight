


import {Injectable} from "@angular/core";
import {Observable} from 'rxjs/Rx';
import {WindowRefService} from "./window-ref-service";
import {Subscription} from "rxjs/Subscription";

@Injectable()
export class ConnectivityService {


  isConnected$: Observable<boolean>;
  isConnected: boolean;
  private conSub: Subscription;

  constructor(winRef: WindowRefService) {

    this.isConnected$ = Observable.merge(
      Observable.of(winRef.nativeWindow.navigator.onLine),
      Observable.fromEvent(window, 'online').map(() => true),
      Observable.fromEvent(window, 'offline').map(() => false));
  }

  subscribe() {
    this.conSub = this.isConnected$.subscribe((connected: boolean) => {
      console.log('connected:' + connected);
      this.isConnected = connected;
    });
  }

  unsubscribe() {
    this.conSub.unsubscribe();
  }

  isOnline(): boolean {
    return this.isConnected;
  }

  getConnectionStream(): Observable<boolean> {
    return this.isConnected$;
  }

}
