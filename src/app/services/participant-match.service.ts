import {Injectable} from '@angular/core';
import {AngularFirestore} from "angularfire2/firestore";
import {Tournament} from "../models/Tournament";

import {Participant} from "../models/Participant";
import * as _ from 'lodash';
import {createEmptyParticipantMatch, ParticipantMatch} from "../models/ParticipantMatch";
import {UUID} from "angular2-uuid";
import {
  FieldValues, getGameSystemConfig, getScore, getScoreByGameSystem
} from "../models/game-systems";
import {BatchService} from "./batch.service";
import {ByeService} from "./bye.service";


@Injectable()
export class ParticipantMatchService {


  constructor(protected afs: AngularFirestore,
              protected batchService: BatchService,
              protected byeService: ByeService) {
  }

  createNextRound(tournament: Tournament, allParticipant: Participant[], round: number, locationRestriction: boolean) {
    const that = this;

    const filteredParticipants = _.filter(allParticipant, function (part: Participant) {
      return part.droppedInRound === 0;
    });

    const shuffledParticipants = _.shuffle(filteredParticipants);
    const orderedParticipants: Participant[] = shuffledParticipants.sort((part1, part2) => {
      let result = 0;
      if (getScore(part1) < getScore(part2)) {
        result = 1;
      } else if (getScore(part1) > getScore(part2)) {
        result = -1;
      }
      return result;
    });

    if (orderedParticipants.length % 2) {
      orderedParticipants.push({
        name: 'bye',
        opponentParticipantsNames: [],
        roundScores: [],
        droppedInRound: 0
      });
    }
    console.log('orderedParticipants: ' + JSON.stringify(orderedParticipants));

    let newRoundMatches: ParticipantMatch[] = [];

    const megaSuccess = this.match(orderedParticipants, newRoundMatches, round, locationRestriction, true);

    if (!megaSuccess) {
      console.log('distance check failed. try again without');
      newRoundMatches = [];
      const success = this.match(orderedParticipants, newRoundMatches, round, locationRestriction, false);
      if (!success) {
        return null;
      }
    }

    _.reverse(newRoundMatches);

    const batch = this.afs.firestore.batch();
    const listOfTables = _.range(1, (newRoundMatches.length + 1));
    _.forEach(newRoundMatches, function (newMatch: ParticipantMatch) {

      const uuid = UUID.UUID();
      newMatch.id = uuid;
      const matchDocRef = that.afs.firestore.doc('tournaments/' + tournament.id + '/roundMatches/' + uuid);

      if (newMatch.participantOne.name === 'bye') {
        that.byeService.modifyParticipantMatchAgainstPlayerOneBye(tournament, newMatch, allParticipant, batch);
      }
      if (newMatch.participantTwo.name === 'bye') {
        that.byeService.modifyParticipantMatchAgainstPlayerTwoBye(tournament, newMatch, allParticipant, batch);
      }

      const randomIndex = Math.floor(Math.random() * listOfTables.length);
      const tableNumber: number = listOfTables[randomIndex];
      listOfTables.splice(randomIndex, 1);
      newMatch.table = tableNumber;

      console.log('setMatch: ' + JSON.stringify(newMatch));
      batch.set(matchDocRef, newMatch);
    });

    return batch.commit();
  }

  private match(shuffledParticipants: Participant[],
                newRoundMatches: ParticipantMatch[],
                round: number,
                locationRestriction: boolean,
                distanceCheck: boolean): boolean {

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

        // console.log('check possible Match: ' + JSON.stringify(participant1) + ' vs' + JSON.stringify(participant2));

        const alreadyPlayingAgainstEachOther = _.includes(participant1.opponentParticipantsNames, participant2.name);

        let fromSameLocation = false;
        if (locationRestriction) {
          if (participant1.location && participant2.location) {
            fromSameLocation = participant1.location.trim().toLowerCase() === participant2.location.trim().toLowerCase();

            if (fromSameLocation) {
              // console.log('from same location skipping: ' + JSON.stringify(participant1) + ' vs' + JSON.stringify(participant2));
              continue;
            }
          }
        }

        if (alreadyPlayingAgainstEachOther) {
          // console.log('alreadyPlayingAgainstEachOther: ' + JSON.stringify(participant1) + ' vs' + JSON.stringify(participant2));
          continue;
        }

        if (distanceCheck) {
          if (getScore(participant1) - 1 > getScore(participant2)) {
            // console.log('score distance to high: ' + JSON.stringify(participant1) + ' vs' + JSON.stringify(participant2));
            continue;
          }
      }

        const copiesOfParticipants: Participant[] = _.cloneDeep(shuffledParticipants);

        _.remove(copiesOfParticipants, function (participant: Participant) {
          return participant.id === participant1.id ||
            participant.id === participant2.id;
        });

        // console.log('participants left: ' + JSON.stringify(copiesOfParticipants));

        const success = this.match(copiesOfParticipants, newRoundMatches, round, locationRestriction, distanceCheck);

        if (success) {
          const newMatch: ParticipantMatch = createEmptyParticipantMatch(round, participant1, participant2);
          //  console.log('foundMatch: ' + JSON.stringify(newMatch));
          newRoundMatches.push(newMatch);

          return true;
        }
      }
    }

    return false;
  }


  deleteRound(tournament: Tournament, roundMatches: ParticipantMatch[], participants: Participant[]): Promise<void> {

    const that = this;
    const gameConfig = getGameSystemConfig(tournament.gameSystem);

    if (roundMatches) {

      const batch = that.afs.firestore.batch();

      _.forEach(roundMatches, function (match: ParticipantMatch) {
        const docRef = that.afs.firestore.doc('tournaments/' + tournament.id + '/roundMatches/' + match.id);
        batch.delete(docRef);
      });
      _.forEach(participants, function (participant: Participant) {

        // console.log('before participant:' + JSON.stringify(participant));

        _.forEach(gameConfig.standingFields, function (fieldValues: FieldValues) {
          participant[fieldValues.field].splice((tournament.actualRound - 1), 1);
        });
        participant.roundScores.splice((tournament.actualRound - 1), 1);
        participant.opponentParticipantsNames.splice((tournament.actualRound - 1), 1);

        // console.log('after participant:' + JSON.stringify(participant));

        const docRef = that.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participant.id);
        batch.update(docRef, participant);
      });

      return batch.commit();
    }
    return null;
  }

  playerOneWon(tournament: Tournament, partiMatch: ParticipantMatch, participantsMap: any) {

    console.log(partiMatch.participantOne.name + ' WON');
    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);
    const gameSystemConfig = getGameSystemConfig(tournament.gameSystem);

    // PlayerOne
    const participantOneToUpdate: Participant = participantsMap[partiMatch.participantOne.name];
    // PlayerTwo
    const participantTwoToUpdate: Participant = participantsMap[partiMatch.participantTwo.name];

    if (participantOneToUpdate) {

      participantOneToUpdate.roundScores[partiMatch.round - 1] = scorePerGameSystem[0];
      participantOneToUpdate.opponentParticipantsNames[partiMatch.round - 1] = partiMatch.participantTwo.name;

      _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
        participantOneToUpdate[scoreField.field][partiMatch.round - 1] = participantOneToUpdate[scoreField.field][partiMatch.round - 1] ?
          participantOneToUpdate[scoreField.field][partiMatch.round - 1] : scoreField.defaultValue;
      });

      const participantDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantOneToUpdate.id);
      this.batchService.update(participantDocRef, participantOneToUpdate);
    }

    if (participantTwoToUpdate) {
      participantTwoToUpdate.roundScores[partiMatch.round - 1] = scorePerGameSystem[1];
      participantTwoToUpdate.opponentParticipantsNames[partiMatch.round - 1] = partiMatch.participantOne.name;

      _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
        participantTwoToUpdate[scoreField.field][partiMatch.round - 1] = participantTwoToUpdate[scoreField.field][partiMatch.round - 1] ?
          participantTwoToUpdate[scoreField.field][partiMatch.round - 1] : scoreField.defaultValue;
      });


      const participantTwoDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantTwoToUpdate.id);
      this.batchService.update(participantTwoDocRef, participantTwoToUpdate);
    }
    partiMatch.scoreParticipantOne = scorePerGameSystem[0];
    partiMatch.result = 'p1';
    partiMatch.finished = true;

    const matchDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/roundMatches/' + partiMatch.id);
    this.batchService.update(matchDocRef, partiMatch);
  }

  playerTwoWon(tournament: Tournament, partiMatch: ParticipantMatch, participantsMap: any) {

    console.log(partiMatch.participantTwo.name + ' WON');
    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);
    const gameSystemConfig = getGameSystemConfig(tournament.gameSystem);

    // PlayerOne
    const participantOneToUpdate: Participant = participantsMap[partiMatch.participantOne.name];
    // PlayerTwo
    const participantTwoToUpdate: Participant = participantsMap[partiMatch.participantTwo.name];

    if (participantTwoToUpdate) {

      participantTwoToUpdate.roundScores[partiMatch.round - 1] = scorePerGameSystem[0];
      participantTwoToUpdate.opponentParticipantsNames[partiMatch.round - 1] = partiMatch.participantOne.name;

      _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
        participantTwoToUpdate[scoreField.field][partiMatch.round - 1] = participantTwoToUpdate[scoreField.field][partiMatch.round - 1] ?
          participantTwoToUpdate[scoreField.field][partiMatch.round - 1] : scoreField.defaultValue;
      });

      const participantTwoDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantTwoToUpdate.id);
      this.batchService.update(participantTwoDocRef, participantTwoToUpdate);
    }

    if (participantOneToUpdate) {

      participantOneToUpdate.roundScores[partiMatch.round - 1] = scorePerGameSystem[1];
      participantOneToUpdate.opponentParticipantsNames[partiMatch.round - 1] = partiMatch.participantTwo.name;

      _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
        participantOneToUpdate[scoreField.field][partiMatch.round - 1] = participantOneToUpdate[scoreField.field][partiMatch.round - 1] ?
          participantOneToUpdate[scoreField.field][partiMatch.round - 1] : scoreField.defaultValue;
      });

      const participantOneDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantOneToUpdate.id);
      this.batchService.update(participantOneDocRef, participantOneToUpdate);
    }
    partiMatch.scoreParticipantTwo = scorePerGameSystem[0];
    partiMatch.result = 'p2';
    partiMatch.finished = true;

    const matchDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/roundMatches/' + partiMatch.id);
    this.batchService.update(matchDocRef, partiMatch);
  }

  playerOneLost(tournament: Tournament,
                partiMatch: ParticipantMatch,
                participantsMap: any) {

    console.log(partiMatch.participantOne.name + ' LOOSE');
    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);

    // PlayerOne
    const participantToUpdate: Participant = participantsMap[partiMatch.participantOne.name];

    if (participantToUpdate) {
      participantToUpdate.roundScores[partiMatch.round - 1] = scorePerGameSystem[1];

      const participantDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantToUpdate.id);
      this.batchService.update(participantDocRef, participantToUpdate);
    }
    partiMatch.scoreParticipantOne = scorePerGameSystem[1];
    partiMatch.finished = true;

    const matchDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/roundMatches/' + partiMatch.id);
    this.batchService.update(matchDocRef, partiMatch);
  }

  playerTwoLost(tournament: Tournament,
                partiMatch: ParticipantMatch,
                participantsMap: any) {

    console.log(partiMatch.participantTwo.name + ' LOOSE');
    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);

    // PlayerTwo
    const participantToUpdate: Participant = participantsMap[partiMatch.participantTwo.name];

    if (participantToUpdate) {
      participantToUpdate.roundScores[partiMatch.round - 1] = scorePerGameSystem[1];

      const participantDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantToUpdate.id);
      this.batchService.update(participantDocRef, participantToUpdate);
    }
    partiMatch.scoreParticipantTwo = scorePerGameSystem[1];
    partiMatch.finished = true;

    const matchDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/roundMatches/' + partiMatch.id);
    this.batchService.update(matchDocRef, partiMatch);

  }

  resultDraw(tournament: Tournament, partiMatch: ParticipantMatch, participantsMap: any) {
    console.log(partiMatch.participantTwo.name + ' DRAW');

    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);
    const gameSystemConfig = getGameSystemConfig(tournament.gameSystem);

    // PlayerOne
    const participantOneToUpdate: Participant = participantsMap[partiMatch.participantOne.name];

    if (participantOneToUpdate) {
      participantOneToUpdate.roundScores[partiMatch.round - 1] = scorePerGameSystem[2];
      participantOneToUpdate.opponentParticipantsNames[partiMatch.round - 1] = partiMatch.participantTwo.name;

      _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
        participantOneToUpdate[scoreField.field][partiMatch.round - 1] = participantOneToUpdate[scoreField.field][partiMatch.round - 1] ?
          participantOneToUpdate[scoreField.field][partiMatch.round - 1] : scoreField.defaultValue;
      });

      const participantOneDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantOneToUpdate.id);
      this.batchService.update(participantOneDocRef, participantOneToUpdate);
    }
    // PlayerTwo
    const participantTwoToUpdate: Participant = participantsMap[partiMatch.participantTwo.name];
    if (participantTwoToUpdate) {
      participantTwoToUpdate.roundScores[partiMatch.round - 1] = scorePerGameSystem[2];
      participantTwoToUpdate.opponentParticipantsNames[partiMatch.round - 1] = partiMatch.participantOne.name;

      _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
        participantTwoToUpdate[scoreField.field][partiMatch.round - 1] = participantTwoToUpdate[scoreField.field][partiMatch.round - 1] ?
          participantTwoToUpdate[scoreField.field][partiMatch.round - 1] : scoreField.defaultValue;
      });

      const participantTwoDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantTwoToUpdate.id);
      this.batchService.update(participantTwoDocRef, participantTwoToUpdate);
    }

    partiMatch.scoreParticipantOne = scorePerGameSystem[2];
    partiMatch.scoreParticipantTwo = scorePerGameSystem[2];
    partiMatch.finished = true;
    partiMatch.result = 'draw';

    const matchDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/roundMatches/' + partiMatch.id);
    this.batchService.update(matchDocRef, partiMatch);
  }

}
