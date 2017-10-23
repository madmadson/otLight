///<reference path="../../../node_modules/angularfire2/firestore/firestore.d.ts"/>
import {Injectable} from '@angular/core';
import {AngularFirestore} from "angularfire2/firestore";
import {Tournament} from "../models/Tournament";

import {Participant} from "../models/Participant";
import * as _ from 'lodash';
import {RoundMatch} from "../models/RoundMatch";
import {UUID} from "angular2-uuid";
import {
  FieldValues, getGameSystemConfig, getScoreByGameSystem,
  orderParticipantsForGameSystem
} from "../models/game-systems";
import * as firebase from "firebase/app";
import WriteBatch = firebase.firestore.WriteBatch;


@Injectable()
export class RoundMatchService {


  constructor(protected afs: AngularFirestore) {
  }

  createFirstRound(tournament: Tournament, allParticipant: Participant[]): Promise<void> {

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
      return null;
    }

    _.reverse(newRoundMatches);

    const batch = this.afs.firestore.batch();

    _.forEach(newRoundMatches, function (newMatch: RoundMatch) {

      const uuid = UUID.UUID();
      newMatch.id = uuid;
      const roundsDocRef = that.afs.firestore.doc('tournaments/' + tournament.id + '/roundMatches/' + uuid);
      batch.set(roundsDocRef, newMatch);
    });

    return batch.commit();

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


  deleteRound(tournament: Tournament, roundMatches: RoundMatch[], participants: Participant[]): Promise<void> {

    const that = this;
    const gameConfig = getGameSystemConfig(tournament.gameSystem, tournament.type);

    if (roundMatches) {

      const batch = that.afs.firestore.batch();

      _.forEach(roundMatches, function (match: RoundMatch) {
        const docRef = that.afs.firestore.doc('tournaments/' + tournament.id + '/roundMatches/' + match.id);
        batch.delete(docRef);
      });
      _.forEach(participants, function (participant: Participant) {

        console.log('before participant:' + JSON.stringify(participant));

        _.forEach(gameConfig.standingFields, function (fieldValues: FieldValues) {
          participant[fieldValues.field][tournament.actualRound - 1] = 0;
        });
        participant.roundScores.splice((tournament.actualRound - 1), 1);
        participant.opponentParticipantsNames.splice((tournament.actualRound - 1), 1);

        console.log('after participant:' + JSON.stringify(participant));

        const docRef = that.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participant.id);
        batch.update(docRef, participant);
      });

      return batch.commit();
    }
  }

  playerOneWon(tournament: Tournament, roundMatch: RoundMatch, actualRoundParticipants: Participant[], batch: WriteBatch) {

    const that = this;

    console.log(roundMatch.participantOne.name + ' WON');
    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);

    // PlayerOne
    const participantOneToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantOne.id;
    });
    participantOneToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[0];
    participantOneToUpdate.opponentParticipantsNames[roundMatch.round - 1] = roundMatch.participantTwo.name;

    // SOS specialcase
    if (tournament.gameSystem === 'WmHo') {
      _.forEach(actualRoundParticipants, function (participant: Participant) {

        const index = participantOneToUpdate.opponentParticipantsNames.indexOf(participant.name);

        if (index !== -1) {

          console.log('found opponent! add sos to: ' + participant.name);

          participant.sos[index] = participant.sos[index] + 1;

          const opponentDocRef = that.afs.firestore
            .doc('tournaments/' + tournament.id + '/participants/' + participant.id);
          batch.update(opponentDocRef, participant);
        }
      });
    }
    const participantDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantOneToUpdate.id);
    batch.update(participantDocRef, participantOneToUpdate);

    // PlayerTwo
    const participantTwoToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantTwo.id;
    });
    participantTwoToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[1];
    participantTwoToUpdate.opponentParticipantsNames[roundMatch.round - 1] = roundMatch.participantOne.name;

    const participantTwoDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantTwoToUpdate.id);
    batch.update(participantTwoDocRef, participantTwoToUpdate);

    roundMatch.scoreParticipantOne = scorePerGameSystem[0];
    roundMatch.result = 'p1';
    roundMatch.finished = true;

    const matchDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/roundMatches/' + roundMatch.id);
    batch.update(matchDocRef, roundMatch);
  }

  playerTwoWon(tournament: Tournament, roundMatch: RoundMatch, actualRoundParticipants: Participant[], batch: WriteBatch)  {
    const that = this;

    console.log(roundMatch.participantTwo.name + ' WON');
    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);

    // PlayerTwo
    const participantTwoToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantTwo.id;
    });
    participantTwoToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[0];
    participantTwoToUpdate.opponentParticipantsNames[roundMatch.round - 1] = roundMatch.participantOne.name;

    // SOS specialcase
    if (tournament.gameSystem === 'WmHo') {
      _.forEach(actualRoundParticipants, function (participant: Participant) {

        const index = participantTwoToUpdate.opponentParticipantsNames.indexOf(participant.name);

        if (index !== -1) {

          console.log('found opponent! add sos to: ' + participant.name);

          participant.sos[index] = participant.sos[index] + 1;

          const opponentDocRef = that.afs.firestore
            .doc('tournaments/' + tournament.id + '/participants/' + participant.id);
          batch.update(opponentDocRef, participant);
        }
      });
    }

    const participantTwoDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantTwoToUpdate.id);
    batch.update(participantTwoDocRef, participantTwoToUpdate);

    // PlayerOne
    const participantOneToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantOne.id;
    });
    participantOneToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[1];
    participantOneToUpdate.opponentParticipantsNames[roundMatch.round - 1] = roundMatch.participantTwo.name;

    const participantOneDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantOneToUpdate.id);
    batch.update(participantOneDocRef, participantOneToUpdate);

    roundMatch.scoreParticipantTwo = scorePerGameSystem[0];
    roundMatch.result = 'p2';
    roundMatch.finished = true;

    const matchDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/roundMatches/' + roundMatch.id);
    batch.update(matchDocRef, roundMatch);
  }

  playerOneLost(tournament: Tournament, roundMatch: RoundMatch, actualRoundParticipants: Participant[], batch: WriteBatch ) {
    const that = this;
    console.log(roundMatch.participantOne.name + ' LOOSE');

    const participantToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantOne.id;
    });


    // SOS specialcase
    if (tournament.gameSystem === 'WmHo') {
      _.forEach(actualRoundParticipants, function (participant: Participant) {

        const index = participantToUpdate.opponentParticipantsNames.indexOf(participant.name);

        if (index !== -1) {

          console.log('found opponent! add sos to: ' + participant.name);

          participant.sos[index] = participant.sos[index] - 1;

          const opponentDocRef = that.afs.firestore
            .doc('tournaments/' + tournament.id + '/participants/' + participant.id);
          batch.update(opponentDocRef, participant);
        }
      });
    }

    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);
    participantToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[1];

    const participantDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantToUpdate.id);
    batch.update(participantDocRef, participantToUpdate);

    roundMatch.scoreParticipantOne = scorePerGameSystem[1];
    roundMatch.finished = true;

    const matchDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/roundMatches/' + roundMatch.id);
    batch.update(matchDocRef, roundMatch);
  }

  playerTwoLost(tournament: Tournament, roundMatch: RoundMatch, actualRoundParticipants: Participant[], batch: WriteBatch) {
    const that = this;
    console.log(roundMatch.participantTwo.name + ' LOOSE');

    const participantToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantTwo.id;
    });

    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);
    participantToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[1];

    const participantDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantToUpdate.id);
    batch.update(participantDocRef, participantToUpdate);

    // SOS specialcase
    if (tournament.gameSystem === 'WmHo') {
      _.forEach(actualRoundParticipants, function (participant: Participant) {

        const index = participantToUpdate.opponentParticipantsNames.indexOf(participant.name);

        if (index !== -1) {

          console.log('found opponent! add sos to: ' + participant.name);

          participant.sos[index] = participant.sos[index] - 1;

          const opponentDocRef = that.afs.firestore
            .doc('tournaments/' + tournament.id + '/participants/' + participant.id);
          batch.update(opponentDocRef, participant);
        }
      });
    }

    roundMatch.scoreParticipantTwo = scorePerGameSystem[1];
    roundMatch.finished = true;

    const matchDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/roundMatches/' + roundMatch.id);
    batch.update(matchDocRef, roundMatch);

  }

  resultDraw(tournament: Tournament, roundMatch: RoundMatch, actualRoundParticipants: Participant[], batch: WriteBatch) {
    console.log(roundMatch.participantTwo.name + ' DRAW');
    const that = this;

    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);

    // PlayerOne
    const participantOneToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantOne.id;
    });

    participantOneToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[2];
    participantOneToUpdate.opponentParticipantsNames[roundMatch.round - 1] = roundMatch.participantTwo.name;

    const participantOneDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantOneToUpdate.id);
    batch.update(participantOneDocRef, participantOneToUpdate);

    // SOS specialcase
    if (tournament.gameSystem === 'WmHo' && roundMatch.scoreParticipantOne === scorePerGameSystem[0]) {
      _.forEach(actualRoundParticipants, function (participant: Participant) {

        const index = participantOneToUpdate.opponentParticipantsNames.indexOf(participant.name);

        if (index !== -1) {

          console.log('found opponent! add sos to: ' + participant.name);

          participant.sos[index] = participant.sos[index] - 1;

          const opponentDocRef = that.afs.firestore
            .doc('tournaments/' + tournament.id + '/participants/' + participant.id);
          batch.update(opponentDocRef, participant);
        }
      });
    }

    // PlayerTwo
    const participantTwoToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantTwo.id;
    });

    participantTwoToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[2];
    participantTwoToUpdate.opponentParticipantsNames[roundMatch.round - 1] = roundMatch.participantOne.name;

    const participantTwoDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantTwoToUpdate.id);
    batch.update(participantTwoDocRef, participantTwoToUpdate);

    // SOS specialcase
    if (tournament.gameSystem === 'WmHo'  && roundMatch.scoreParticipantTwo === scorePerGameSystem[0]) {
      _.forEach(actualRoundParticipants, function (participant: Participant) {

        const index = participantTwoToUpdate.opponentParticipantsNames.indexOf(participant.name);

        if (index !== -1) {

          console.log('found opponent! add sos to: ' + participant.name);

          participant.sos[index] = participant.sos[index] - 1;

          const opponentDocRef = that.afs.firestore
            .doc('tournaments/' + tournament.id + '/participants/' + participant.id);
          batch.update(opponentDocRef, participant);
        }
      });
    }

    roundMatch.scoreParticipantOne = scorePerGameSystem[2];
    roundMatch.scoreParticipantTwo = scorePerGameSystem[2];
    roundMatch.finished = true;
    roundMatch.result = 'draw';

    const matchDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/roundMatches/' + roundMatch.id);
    batch.update(matchDocRef, roundMatch);
  }

}
