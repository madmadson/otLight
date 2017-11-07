import {Injectable} from '@angular/core';
import {AngularFirestore} from "angularfire2/firestore";
import {Tournament} from "../models/Tournament";

import {Participant} from "../models/Participant";
import * as _ from 'lodash';
import {createEmptyParticipantMatch, ParticipantMatch} from "../models/ParticipantMatch";
import {UUID} from "angular2-uuid";
import {
  FieldValues, getByeScoring, getGameSystemConfig, getScore, getScoreByGameSystem, getScoreForTeam
} from "../models/game-systems";

import {BatchService} from "./batch.service";
import {Team} from "../models/Team";
import {TeamMatch} from "../models/TeamMatch";
import {ByeService} from "./bye.service";


@Injectable()
export class TeamMatchService {


  constructor(protected afs: AngularFirestore,
              protected byeService: ByeService,
              protected batchService: BatchService) {
  }

  createNextTeamRound(tournament: Tournament,
                      teamMemberMap: any,
                      allTeams: Team[],
                      allParticipants: Participant[],
                      round: number,
                      locationRestriction: boolean) {
    const that = this;

    const shuffledTeams = _.shuffle(allTeams);
    const orderedTeams: Team[] = shuffledTeams.sort((team1, team2) => {
      let result = 0;
      if (getScore(team1) < getScore(team2)) {
        result = 1;
      } else if (getScore(team1) > getScore(team2)) {
        result = -1;
      }
      return result;
    });

    if (orderedTeams.length % 2) {
      orderedTeams.push({
        name: 'bye',
        opponentTeamNames: [],
        roundScores: [],
        sgw: []
      });
    }
    // console.log('orderedParticipants: ' + JSON.stringify(orderedParticipants));
    const newRoundTeamMatches: TeamMatch[] = [];

    const megaSuccess = this.matchTeam(orderedTeams, newRoundTeamMatches, round, locationRestriction, true);

    if (!megaSuccess) {
      console.log('distance check failed. try again without');
      const success = this.matchTeam(orderedTeams, newRoundTeamMatches, round, locationRestriction, false);
      if (!success) {
        return null;
      }
    }

    _.reverse(newRoundTeamMatches);

    const batch = this.afs.firestore.batch();
    const listOfSections = _.range(1, (newRoundTeamMatches.length + 1));
    _.forEach(newRoundTeamMatches, function (newTeamMatch: TeamMatch) {

      const uuid = UUID.UUID();
      newTeamMatch.id = uuid;
      const teamMatchDocRef = that.afs.firestore.doc('tournaments/' + tournament.id + '/teamMatches/' + uuid);

      _.forEach(teamMemberMap[newTeamMatch.teamOne.name], function (participantTeamOne: Participant, index: number) {

        console.log(participantTeamOne.name + ' VS ' + teamMemberMap[newTeamMatch.teamTwo.name][index].name);

        const newMatch: ParticipantMatch =
          createEmptyParticipantMatch(round, participantTeamOne, teamMemberMap[newTeamMatch.teamTwo.name][index]);

        const participantMatchUuid = UUID.UUID();
        newMatch.id = participantMatchUuid;
        const participantMatchDocRef =
          that.afs.firestore.doc('tournaments/' + tournament.id + '/participantMatches/' + participantMatchUuid);
        newMatch.table = index + 1;

        if (newTeamMatch.teamOne.name === 'bye') {
          that.byeService.modifyParticipantMatchAgainstPlayerOneBye(tournament, newMatch, allParticipants, batch);
        }
        if (newTeamMatch.teamTwo.name === 'bye') {
          that.byeService.modifyParticipantMatchAgainstPlayerTwoBye(tournament, newMatch, allParticipants, batch);
        }

        batch.set(participantMatchDocRef, newMatch);
      });

      if (newTeamMatch.teamOne.name === 'bye') {
        that.byeService.modifyTeamMatchAgainstTeamOneBye(tournament, newTeamMatch, allTeams, batch);
      }

      if (newTeamMatch.teamTwo.name === 'bye') {
        that.byeService.modifyTeamMatchAgainstTeamTwoBye(tournament, newTeamMatch, allTeams, batch);
      }

      const randomIndex = Math.floor(Math.random() * listOfSections.length);
      const sectionNumber: number = listOfSections[randomIndex];
      listOfSections.splice(randomIndex, 1);
      newTeamMatch.section = sectionNumber;

      batch.set(teamMatchDocRef, newTeamMatch);

    });

    return batch.commit();
  }

  private matchTeam(shuffledTeams: Team[],
                    newRoundTeamMatches: TeamMatch[],
                    round: number,
                    locationRestriction: boolean,
                    distanceCheck: boolean): boolean {

    const teamsLookingForMatch = shuffledTeams.length;
    if (teamsLookingForMatch === 0) {
      return true;
    }

    let i: number;
    let j: number;

    for (i = 0; i < (shuffledTeams.length - 1); i++) {

      const team1: Team = shuffledTeams[i];

      for (j = i + 1; j < (shuffledTeams.length); j++) {

        const team2: Team = shuffledTeams[j];

        // console.log('check possible Match: ' + JSON.stringify(participant1) + ' vs' + JSON.stringify(participant2));

        const alreadyPlayingAgainstEachOther = _.includes(team1.opponentTeamNames, team2.name);

        let fromSameLocation = false;
        if (locationRestriction) {
          if (team1.location && team2.location) {
            fromSameLocation = team1.location.trim().toLowerCase() === team2.location.trim().toLowerCase();

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
          if (getScoreForTeam(team1) - 1 > getScoreForTeam(team2)) {
            // console.log('score distance to high: ' + JSON.stringify(participant1) + ' vs' + JSON.stringify(participant2));
            continue;
          }
        }

        const copiesOfTeams: Team[] = _.cloneDeep(shuffledTeams);

        _.remove(copiesOfTeams, function (team: Team) {
          return team.id === team1.id ||
            team.id === team2.id;
        });

        // console.log('participants left: ' + JSON.stringify(copiesOfParticipants));

        const success = this.matchTeam(copiesOfTeams, newRoundTeamMatches, round, locationRestriction, distanceCheck);

        if (success) {
          const newMatch: TeamMatch = {
            round: round,
            teamOne: team1,
            teamTwo: team2,
            section: 0,
            scoreTeamOne: 0,
            scoreTeamTwo: 0,
            sgwTeamOne: 0,
            sgwTeamTwo: 0,
            result: '',
            finished: false,
            matchDate: new Date(),
          };
          //  console.log('foundMatch: ' + JSON.stringify(newMatch));
          newRoundTeamMatches.push(newMatch);

          return true;
        }
      }
    }

    return false;
  }


  deleteTeamRound(tournament: Tournament,
                  participantsMatches: ParticipantMatch[],
                  participants: Participant[],
                  teamMatches: TeamMatch[],
                  teams: Team[]): Promise<void> {

    const that = this;
    const gameConfig = getGameSystemConfig(tournament.gameSystem, tournament.type);

    if (participantsMatches) {

      const batch = that.afs.firestore.batch();

      _.forEach(participantsMatches, function (match: ParticipantMatch) {
        const docRef = that.afs.firestore.doc('tournaments/' + tournament.id + '/participantMatches/' + match.id);
        batch.delete(docRef);
      });
      _.forEach(teamMatches, function (match: TeamMatch) {
        const docRef = that.afs.firestore.doc('tournaments/' + tournament.id + '/teamMatches/' + match.id);
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

      _.forEach(teams, function (team: Team) {

        // console.log('before participant:' + JSON.stringify(participant));

        _.forEach(gameConfig.standingFields, function (fieldValues: FieldValues) {
          team[fieldValues.field].splice((tournament.actualRound - 1), 1);
        });
        team.roundScores.splice((tournament.actualRound - 1), 1);
        team.opponentTeamNames.splice((tournament.actualRound - 1), 1);

        // console.log('after participant:' + JSON.stringify(participant));

        const docRef = that.afs.firestore.doc('tournaments/' + tournament.id + '/teams/' + team.id);
        batch.update(docRef, team);
      });

      return batch.commit();
    }
    return null;
  }

  playerOneWon(tournament: Tournament, roundMatch: ParticipantMatch, actualRoundParticipants: Participant[]) {

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
      this.batchService.update(participantDocRef, participantOneToUpdate);
    }

    if (participantTwoToUpdate) {
      participantTwoToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[1];
      participantTwoToUpdate.opponentParticipantsNames[roundMatch.round - 1] = roundMatch.participantOne.name;

      _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
        participantTwoToUpdate[scoreField.field][roundMatch.round - 1] = participantTwoToUpdate[scoreField.field][roundMatch.round - 1] ?
          participantTwoToUpdate[scoreField.field][roundMatch.round - 1] : scoreField.defaultValue;
      });


      const participantTwoDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantTwoToUpdate.id);
      this.batchService.update(participantTwoDocRef, participantTwoToUpdate);
    }
    roundMatch.scoreParticipantOne = scorePerGameSystem[0];
    roundMatch.result = 'p1';
    roundMatch.finished = true;

    const matchDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participantMatches/' + roundMatch.id);
    this.batchService.update(matchDocRef, roundMatch);
  }

  playerTwoWon(tournament: Tournament, roundMatch: ParticipantMatch, actualRoundParticipants: Participant[]) {

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
      this.batchService.update(participantTwoDocRef, participantTwoToUpdate);
    }

    if (participantOneToUpdate) {

      participantOneToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[1];
      participantOneToUpdate.opponentParticipantsNames[roundMatch.round - 1] = roundMatch.participantTwo.name;

      _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
        participantOneToUpdate[scoreField.field][roundMatch.round - 1] = participantOneToUpdate[scoreField.field][roundMatch.round - 1] ?
          participantOneToUpdate[scoreField.field][roundMatch.round - 1] : scoreField.defaultValue;
      });

      const participantOneDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantOneToUpdate.id);
      this.batchService.update(participantOneDocRef, participantOneToUpdate);
    }
    roundMatch.scoreParticipantTwo = scorePerGameSystem[0];
    roundMatch.result = 'p2';
    roundMatch.finished = true;

    const matchDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participantMatches/' + roundMatch.id);
    this.batchService.update(matchDocRef, roundMatch);
  }

  playerOneLost(tournament: Tournament,
                roundMatch: ParticipantMatch,
                actualRoundParticipants: Participant[]) {

    console.log(roundMatch.participantOne.name + ' LOOSE');
    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);

    const participantToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantOne.id;
    });
    if (participantToUpdate) {
      participantToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[1];

      const participantDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantToUpdate.id);
      this.batchService.update(participantDocRef, participantToUpdate);
    }
    roundMatch.scoreParticipantOne = scorePerGameSystem[1];
    roundMatch.finished = true;

    const matchDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participantMatches/' + roundMatch.id);
    this.batchService.update(matchDocRef, roundMatch);
  }

  playerTwoLost(tournament: Tournament,
                roundMatch: ParticipantMatch,
                actualRoundParticipants: Participant[]) {

    console.log(roundMatch.participantTwo.name + ' LOOSE');
    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);

    const participantToUpdate: Participant = _.find(actualRoundParticipants, function (par: Participant) {
      return par.id === roundMatch.participantTwo.id;
    });
    if (participantToUpdate) {
      participantToUpdate.roundScores[roundMatch.round - 1] = scorePerGameSystem[1];

      const participantDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantToUpdate.id);
      this.batchService.update(participantDocRef, participantToUpdate);
    }
    roundMatch.scoreParticipantTwo = scorePerGameSystem[1];
    roundMatch.finished = true;

    const matchDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participantMatches/' + roundMatch.id);
    this.batchService.update(matchDocRef, roundMatch);

  }

  resultDraw(tournament: Tournament, roundMatch: ParticipantMatch, actualRoundParticipants: Participant[]) {
    console.log(roundMatch.participantTwo.name + ' DRAW');

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
      this.batchService.update(participantOneDocRef, participantOneToUpdate);
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
      this.batchService.update(participantTwoDocRef, participantTwoToUpdate);
    }

    roundMatch.scoreParticipantOne = scorePerGameSystem[2];
    roundMatch.scoreParticipantTwo = scorePerGameSystem[2];
    roundMatch.finished = true;
    roundMatch.result = 'draw';

    const matchDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participantMatches/' + roundMatch.id);
    this.batchService.update(matchDocRef, roundMatch);
  }

}
