///<reference path="../../../node_modules/angularfire2/firestore/firestore.d.ts"/>
import { Injectable } from '@angular/core';
import {AngularFirestore} from "angularfire2/firestore";
import {Tournament} from "../models/Tournament";

import {Participant} from "../models/Participant";
import * as _ from 'lodash';
import {RoundMatch} from "../models/RoundMatch";
import {UUID} from "angular2-uuid";
import {getScoreByGameSystem, orderParticipantsForGameSystem} from "../models/game-systems";


@Injectable()
export class RoundMatchService {


  constructor(protected afs: AngularFirestore) {}

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
            result: '',
            finished: false,
          };
          console.log('foundMatch: ' + JSON.stringify(newMatch));
          newRoundMatches.push(newMatch);

          return true;
        }
      }
    }

    return false;
  }


  deleteRound(tournament: Tournament, roundMatches: RoundMatch[]): Promise<void> {

    const that = this;

    if (roundMatches) {

      const batch = that.afs.firestore.batch();

      _.forEach(roundMatches, function (match: RoundMatch) {
        const docRef = that.afs.firestore.doc('tournaments/' + tournament.id + '/roundMatches/' + match.id);
        batch.delete(docRef);
      });
      return batch.commit();
    }
  }

  playerOneWon(tournament: Tournament, roundMatch: RoundMatch, actualRoundParticipants: Participant[]) {

    console.log(roundMatch.participantOne.name + ' WON');

    const participantToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantOne.id;
    });

    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);
    participantToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[0];

    roundMatch.scoreParticipantOne = scorePerGameSystem[0];
    roundMatch.result = 'p1';
    roundMatch.finished = true;

    this.updateDataForMatch(tournament, participantToUpdate, roundMatch);
  }

  playerTwoWon(tournament: Tournament, roundMatch: RoundMatch, actualRoundParticipants: Participant[]) {

    console.log(roundMatch.participantTwo.name + ' WON');

    const participantToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantTwo.id;
    });

    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);
    participantToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[0];

    roundMatch.scoreParticipantTwo = scorePerGameSystem[0];
    roundMatch.result = 'p2';
    roundMatch.finished = true;

    this.updateDataForMatch(tournament, participantToUpdate, roundMatch);
  }

  playerOneLost(tournament: Tournament, roundMatch: RoundMatch, actualRoundParticipants: Participant[]) {
    console.log(roundMatch.participantOne.name + ' LOOSE');

    const participantToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantOne.id;
    });

    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);
    participantToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[1];

    roundMatch.scoreParticipantOne = scorePerGameSystem[1];
    roundMatch.finished = true;

    this.updateDataForMatch(tournament, participantToUpdate, roundMatch);
  }

  playerTwoLost(tournament: Tournament, roundMatch: RoundMatch, actualRoundParticipants: Participant[]) {
    console.log(roundMatch.participantTwo.name + ' LOOSE');

    const participantToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantTwo.id;
    });

    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);
    participantToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[1];

    roundMatch.scoreParticipantTwo = scorePerGameSystem[1];
    roundMatch.finished = true;

    this.updateDataForMatch(tournament, participantToUpdate, roundMatch);
  }

  playerOneDraw(tournament: Tournament, roundMatch: RoundMatch, actualRoundParticipants: Participant[]) {
    console.log(roundMatch.participantOne.name + ' DRAW');

    const participantToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantOne.id;
    });

    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);
    participantToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[2];

    roundMatch.scoreParticipantOne = scorePerGameSystem[2];
    roundMatch.finished = true;
    roundMatch.result = 'draw';

    this.updateDataForMatch(tournament, participantToUpdate, roundMatch);
  }

  playerTwoDraw(tournament: Tournament, roundMatch: RoundMatch, actualRoundParticipants: Participant[]) {
    console.log(roundMatch.participantTwo.name + ' DRAW');

    const participantToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantTwo.id;
    });

    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);
    participantToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[2];

    roundMatch.scoreParticipantTwo = scorePerGameSystem[2];
    roundMatch.finished = true;
    roundMatch.result = 'draw';

    this.updateDataForMatch(tournament, participantToUpdate, roundMatch);
  }

  private updateDataForMatch(tournament: Tournament, participantToUpdate: Participant, roundMatch: RoundMatch) {

    const participantDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantToUpdate.id);
    participantDocRef.update(participantToUpdate).then(function () {
      console.log('hurray');
    }).catch(function (error) {
      console.error("Error", error);
    });


    const matchDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/roundMatches/' + roundMatch.id);
    matchDocRef.update(roundMatch).then(function () {
      console.log('hurray');
    }).catch(function (error) {
      console.error("Error", error);
    });
  }
}
