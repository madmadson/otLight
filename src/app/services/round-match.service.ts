import { Injectable } from '@angular/core';
import {AngularFirestore} from "angularfire2/firestore";
import {Tournament} from "../models/Tournament";
import * as firebase from "firebase/app";
import CollectionReference = firebase.firestore.CollectionReference;
import {Participant} from "../models/Participant";
import * as _ from 'lodash';
import {RoundMatch} from "../models/RoundMatch";
import {UUID} from "angular2-uuid";
import {orderParticipantsForGameSystem} from "../models/game-systems";
import {consoleTestResultHandler} from "tslint/lib/test";


@Injectable()
export class RoundMatchService {
  private roundsColRef: CollectionReference;

  constructor(protected afs: AngularFirestore) {


  }

  createFirstRound(tournament: Tournament, allParticipant: Participant[]): boolean {

    const that = this;

    const shuffledParticipants = _.shuffle(allParticipant);
    if (shuffledParticipants.length % 2) {
      shuffledParticipants.push({
        name: 'bye'
      });
    }

    const orderedParticipants: Participant[] = orderParticipantsForGameSystem(tournament.gameSystem, shuffledParticipants);

    console.log('orderedParticipants: ' + JSON.stringify(orderedParticipants));

    const newRoundMatches: RoundMatch[] = [];

    const success = this.match(orderedParticipants, newRoundMatches);

    if (!success) {
      return false;
    }

    _.reverse(newRoundMatches);

    const batch = this.afs.firestore.batch();

    _.forEach(newRoundMatches, function (newMatch: RoundMatch) {

      const uuid = UUID.UUID();
      newMatch.id = uuid;
      const roundsDocRef = that.afs.firestore.doc('tournaments/' + tournament.id + '/roundMatches/' + uuid);
      batch.set(roundsDocRef, newMatch);
    });

    batch.commit().then(function () {
      console.log("Round generated successfully");
    }).catch(function (error) {
      console.error("Failed to generate round: ", error);
    });

    return true;
  }

  // createNextRound(tournament: Tournament, previousRoundMatches: RoundMatch[]) {
  //
  //   this.roundsColRef = this.afs.firestore.collection('tournaments/' + tournament.id + '/rounds');
  //
  //   const newRoundMatches: RoundMatch[] = [];
  //   const newListOfParticipants: Participant[] = [];
  //
  //   _.forEach(previousRoundMatches, function (previousRoundMatch: RoundMatch) {
  //     newListOfParticipants.push(previousRoundMatch.participantOne, previousRoundMatch.participantTwo);
  //   });
  //
  //
  //
  //   this.match(newListOfParticipants, newRoundMatches);
  // }

  private match(shuffledParticipants: Participant[],
                newRoundMatches: RoundMatch[]): boolean {

    const participantsLookingForMatch = shuffledParticipants.length;
    if (participantsLookingForMatch === 0) {
      return true;
    }

    let i: number;
    let j: number;

    for (i = 0; i < (shuffledParticipants.length - 1); i++) {

      const participant1: Participant = shuffledParticipants[i];

      for (j = i + 1; j < (shuffledParticipants.length); j++) {

        const participant2: Participant = shuffledParticipants[j];

        console.log('check possible Match: ' + JSON.stringify(participant1) + ' vs' + JSON.stringify(participant2));

        const alreadyPlayingAgainstEachOther = _.includes(participant1.opponentParticipantsNames, participant2.name);

        if (alreadyPlayingAgainstEachOther) {

          console.log('alreadyPlayingAgainstEachOther: ' + JSON.stringify(participant1) + ' vs' + JSON.stringify(participant2));
          continue;
        }

        const copiesOfParticipants: Participant[] = _.cloneDeep(shuffledParticipants);

        _.remove(copiesOfParticipants, function (participant: Participant) {
           return participant.id === participant1.id ||
                  participant.id === participant2.id;
        });

        console.log('participants left: ' + JSON.stringify(copiesOfParticipants));

        const success = this.match(copiesOfParticipants, newRoundMatches);

        if (success) {
          const newMatch: RoundMatch = {
            round: 1,
            participantOne: participant1,
            participantTwo: participant2,
            scoreParticipantOne: 0,
            scoreParticipantTwo: 0,
          };
          console.log('foundMatch: ' + JSON.stringify(newMatch));
          newRoundMatches.push(newMatch);

          return true;
        }
      }
    }

    return false;
  }


}
