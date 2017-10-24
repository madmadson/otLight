import {Injectable} from '@angular/core';
import {AngularFirestore} from "angularfire2/firestore";
import {Tournament} from "../models/Tournament";

import {Participant} from "../models/Participant";
import * as _ from 'lodash';
import {RoundMatch} from "../models/RoundMatch";
import {UUID} from "angular2-uuid";
import {
  FieldValues, getByeScoring, getGameSystemConfig, getScore, getScoreByGameSystem,
  orderParticipantsForGameSystem
} from "../models/game-systems";
import * as firebase from "firebase/app";
import WriteBatch = firebase.firestore.WriteBatch;


@Injectable()
export class RoundMatchService {


  constructor(protected afs: AngularFirestore) {
  }

  createNextRound(tournament: Tournament, allParticipant: Participant[], round: number, locationRestriction: boolean) {
    const that = this;
    const gameConfig = getGameSystemConfig(tournament.gameSystem, tournament.type);
    const byeScoring = getByeScoring(tournament.gameSystem);
    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);

    const shuffledParticipants = _.shuffle(allParticipant);
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
        type: 'solo',
        opponentParticipantsNames: [],
        roundScores: []
      });
    }
    console.log('orderedParticipants: ' + JSON.stringify(orderedParticipants));

    const newRoundMatches: RoundMatch[] = [];

    const megaSuccess = this.match(orderedParticipants, newRoundMatches, round, locationRestriction, true);

    if (!megaSuccess) {
      console.log('distance check failed. try again without');
      const success = this.match(orderedParticipants, newRoundMatches, round, locationRestriction, false);
      if (!success) {
        return null;
      }
    }

    _.reverse(newRoundMatches);

    const batch = this.afs.firestore.batch();
    const listOfTables = _.range(1, (newRoundMatches.length + 1));
    _.forEach(newRoundMatches, function (newMatch: RoundMatch) {

      const uuid = UUID.UUID();
      newMatch.id = uuid;
      const roundsDocRef = that.afs.firestore.doc('tournaments/' + tournament.id + '/roundMatches/' + uuid);

      if (newMatch.participantTwo.name === 'bye') {
        newMatch.finished = true;
        newMatch.result = 'p1';

        newMatch.scoreParticipantOne = byeScoring.score;

        _.forEach(gameConfig.scoreFields, function (scoreFields: FieldValues) {
          newMatch[scoreFields.fieldPlayerOne] = byeScoring[scoreFields.field];
        });

        const participantOneToUpdate: Participant = _.find(allParticipant, function (par: Participant) {
          return par.id === newMatch.participantOne.id;
        });

        participantOneToUpdate.roundScores[newMatch.round - 1] = scorePerGameSystem[0];
        participantOneToUpdate.opponentParticipantsNames[newMatch.round - 1] = 'bye';

        _.forEach(gameConfig.scoreFields, function (scoreField: FieldValues) {
          participantOneToUpdate[scoreField.field][newMatch.round - 1] = byeScoring[scoreField.field];
        });

        const participantDocRef = that.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantOneToUpdate.id);
        batch.update(participantDocRef, participantOneToUpdate);
      }

      if (newMatch.participantOne.name === 'bye') {
        newMatch.finished = true;
        newMatch.scoreParticipantTwo = byeScoring.score;
        newMatch.result = 'p2';

        _.forEach(gameConfig.scoreFields, function (scoreFields: FieldValues) {
          newMatch[scoreFields.fieldPlayerTwo] = byeScoring[scoreFields.field];
        });

        const participantTwoToUpdate: Participant = _.find(allParticipant, function (par: Participant) {
          return par.id === newMatch.participantTwo.id;
        });

        participantTwoToUpdate.roundScores[newMatch.round - 1] = scorePerGameSystem[0];
        participantTwoToUpdate.opponentParticipantsNames[newMatch.round - 1] = 'bye';

        _.forEach(gameConfig.scoreFields, function (scoreField: FieldValues) {
          participantTwoToUpdate[scoreField.field][newMatch.round - 1] = byeScoring[scoreField.field];
        });

        const participantDocRef = that.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantTwoToUpdate.id);
        batch.update(participantDocRef, participantTwoToUpdate);
      }

      const randomIndex = Math.floor(Math.random() * listOfTables.length);
      const tableNumber: number = listOfTables[randomIndex];
      listOfTables.splice(randomIndex, 1);
      newMatch.table = tableNumber;

      batch.set(roundsDocRef, newMatch);
    });

    return batch.commit();
  }

  private match(shuffledParticipants: Participant[],
                newRoundMatches: RoundMatch[],
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

        console.log('check possible Match: ' + JSON.stringify(participant1) + ' vs' + JSON.stringify(participant2));

        const alreadyPlayingAgainstEachOther = _.includes(participant1.opponentParticipantsNames, participant2.name);

        let fromSameLocation = false;
        if (locationRestriction) {
          if (participant1.location && participant2.location) {
            fromSameLocation = participant1.location.trim().toLowerCase() === participant1.location.trim().toLowerCase();

            if (fromSameLocation) {
              console.log('from same location skipping: ' + JSON.stringify(participant1) + ' vs' + JSON.stringify(participant2));
              continue;
            }
          }
        }

        if (alreadyPlayingAgainstEachOther) {
          console.log('alreadyPlayingAgainstEachOther: ' + JSON.stringify(participant1) + ' vs' + JSON.stringify(participant2));
          continue;
        }

        if (distanceCheck) {
          if (getScore(participant1) - 1 > getScore(participant1)) {
            console.log('score distance to high: ' + JSON.stringify(participant1) + ' vs' + JSON.stringify(participant2));
            continue;
          }
      }

        const copiesOfParticipants: Participant[] = _.cloneDeep(shuffledParticipants);

        _.remove(copiesOfParticipants, function (participant: Participant) {
          return participant.id === participant1.id ||
            participant.id === participant2.id;
        });

        console.log('participants left: ' + JSON.stringify(copiesOfParticipants));

        const success = this.match(copiesOfParticipants, newRoundMatches, round, locationRestriction, distanceCheck);

        if (success) {
          const newMatch: RoundMatch = {
            round: round,
            participantOne: participant1,
            participantTwo: participant2,
            table: 0,
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
          participant[fieldValues.field].splice((tournament.actualRound - 1), 1);
        });
        participant.roundScores.splice((tournament.actualRound - 1), 1);
        participant.opponentParticipantsNames.splice((tournament.actualRound - 1), 1);

        console.log('after participant:' + JSON.stringify(participant));

        const docRef = that.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participant.id);
        batch.update(docRef, participant);
      });

      return batch.commit();
    }
    return null;
  }

  playerOneWon(tournament: Tournament, roundMatch: RoundMatch, actualRoundParticipants: Participant[], batch: WriteBatch) {

    console.log(roundMatch.participantOne.name + ' WON');
    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);
    const gameSystemConfig = getGameSystemConfig(tournament.gameSystem, tournament.type);

    // PlayerOne
    const participantOneToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantOne.id;
    });
    // PlayerTwo
    const participantTwoToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantTwo.id;
    });

    if (participantOneToUpdate) {

      participantOneToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[0];
      participantOneToUpdate.opponentParticipantsNames[roundMatch.round - 1] = roundMatch.participantTwo.name;

      _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
        participantOneToUpdate[scoreField.field][roundMatch.round - 1] = participantOneToUpdate[scoreField.field][roundMatch.round - 1] ?
          participantOneToUpdate[scoreField.field][roundMatch.round - 1] : scoreField.defaultValue;
      });

      const participantDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantOneToUpdate.id);
      batch.update(participantDocRef, participantOneToUpdate);
    }

    if (participantTwoToUpdate) {
      participantTwoToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[1];
      participantTwoToUpdate.opponentParticipantsNames[roundMatch.round - 1] = roundMatch.participantOne.name;

      _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
        participantTwoToUpdate[scoreField.field][roundMatch.round - 1] = participantTwoToUpdate[scoreField.field][roundMatch.round - 1] ?
          participantTwoToUpdate[scoreField.field][roundMatch.round - 1] : scoreField.defaultValue;
      });


      const participantTwoDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantTwoToUpdate.id);
      batch.update(participantTwoDocRef, participantTwoToUpdate);
    }
    roundMatch.scoreParticipantOne = scorePerGameSystem[0];
    roundMatch.result = 'p1';
    roundMatch.finished = true;

    const matchDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/roundMatches/' + roundMatch.id);
    batch.update(matchDocRef, roundMatch);
  }

  playerTwoWon(tournament: Tournament, roundMatch: RoundMatch, actualRoundParticipants: Participant[], batch: WriteBatch) {

    console.log(roundMatch.participantTwo.name + ' WON');
    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);
    const gameSystemConfig = getGameSystemConfig(tournament.gameSystem, tournament.type);

    // PlayerOne
    const participantOneToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantOne.id;
    });
    // PlayerTwo
    const participantTwoToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantTwo.id;
    });

    if (participantTwoToUpdate) {

      participantTwoToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[0];
      participantTwoToUpdate.opponentParticipantsNames[roundMatch.round - 1] = roundMatch.participantOne.name;

      _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
        participantTwoToUpdate[scoreField.field][roundMatch.round - 1] = participantTwoToUpdate[scoreField.field][roundMatch.round - 1] ?
          participantTwoToUpdate[scoreField.field][roundMatch.round - 1] : scoreField.defaultValue;
      });

      const participantTwoDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantTwoToUpdate.id);
      batch.update(participantTwoDocRef, participantTwoToUpdate);
    }

    if (participantOneToUpdate) {

      participantOneToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[1];
      participantOneToUpdate.opponentParticipantsNames[roundMatch.round - 1] = roundMatch.participantTwo.name;

      _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
        participantOneToUpdate[scoreField.field][roundMatch.round - 1] = participantOneToUpdate[scoreField.field][roundMatch.round - 1] ?
          participantOneToUpdate[scoreField.field][roundMatch.round - 1] : scoreField.defaultValue;
      });

      const participantOneDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantOneToUpdate.id);
      batch.update(participantOneDocRef, participantOneToUpdate);
    }
    roundMatch.scoreParticipantTwo = scorePerGameSystem[0];
    roundMatch.result = 'p2';
    roundMatch.finished = true;

    const matchDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/roundMatches/' + roundMatch.id);
    batch.update(matchDocRef, roundMatch);
  }

  playerOneLost(tournament: Tournament,
                roundMatch: RoundMatch,
                actualRoundParticipants: Participant[],
                batch: WriteBatch) {

    console.log(roundMatch.participantOne.name + ' LOOSE');
    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);

    const participantToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantOne.id;
    });
    if (participantToUpdate) {
      participantToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[1];

      const participantDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantToUpdate.id);
      batch.update(participantDocRef, participantToUpdate);
    }
    roundMatch.scoreParticipantOne = scorePerGameSystem[1];
    roundMatch.finished = true;

    const matchDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/roundMatches/' + roundMatch.id);
    batch.update(matchDocRef, roundMatch);
  }

  playerTwoLost(tournament: Tournament,
                roundMatch: RoundMatch,
                actualRoundParticipants: Participant[],
                batch: WriteBatch) {

    console.log(roundMatch.participantTwo.name + ' LOOSE');
    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);

    const participantToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantTwo.id;
    });
    if (participantToUpdate) {
      participantToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[1];

      const participantDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantToUpdate.id);
      batch.update(participantDocRef, participantToUpdate);
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
    const gameSystemConfig = getGameSystemConfig(tournament.gameSystem, tournament.type);

    // PlayerOne
    const participantOneToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantOne.id;
    });
    if (participantOneToUpdate) {
      participantOneToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[2];
      participantOneToUpdate.opponentParticipantsNames[roundMatch.round - 1] = roundMatch.participantTwo.name;

      _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
        participantOneToUpdate[scoreField.field][roundMatch.round - 1] = participantOneToUpdate[scoreField.field][roundMatch.round - 1] ?
          participantOneToUpdate[scoreField.field][roundMatch.round - 1] : scoreField.defaultValue;
      });

      const participantOneDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantOneToUpdate.id);
      batch.update(participantOneDocRef, participantOneToUpdate);
    }
    // PlayerTwo
    const participantTwoToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantTwo.id;
    });
    if (participantTwoToUpdate) {
      participantTwoToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[2];
      participantTwoToUpdate.opponentParticipantsNames[roundMatch.round - 1] = roundMatch.participantOne.name;

      _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
        participantTwoToUpdate[scoreField.field][roundMatch.round - 1] = participantTwoToUpdate[scoreField.field][roundMatch.round - 1] ?
          participantTwoToUpdate[scoreField.field][roundMatch.round - 1] : scoreField.defaultValue;
      });

      const participantTwoDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantTwoToUpdate.id);
      batch.update(participantTwoDocRef, participantTwoToUpdate);
    }

    roundMatch.scoreParticipantOne = scorePerGameSystem[2];
    roundMatch.scoreParticipantTwo = scorePerGameSystem[2];
    roundMatch.finished = true;
    roundMatch.result = 'draw';

    const matchDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/roundMatches/' + roundMatch.id);
    batch.update(matchDocRef, roundMatch);
  }

}
